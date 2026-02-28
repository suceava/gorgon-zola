import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'GorgonZola';
const ENTITY_INDEX = 'entityIndex';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' }), {
  marshallOptions: { removeUndefinedValues: true },
});

export const EntityType = {
  ITEM: 'ITEM',
  RECIPE: 'RECIPE',
  NPC: 'NPC',
  QUEST: 'QUEST',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export interface DbRecord {
  pk: string;
  sk: string;
  entityType?: string;
  [key: string]: unknown;
}

export const keys = {
  item: (id: string) => ({ pk: `ITEM#${id}`, sk: 'METADATA' }),
  recipe: (id: string) => ({ pk: `RECIPE#${id}`, sk: 'METADATA' }),
  npc: (id: string) => ({ pk: `NPC#${id}`, sk: 'METADATA' }),
  quest: (id: string) => ({ pk: `QUEST#${id}`, sk: 'METADATA' }),
  price: (itemId: string, timestamp: string) => ({
    pk: `ITEM#${itemId}`,
    sk: `PRICE#${timestamp}`,
  }),
} as const;

export async function get<T extends DbRecord>(pk: string, sk: string): Promise<T | undefined> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }));
  return result.Item as T | undefined;
}

export async function put(item: DbRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

export async function query<T extends DbRecord>(pk: string, skPrefix?: string): Promise<T[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: skPrefix ? 'pk = :pk AND begins_with(sk, :skPrefix)' : 'pk = :pk',
      ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':skPrefix': skPrefix } : { ':pk': pk },
    }),
  );
  return (result.Items ?? []) as T[];
}

export async function queryIndex<T extends DbRecord>(entityType: string, query?: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: ENTITY_INDEX,
        KeyConditionExpression: 'entityType = :et',
        ExpressionAttributeValues: { ':et': entityType },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...((result.Items ?? []) as T[]));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  if (!query) return items;
  const upper = query.toUpperCase();
  return items.filter((item) => ((item.name as string) ?? '').toUpperCase().includes(upper));
}

export async function batchPut(items: DbRecord[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const result = await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    );
    const unprocessed = result.UnprocessedItems?.[TABLE_NAME];
    if (unprocessed?.length) {
      await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: unprocessed } }));
    }
  }
}
