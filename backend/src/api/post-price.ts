import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { PriceRepository } from '../domain/price.js'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const authHeader = event.headers?.['x-admin-secret']
  if (!authHeader || authHeader !== ADMIN_SECRET) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const body = JSON.parse(event.body ?? '{}')
  const { itemId, price, notes } = body

  if (!itemId || price == null) {
    return { statusCode: 400, body: JSON.stringify({ error: 'itemId and price required' }) }
  }

  const result = await PriceRepository.submit(itemId, price, notes)
  return { statusCode: 201, body: JSON.stringify(result) }
}
