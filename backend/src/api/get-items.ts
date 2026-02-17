import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { ItemRepository } from '../domain/item.js'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.queryStringParameters?.id

  if (id) {
    const item = await ItemRepository.findById(id)
    if (!item) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) }
    }
    return { statusCode: 200, body: JSON.stringify(item) }
  }

  const items = await ItemRepository.search(event.queryStringParameters?.search)
  return { statusCode: 200, body: JSON.stringify(items) }
}
