import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import type { NativeAttributeValue } from '@aws-sdk/util-dynamodb';

type WriteRequest = NonNullable<BatchWriteCommandInput['RequestItems']>[string][number];

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'GorgonZola';
const ENTITY_INDEX = 'entityIndex';
const BATCH_SIZE = 25;
const MAX_RETRIES = 3;

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

export interface PageResult<T> {
  items: T[];
  lastKey?: Record<string, NativeAttributeValue>;
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

// ---------------------------------------------------------------------------
// Internal primitives
// ---------------------------------------------------------------------------

async function paginate<T>(
  buildCommand: (startKey?: Record<string, NativeAttributeValue>) => QueryCommand | ScanCommand,
): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, NativeAttributeValue> | undefined;
  do {
    const result = await ddb.send(buildCommand(lastKey));
    items.push(...((result.Items ?? []) as T[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function sendPage<T>(
  command: QueryCommand | ScanCommand,
): Promise<PageResult<T>> {
  const result = await ddb.send(command);
  return {
    items: (result.Items ?? []) as T[],
    lastKey: result.LastEvaluatedKey,
  };
}

async function batchWrite(requests: WriteRequest[]): Promise<void> {
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const chunk = requests.slice(i, i + BATCH_SIZE);
    let unprocessed: WriteRequest[] | undefined = chunk;
    for (let attempt = 0; unprocessed?.length && attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
      const result = await ddb.send(
        new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: unprocessed } }),
      );
      unprocessed = result.UnprocessedItems?.[TABLE_NAME] as WriteRequest[] | undefined;
    }
  }
}

// ---------------------------------------------------------------------------
// Single-item operations
// ---------------------------------------------------------------------------

export async function get<T extends DbRecord>(pk: string, sk: string): Promise<T | undefined> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }));
  return result.Item as T | undefined;
}

export async function put(item: DbRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

// ---------------------------------------------------------------------------
// Table queries (primary key)
// ---------------------------------------------------------------------------

function buildQueryCommand(
  pk: string,
  skPrefix?: string,
  startKey?: Record<string, NativeAttributeValue>,
): QueryCommand {
  return new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix ? 'pk = :pk AND begins_with(sk, :skPrefix)' : 'pk = :pk',
    ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':skPrefix': skPrefix } : { ':pk': pk },
    ExclusiveStartKey: startKey,
  });
}

export async function queryAll<T extends DbRecord>(pk: string, skPrefix?: string): Promise<T[]> {
  return paginate<T>((startKey) => buildQueryCommand(pk, skPrefix, startKey));
}

export async function queryPage<T extends DbRecord>(
  pk: string,
  skPrefix?: string,
  startKey?: Record<string, NativeAttributeValue>,
): Promise<PageResult<T>> {
  return sendPage<T>(buildQueryCommand(pk, skPrefix, startKey));
}

// ---------------------------------------------------------------------------
// Entity index queries (GSI)
// ---------------------------------------------------------------------------

function buildEntityIndexCommand(
  entityType: string,
  startKey?: Record<string, NativeAttributeValue>,
): QueryCommand {
  return new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: ENTITY_INDEX,
    KeyConditionExpression: 'entityType = :et',
    ExpressionAttributeValues: { ':et': entityType },
    ExclusiveStartKey: startKey,
  });
}

export async function queryEntityIndexAll<T extends DbRecord>(
  entityType: string,
  query?: string,
): Promise<T[]> {
  const items = await paginate<T>((startKey) => buildEntityIndexCommand(entityType, startKey));
  if (!query) return items;
  const upper = query.toUpperCase();
  return items.filter((item) => ((item.name as string) ?? '').toUpperCase().includes(upper));
}

export async function queryEntityIndexPage<T extends DbRecord>(
  entityType: string,
  startKey?: Record<string, NativeAttributeValue>,
): Promise<PageResult<T>> {
  return sendPage<T>(buildEntityIndexCommand(entityType, startKey));
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function buildScanCommand(startKey?: Record<string, NativeAttributeValue>): ScanCommand {
  return new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: 'pk, sk',
    ExclusiveStartKey: startKey,
  });
}

export async function scanAll(): Promise<{ pk: string; sk: string }[]> {
  return paginate<{ pk: string; sk: string }>((startKey) => buildScanCommand(startKey));
}

export async function scanPage(
  startKey?: Record<string, NativeAttributeValue>,
): Promise<PageResult<{ pk: string; sk: string }>> {
  return sendPage<{ pk: string; sk: string }>(buildScanCommand(startKey));
}

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

export async function batchPut(items: DbRecord[]): Promise<void> {
  await batchWrite(items.map((item) => ({ PutRequest: { Item: item } })));
}

export async function batchDelete(deleteKeys: { pk: string; sk: string }[]): Promise<void> {
  await batchWrite(deleteKeys.map((key) => ({ DeleteRequest: { Key: { pk: key.pk, sk: key.sk } } })));
}
