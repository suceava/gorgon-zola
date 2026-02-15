import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { queryByPk, putItem, keys } from '../lib/db/table.js'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method

  if (method === 'GET') {
    const itemId = event.queryStringParameters?.itemId
    if (!itemId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'itemId required' }) }
    }

    const prices = await queryByPk(`ITEM#${itemId}`, 'PRICE#')
    return { statusCode: 200, body: JSON.stringify(prices) }
  }

  if (method === 'POST') {
    // Check admin secret
    const authHeader = event.headers?.['x-admin-secret']
    if (!authHeader || authHeader !== ADMIN_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const body = JSON.parse(event.body ?? '{}')
    const { itemId, price, notes } = body

    if (!itemId || price == null) {
      return { statusCode: 400, body: JSON.stringify({ error: 'itemId and price required' }) }
    }

    const timestamp = new Date().toISOString()
    const { pk, sk } = keys.price(itemId, timestamp)

    await putItem({
      pk,
      sk,
      itemId,
      price,
      timestamp,
      notes,
    })

    return { statusCode: 201, body: JSON.stringify({ itemId, price, timestamp }) }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
}
