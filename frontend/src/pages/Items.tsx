import { ItemSearch } from '../components/ItemSearch.tsx'

export function Items() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Item Browser</h1>
      <ItemSearch />
    </div>
  )
}
