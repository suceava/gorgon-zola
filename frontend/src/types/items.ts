export interface Item {
  id: string;
  name: string;
  value: number;
  internalName: string;
  description?: string;
  iconId?: number;
  keywords?: string[];
  maxStackSize?: number;
  isCrafted?: boolean;
  craftingTargetLevel?: number;
  craftPoints?: number;
}
