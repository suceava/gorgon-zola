import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import {
  CorsHttpMethod,
  DomainName,
  HttpApi,
} from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";
import * as path from "path";
import { createApiLambdas } from "./helpers";

const SITE_DOMAIN = process.env.SITE_DOMAIN!;
const API_URL = process.env.API_URL!;
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID!;
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "change-me";
const WILDCARD_CERT_ARN = process.env.WILDCARD_CERT_ARN!;

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableArn = cdk.Fn.importValue("GorgonZola-TableArn");

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: HOSTED_ZONE_ID,
        zoneName: SITE_DOMAIN,
      },
    );

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      WILDCARD_CERT_ARN,
    );

    const domainName = new DomainName(this, "ApiDomain", {
      domainName: API_URL,
      certificate,
    });

    const api = new HttpApi(this, "GorgonZolaApi", {
      apiName: "GorgonZola-Api",
      defaultDomainMapping: { domainName },
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowHeaders: ["Content-Type", "X-Admin-Secret"],
      },
    });

    new route53.ARecord(this, "ApiAliasRecord", {
      zone: hostedZone,
      recordName: API_URL,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId,
        ),
      ),
    });

    const base = path.join(__dirname, "..", "..", "backend", "src", "api");

    createApiLambdas(
      this,
      {
        "GET /items": { entry: path.join(base, "get-items.ts") },
        "GET /recipes": { entry: path.join(base, "get-recipes.ts") },
        "GET /prices": { entry: path.join(base, "get-prices.ts") },
        "POST /prices": { entry: path.join(base, "post-price.ts") },
      },
      {
        api,
        environment: {
          DYNAMODB_TABLE_NAME: "GorgonZola",
          ADMIN_SECRET,
        },
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["dynamodb:*"],
            resources: [tableArn, `${tableArn}/index/*`],
          }),
        ],
      },
    );
  }
}
