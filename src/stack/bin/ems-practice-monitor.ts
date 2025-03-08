#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EmsPracticeMonitorStack } from '../lib/ems-practice-monitor-stack';

const app = new cdk.App();
new EmsPracticeMonitorStack(app, 'EmsPracticeMonitorStack', {
  env: { region: 'us-east-2' },
});