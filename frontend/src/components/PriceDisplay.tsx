interface PriceDisplayProps {
  npcValue: number;
  vendorPrice?: number;
}

export function PriceDisplay({ npcValue, vendorPrice }: PriceDisplayProps) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400">
        NPC: <span className="text-gray-200">{npcValue.toLocaleString()}g</span>
      </span>
      {vendorPrice != null && (
        <span className="text-amber-400">
          Player: <span className="text-amber-200">{vendorPrice.toLocaleString()}g</span>
        </span>
      )}
    </div>
  );
}
