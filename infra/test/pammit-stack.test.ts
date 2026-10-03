import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PammitStack } from '../lib/pammit-stack';

const template = Template.fromStack(
  new PammitStack(new cdk.App(), 'Test', { env: { account: '111111111111', region: 'ap-northeast-1' } }),
);

test('DB はインターネットから届かない', () => {
  template.hasResourceProperties('AWS::RDS::DBInstance', {
    PubliclyAccessible: false,
    StorageEncrypted: true,
    Engine: 'postgres',
  });
});

test('NAT Gateway を作らない（課金を抑える）', () => {
  template.resourceCountIs('AWS::EC2::NatGateway', 0);
});

test('API サーバーは 80/443 だけを外部に開ける（SSH なし）', () => {
  const sgs = template.findResources('AWS::EC2::SecurityGroup', {
    Properties: { GroupDescription: 'pammit API (HTTP/HTTPS only)' },
  });
  const ingress = Object.values(sgs)[0].Properties.SecurityGroupIngress;
  expect(ingress.map((r: { FromPort: number }) => r.FromPort).sort()).toEqual([443, 80]);
});

test('DB の 5432 番は API サーバーのセキュリティグループからのみ', () => {
  template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
    FromPort: { 'Fn::GetAtt': [Match.stringLikeRegexp('^Db'), 'Endpoint.Port'] },
    SourceSecurityGroupId: { 'Fn::GetAtt': [Match.stringLikeRegexp('^ApiSg'), 'GroupId'] },
  });
});

test('S3 は非公開', () => {
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
    },
  });
});

test('IMDSv2 を強制する', () => {
  template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
    LaunchTemplateData: { MetadataOptions: { HttpTokens: 'required' } },
  });
});

test('セキュリティグループの説明文は ASCII のみ（EC2 の制約）', () => {
  const ascii = /^[a-zA-Z0-9. _\-:/()#,@[\]+=&;{}!$*]*$/;
  const descriptions: string[] = [];
  for (const sg of Object.values(template.findResources('AWS::EC2::SecurityGroup'))) {
    descriptions.push(sg.Properties.GroupDescription);
    for (const rule of sg.Properties.SecurityGroupIngress ?? []) descriptions.push(rule.Description ?? '');
  }
  for (const rule of Object.values(template.findResources('AWS::EC2::SecurityGroupIngress'))) {
    descriptions.push(rule.Properties.Description ?? '');
  }
  for (const d of descriptions) expect(d).toMatch(ascii);
});

test('AMI は固定（deploy のたびに EC2 が作り直されないように）', () => {
  template.hasResourceProperties('AWS::EC2::Instance', { ImageId: 'ami-01cc4a16aec1f3e09' });
});
