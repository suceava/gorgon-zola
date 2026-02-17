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

    const commonProps = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    }

    const getItems = new nodejs.NodejsFunction(this, 'GetItemsHandler', {
      ...commonProps,
      entry: path.join(backendRoot, 'src', 'api', 'get-items.ts'),
    })

    const getRecipes = new nodejs.NodejsFunction(this, 'GetRecipesHandler', {
      ...commonProps,
      entry: path.join(backendRoot, 'src', 'api', 'get-recipes.ts'),
    })

    const getPrices = new nodejs.NodejsFunction(this, 'GetPricesHandler', {
      ...commonProps,
      entry: path.join(backendRoot, 'src', 'api', 'get-prices.ts'),
    })

    const postPrice = new nodejs.NodejsFunction(this, 'PostPriceHandler', {
      ...commonProps,
      entry: path.join(backendRoot, 'src', 'api', 'post-price.ts'),
    })

    table.grantReadData(getItems)
    table.grantReadData(getRecipes)
    table.grantReadData(getPrices)
    table.grantReadWriteData(postPrice)

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
      integration: new integrations.HttpLambdaIntegration('GetItemsIntegration', getItems),
    })

    httpApi.addRoutes({
      path: '/api/recipes',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetRecipesIntegration', getRecipes),
    })

    httpApi.addRoutes({
      path: '/api/prices',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetPricesIntegration', getPrices),
    })

    httpApi.addRoutes({
      path: '/api/prices',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('PostPriceIntegration', postPrice),
    })

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url ?? '',
      exportName: 'GorgonZola-ApiUrl',
    })
  }
}
