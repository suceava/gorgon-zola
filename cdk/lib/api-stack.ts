import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'
import * as path from 'path'

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const { table } = props

    const commonEnv = {
      DYNAMODB_TABLE_NAME: table.tableName,
      ADMIN_SECRET: process.env.ADMIN_SECRET ?? 'change-me',
    }

    const backendRoot = path.join(__dirname, '..', '..', 'backend')

    // Lambda handlers
    const itemsHandler = new nodejs.NodejsFunction(this, 'ItemsHandler', {
      entry: path.join(backendRoot, 'src', 'api', 'items.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    })

    const recipesHandler = new nodejs.NodejsFunction(this, 'RecipesHandler', {
      entry: path.join(backendRoot, 'src', 'api', 'recipes.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    })

    const pricesHandler = new nodejs.NodejsFunction(this, 'PricesHandler', {
      entry: path.join(backendRoot, 'src', 'api', 'prices.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    })

    // Grant DynamoDB access
    table.grantReadData(itemsHandler)
    table.grantReadData(recipesHandler)
    table.grantReadWriteData(pricesHandler)

    // HTTP API
    const httpApi = new apigateway.HttpApi(this, 'GorgonZolaApi', {
      apiName: 'GorgonZola-Api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.POST],
        allowHeaders: ['Content-Type', 'X-Admin-Secret'],
      },
    })

    httpApi.addRoutes({
      path: '/api/items',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ItemsIntegration', itemsHandler),
    })

    httpApi.addRoutes({
      path: '/api/recipes',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('RecipesIntegration', recipesHandler),
    })

    httpApi.addRoutes({
      path: '/api/prices',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('PricesIntegration', pricesHandler),
    })

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url ?? '',
      exportName: 'GorgonZola-ApiUrl',
    })
  }
}
