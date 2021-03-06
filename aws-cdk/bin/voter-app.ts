#!/usr/bin/env node
import s3 = require('@aws-cdk/aws-s3');
import acm = require('@aws-cdk/aws-certificatemanager');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');

class VoterAppStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    const stub = 'voter';
    const domain = 'reedmartz.com'
    const fqdn = `${stub}.${domain}`;

    const static_bucket = new s3.Bucket(this, 'StaticS3Bucket', {
      versioned: true,
      bucketName: fqdn,
      publicReadAccess: true
    });

    const logs_bucket = s3.Bucket.import(this, 'LogS3Bucket', {
      bucketArn: 'arn:aws:s3:::reedmartz-access-logs'
    });

    const static_cert = new acm.Certificate(this, 'Certificate', {
      domainName: fqdn
    });

    const static_cf = new cloudfront.CloudFrontWebDistribution(this, 'StaticCloudFront', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: static_bucket
          },
          behaviors : [
            {
              isDefaultBehavior: true,
              compress: true,
              maxTtlSeconds: 86400,
              minTtlSeconds: 0,
              defaultTtlSeconds: 3600
            }
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html'
        },
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html'
        }
      ],
      loggingConfig: {
        bucket: logs_bucket,
        prefix: `${fqdn}/cloudfront/`
      },
      aliasConfiguration: {
        acmCertRef: static_cert.certificateArn,
        names: [fqdn]
      }
    });

    const zone = new route53.HostedZoneProvider(this, {
      domainName: domain
    }).findAndImport(this, 'PrimaryDomain');

    new route53.AliasRecord(zone, 'StaticDnsEntry', {
        recordName: stub,
        target: static_cf
    });

    const deploy_user = new iam.User(this, 'S3PublishUser', {
      userName: `travis-ci-${stub}`
    });
    static_bucket.grantPut(deploy_user);
  }
}

const app = new cdk.App();

new VoterAppStack(app, 'VoterAppStack');

app.run();
