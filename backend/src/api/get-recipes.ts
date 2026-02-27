import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { RecipeRepository } from '../domain/recipe.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.queryStringParameters?.id;
  const ingredientItemId = event.queryStringParameters?.ingredientItemId;
  const skill = event.queryStringParameters?.skill;

  if (id) {
    const recipe = await RecipeRepository.findById(id);
    if (!recipe) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Recipe not found' }),
      };
    }
    return { statusCode: 200, body: JSON.stringify(recipe) };
  }

  if (ingredientItemId) {
    const recipes = await RecipeRepository.findByIngredient(ingredientItemId);
    return { statusCode: 200, body: JSON.stringify(recipes) };
  }

  const recipes = skill ? await RecipeRepository.findBySkill(skill) : await RecipeRepository.findAll();
  return { statusCode: 200, body: JSON.stringify(recipes) };
};
