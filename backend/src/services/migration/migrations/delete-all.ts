import { batchDelete, scan } from '../../../lib/db.js';

export async function run(): Promise<string> {
  const keys = await scan();
  console.log(`Found ${keys.length} records to delete`);

  await batchDelete(keys);
  console.log(`Deleted ${keys.length} records`);

  return `Deleted ${keys.length} records`;
}
