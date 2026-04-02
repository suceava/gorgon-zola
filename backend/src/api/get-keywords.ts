import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { KeywordRepository } from '../domain/keyword.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const keysParam = event.queryStringParameters?.keys;
  if (!keysParam) {
    return { statusCode: 400, body: JSON.stringify({ error: 'keys parameter required' }) };
  }

  const keywords = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
  const results = await KeywordRepository.findByKeywords(keywords);
  return { statusCode: 200, body: JSON.stringify(results) };
};
