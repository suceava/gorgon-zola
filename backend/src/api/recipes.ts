import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { getItem, queryByPk, queryGSI1, keys } from '../lib/db/table.js'
import { EntityType } from '../lib/db/constants.js'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const recipeId = event.queryStringParameters?.id
  const ingredientItemId = event.queryStringParameters?.ingredientItemId

  // Get single recipe
  if (recipeId) {
    const { pk, sk } = keys.recipe(recipeId)
    const recipe = await getItem(pk, sk)
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Recipe not found' }) }
    }
    return { statusCode: 200, body: JSON.stringify(recipe) }
  }

  // What can I craft with this ingredient?
  if (ingredientItemId) {
    const recipes = await queryByPk(`INGREDIENT#${ingredientItemId}`)
    return { statusCode: 200, body: JSON.stringify(recipes) }
  }

  // Browse all recipes
  const skill = event.queryStringParameters?.skill
  const recipes = await queryGSI1(EntityType.RECIPE, skill ? `SKILL#${skill}` : undefined)

  return {
    statusCode: 200,
    body: JSON.stringify(recipes),
  }
}
