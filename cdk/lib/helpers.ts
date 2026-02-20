import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import type { Construct } from 'constructs'
import { execSync } from 'child_process'

/**
 * Resolves a CloudFormation export value at synthesis time via the AWS CLI.
 * Use this instead of Fn.importValue when the value is needed during synthesis
 * (e.g. passing an API URL to a frontend build).
 */
export function resolveExport(exportName: string): string {
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const output = execSync(
    `aws cloudformation list-exports --region ${region} --query "Exports[?Name=='${exportName}'].Value" --output text`,
    { encoding: 'utf-8' },
  ).trim()

  if (!output) {
    throw new Error(`CloudFormation export "${exportName}" not found. Deploy the dependent stack first.`)
  }

  return output
}

export interface RouteConfig {
  entry: string
  description?: string
}

export interface CreateApiLambdasOptions {
  api: HttpApi
  environment: Record<string, string>
  timeout?: cdk.Duration
  memorySize?: number
}

const bundling = {
  externalModules: [] as string[],
  minify: true,
  sourceMap: false,
  format: OutputFormat.ESM,
  banner:
    'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
}

/**
 * Creates Lambda functions wired to HTTP API routes from a config map.
 * Route keys follow the format "METHOD /path" (e.g. "GET /api/items").
 * Returns the created functions for permission granting.
 */
export function createApiLambdas(
  scope: Construct,
  routes: Record<string, RouteConfig>,
  options: CreateApiLambdasOptions,
): NodejsFunction[] {
  const {
    api,
    environment,
    timeout = cdk.Duration.seconds(10),
    memorySize = 512,
  } = options

  const lambdas: NodejsFunction[] = []

  for (const [route, config] of Object.entries(routes)) {
    const [httpMethod, ...pathParts] = route.split(' ')
    const routePath = pathParts.join(' ')

    const id = route
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part.toLowerCase())
      .join('-')

    const fn = new NodejsFunction(scope, id, {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: config.entry,
      description: config.description ?? route,
      timeout,
      memorySize,
      environment,
      bundling,
    })

    const method = HttpMethod[httpMethod.toUpperCase() as keyof typeof HttpMethod]
    if (!method) {
      throw new Error(`Unsupported HTTP method: ${httpMethod}`)
    }

    api.addRoutes({
      path: routePath,
      methods: [method],
      integration: new HttpLambdaIntegration(`${id}-integration`, fn),
    })

    lambdas.push(fn)
  }

  return lambdas
}
