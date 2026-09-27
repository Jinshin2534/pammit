#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { PammitStack } from '../lib/pammit-stack';

const app = new cdk.App();
new PammitStack(app, 'Pammit', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' },
  description: 'pammit: EC2 (FastAPI + Caddy) + RDS PostgreSQL + S3',
});
