import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { getItem, queryGSI1, keys } from '../lib/db/table.js'
import { EntityType } from '../lib/db/constants.js'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const itemId = event.queryStringParameters?.id

  if (itemId) {
    const { pk, sk } = keys.item(itemId)
    const item = await getItem(pk, sk)
    if (!item) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) }
    }
    return { statusCode: 200, body: JSON.stringify(item) }
  }

  // Browse all items
  const search = event.queryStringParameters?.search
  const items = await queryGSI1(EntityType.ITEM, search ? search.toUpperCase() : undefined)

  return {
    statusCode: 200,
    body: JSON.stringify(items),
  }
}
