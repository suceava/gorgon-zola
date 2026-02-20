import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import type { Construct } from 'constructs'
import { execSync } from 'child_process'
import * as path from 'path'

const SITE_DOMAIN = process.env.SITE_DOMAIN!
const SITE_URL = process.env.SITE_URL!
const API_URL = process.env.API_URL!
const WILDCARD_CERT_ARN = process.env.WILDCARD_CERT_ARN!

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const frontendDir = path.join(__dirname, '..', '..', 'frontend')

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: SITE_DOMAIN,
    })

    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate',
      WILDCARD_CERT_ARN,
    )

    execSync('npm ci && npm run build', {
      cwd: frontendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_API_URL: `https://${API_URL}`,
      },
    })

    const bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: SITE_URL,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [SITE_URL],
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    })

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: SITE_URL,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution),
      ),
    })

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(frontendDir, 'dist'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    })

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${SITE_URL}`,
    })
  }
}
