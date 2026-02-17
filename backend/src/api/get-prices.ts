import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { PriceRepository } from '../domain/price.js'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const itemId = event.queryStringParameters?.itemId
  if (!itemId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'itemId required' }) }
  }

  const prices = await PriceRepository.getForItem(itemId)
  return { statusCode: 200, body: JSON.stringify(prices) }
}
