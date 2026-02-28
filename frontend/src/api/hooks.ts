import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Item } from '../types/items';
import type { PlayerPrice } from '../types/prices';
import type { Recipe } from '../types/recipes';
import { apiGet, apiPost } from './fetch';

export function useItems(search?: string) {
  return useQuery({
    queryKey: ['items', search],
    queryFn: () => apiGet<Item[]>('/items', { search: search! }),
    enabled: !!search,
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => apiGet<Item>('/items', { id }),
    enabled: !!id,
  });
}

export function useRecipes(skill?: string) {
  return useQuery({
    queryKey: ['recipes', { skill }],
    queryFn: () => apiGet<Recipe[]>('/recipes', skill ? { skill } : undefined),
  });
}

export function usePrices(itemId: string) {
  return useQuery({
    queryKey: ['prices', itemId],
    queryFn: () => apiGet<PlayerPrice[]>('/prices', { itemId }),
    enabled: !!itemId,
  });
}

export function useSubmitPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      price,
      notes,
      adminSecret,
    }: {
      itemId: string;
      price: number;
      notes?: string;
      adminSecret: string;
    }) =>
      apiPost<PlayerPrice>(
        '/prices',
        { itemId, price, notes },
        {
          'X-Admin-Secret': adminSecret,
        },
      ),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['prices', itemId] });
    },
  });
}
