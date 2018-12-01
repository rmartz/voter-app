#!/usr/bin/env node
import sns = require('@aws-cdk/aws-sns');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');

class VoterAppStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    const queue = new sqs.Queue(this, 'VoterAppQueue', {
      visibilityTimeoutSec: 300
    });

    const topic = new sns.Topic(this, 'VoterAppTopic');

    topic.subscribeQueue(queue);
  }
}

const app = new cdk.App();

new VoterAppStack(app, 'VoterAppStack');

app.run();
