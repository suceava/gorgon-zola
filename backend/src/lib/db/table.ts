import { GetCommand, PutCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { ddb } from './client.js'
import { TABLE_NAME, GSI1_NAME } from './constants.js'

// PK/SK builders
export const keys = {
  item: (id: string) => ({ pk: `ITEM#${id}`, sk: 'METADATA' }),
  recipe: (id: string) => ({ pk: `RECIPE#${id}`, sk: 'METADATA' }),
  ingredient: (itemId: string, recipeId: string) => ({
    pk: `INGREDIENT#${itemId}`,
    sk: `RECIPE#${recipeId}`,
  }),
  price: (itemId: string, timestamp: string) => ({
    pk: `ITEM#${itemId}`,
    sk: `PRICE#${timestamp}`,
  }),
} as const

export async function getItem(pk: string, sk: string) {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    }),
  )
  return result.Item
}

export async function putItem(item: Record<string, unknown>) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  )
}

export async function queryByPk(pk: string, skPrefix?: string) {
  const params: ConstructorParameters<typeof QueryCommand>[0] = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? 'pk = :pk AND begins_with(sk, :skPrefix)'
      : 'pk = :pk',
    ExpressionAttributeValues: skPrefix
      ? { ':pk': pk, ':skPrefix': skPrefix }
      : { ':pk': pk },
  }
  const result = await ddb.send(new QueryCommand(params))
  return result.Items ?? []
}

export async function queryGSI1(entityType: string, skPrefix?: string) {
  const params: ConstructorParameters<typeof QueryCommand>[0] = {
    TableName: TABLE_NAME,
    IndexName: GSI1_NAME,
    KeyConditionExpression: skPrefix
      ? 'entityType = :et AND begins_with(gsi1sk, :skPrefix)'
      : 'entityType = :et',
    ExpressionAttributeValues: skPrefix
      ? { ':et': entityType, ':skPrefix': skPrefix }
      : { ':et': entityType },
  }
  const result = await ddb.send(new QueryCommand(params))
  return result.Items ?? []
}

export async function batchWrite(items: Record<string, unknown>[]) {
  // DynamoDB batch write limit is 25 items
  const chunks = []
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25))
  }

  for (const chunk of chunks) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    )
  }
}
