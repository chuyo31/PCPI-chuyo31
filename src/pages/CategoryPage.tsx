import { useParams } from 'react-router-dom'
import { CatalogPage } from './CatalogPage'

export function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  return <CatalogPage fixedCategory={id} />
}
