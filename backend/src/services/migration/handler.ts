import { run } from './migrations/delete-all.js';

export const handler = async () => {
  console.log('Starting migration...');
  const result = await run();
  console.log('Migration complete:', result);
  return { statusCode: 200, body: result };
};
