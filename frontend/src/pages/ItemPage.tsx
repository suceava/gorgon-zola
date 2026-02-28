import { Link, useParams } from 'react-router-dom';
import { useItem } from '../api/hooks';
import { ItemDetail } from '../components/ItemDetail';

export function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading, error } = useItem(id!);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-400">Failed to load item: {(error as Error).message}</p>;
  if (!item) return <p className="text-gray-500">Item not found.</p>;

  return (
    <div className="space-y-4">
      <Link to="/items" className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
        &larr; Back to search
      </Link>
      <h1 className="text-2xl font-bold">{item.name}</h1>
      <ItemDetail item={item} />
    </div>
  );
}
