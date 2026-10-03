import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

/**
 * パミットのクラウド側一式。
 *
 *   インターネット ──443──> EC2（Caddy → FastAPI） ──5432──> RDS PostgreSQL
 *                                   └──> S3（画像。今は空）
 *
 * - DB は閉じたサブネットに置き、EC2 からしか届かない
 * - NAT Gateway は作らない（月数千円かかるため）。EC2 は公開サブネットに置く
 * - HTTPS は Caddy が Let's Encrypt から自動取得する。ドメインは <固定IP>.sslip.io
 * - SSH は開けない。サーバーに入るときは SSM Session Manager を使う
 */
export class PammitStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2, // RDS はサブネットが2つの AZ にまたがっている必要がある
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // --- 秘密情報 ---
    const ttnWebhookSecret = new secretsmanager.Secret(this, 'TtnWebhookSecret', {
      description: 'X-Webhook-Secret for The Things Network webhook',
      generateSecretString: { passwordLength: 40, excludePunctuation: true },
    });

    // アプリが起動時に直接読む秘密情報（サーバーの環境変数には置かない）
    const appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: 'pammit/app',
      description: 'JWT signing key for the pammit API',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'jwt_secret',
        passwordLength: 64,
        excludePunctuation: true,
      },
    });
    // 値は手で入れる（infra/scripts/set-openai-key.sh）。入るまでは仮の値のまま
    const openAiSecret = new secretsmanager.Secret(this, 'OpenAiSecret', {
      secretName: 'pammit/openai',
      description: 'OpenAI API key for the pammit API',
    });

    // --- DB ---
    const db = new rds.DatabaseInstance(this, 'Db', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromGeneratedSecret('pammit'),
      databaseName: 'pammit',
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: false,
      backupRetention: cdk.Duration.days(1),
      deletionProtection: false,
      // cdk destroy しても最後のスナップショットは残す（データを失わないため。削除は手動）
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // --- 画像置き場（F-02 の署名付きURL用。今は使わない） ---
    const bucket = new s3.Bucket(this, 'Uploads', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // --- API のコンテナイメージ（backend/ をビルドして ECR に置く） ---
    const image = new ecrAssets.DockerImageAsset(this, 'ApiImage', {
      directory: path.join(__dirname, '..', '..', 'backend'),
      platform: ecrAssets.Platform.LINUX_ARM64,
    });
    // イメージが変わるたびにインスタンスを作り直さずに済むよう、URI は SSM から読む
    const imageParam = new ssm.StringParameter(this, 'ApiImageUri', {
      parameterName: '/pammit/api-image-uri',
      stringValue: image.imageUri,
    });

    // --- サーバー ---
    // 注意: セキュリティグループの説明文は ASCII のみ（日本語だと作成に失敗する）
    const sg = new ec2.SecurityGroup(this, 'ApiSg', { vpc, description: 'pammit API (HTTP/HTTPS only)' });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP for Lets Encrypt challenge and redirect');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

    const role = new iam.Role(this, 'ApiRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });
    image.repository.grantPull(role);
    db.secret!.grantRead(role);
    ttnWebhookSecret.grantRead(role);
    appSecret.grantRead(role);
    openAiSecret.grantRead(role);
    imageParam.grantRead(role);
    bucket.grantReadWrite(role);

    // 固定IP。インスタンスより先に作り、ドメイン名（sslip.io）に使う
    const eip = new ec2.CfnEIP(this, 'ApiEip', { domain: 'vpc' });
    const domain = cdk.Fn.join('', [cdk.Fn.join('-', cdk.Fn.split('.', eip.attrPublicIp)), '.sslip.io']);

    const deployScript = fs
      .readFileSync(path.join(__dirname, '..', 'scripts', 'server-deploy.sh'), 'utf8');
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'dnf install -y docker jq',
      'systemctl enable --now docker',
      'mkdir -p /opt/pammit',
      `cat > /opt/pammit/config.env <<'PAMMIT_EOF'`,
      `AWS_REGION=${this.region}`,
      `DOMAIN=${domain}`,
      `EXPECTED_IP=${eip.attrPublicIp}`,
      `IMAGE_PARAM=${imageParam.parameterName}`,
      `DB_SECRET_ARN=${db.secret!.secretArn}`,
      `TTN_SECRET_ARN=${ttnWebhookSecret.secretArn}`,
      `UPLOAD_BUCKET=${bucket.bucketName}`,
      'PAMMIT_EOF',
      `cat > /opt/pammit/deploy.sh <<'PAMMIT_EOF'`,
      deployScript,
      'PAMMIT_EOF',
      'chmod +x /opt/pammit/deploy.sh',
      '/opt/pammit/deploy.sh',
    );

    const instance = new ec2.Instance(this, 'Api', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),
      // AMI は固定する。「最新版」にすると、AWS が新しい版を出すたびに deploy でインスタンスが作り直される。
      // OS を上げたいときは、ここを新しい AMI ID に書き換えて作り直す（固定IPと RDS のデータは残る）
      machineImage: ec2.MachineImage.genericLinux({ 'ap-northeast-1': 'ami-01cc4a16aec1f3e09' }), // AL2023 arm64
      securityGroup: sg,
      role,
      userData,
      requireImdsv2: true,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(20, { volumeType: ec2.EbsDeviceVolumeType.GP3, encrypted: true }),
      }],
    });
    new ec2.CfnEIPAssociation(this, 'ApiEipAssoc', {
      allocationId: eip.attrAllocationId,
      instanceId: instance.instanceId,
    });

    db.connections.allowDefaultPortFrom(instance, 'PostgreSQL from API server only');

    new cdk.CfnOutput(this, 'ApiUrl', { value: cdk.Fn.join('', ['https://', domain]) });
    new cdk.CfnOutput(this, 'InstanceId', { value: instance.instanceId });
    new cdk.CfnOutput(this, 'TtnWebhookSecretArn', { value: ttnWebhookSecret.secretArn });
    new cdk.CfnOutput(this, 'UploadBucket', { value: bucket.bucketName });
  }
}
