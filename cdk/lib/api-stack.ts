import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { CorsHttpMethod, DomainName, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets'
import type { Construct } from 'constructs'
import * as path from 'path'
import { createApiLambdas } from './helpers'

const SITE_DOMAIN = process.env.SITE_DOMAIN!
const API_URL = process.env.API_URL!
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID!
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'change-me'
const WILDCARD_CERT_ARN = process.env.WILDCARD_CERT_ARN!

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const table = dynamodb.Table.fromTableArn(this, 'Table',
      cdk.Fn.importValue('GorgonZola-TableArn'),
    )

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: SITE_DOMAIN,
    })

    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate',
      WILDCARD_CERT_ARN,
    )

    const domainName = new DomainName(this, 'ApiDomain', {
      domainName: API_URL,
      certificate,
    })

    const api = new HttpApi(this, 'GorgonZolaApi', {
      apiName: 'GorgonZola-Api',
      defaultDomainMapping: { domainName },
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowHeaders: ['Content-Type', 'X-Admin-Secret'],
      },
    })

    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: API_URL,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId,
        ),
      ),
    })

    const base = path.join(__dirname, '..', '..', 'backend', 'src', 'api')

    const lambdas = createApiLambdas(this, {
      'GET /api/items':   { entry: path.join(base, 'get-items.ts') },
      'GET /api/recipes': { entry: path.join(base, 'get-recipes.ts') },
      'GET /api/prices':  { entry: path.join(base, 'get-prices.ts') },
      'POST /api/prices': { entry: path.join(base, 'post-price.ts') },
    }, {
      api,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        ADMIN_SECRET,
      },
    })

    lambdas.forEach(fn => table.grantReadWriteData(fn))

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${API_URL}`,
      exportName: 'GorgonZola-ApiUrl',
    })
  }
}
