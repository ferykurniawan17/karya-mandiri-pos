'use client'

import { Button } from '@/components/ui/button'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku?: string
  stock: number
  minimalStock: number
  unit: string
  purchasePrice: number
  sellingPrice: number
  photo?: string
  placement?: string
  categoryId: string
  category: Category
  createdAt: Date
  updatedAt: Date
}

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
}

export default function ProductList({ products, onEdit, onDelete }: ProductListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const isLowStock = (product: Product) => {
    return product.stock <= product.minimalStock
  }

  if (products.length === 0) {
    return (
      <div className="bg-white shadow rounded-md px-6 py-8 text-center text-gray-500">
        Belum ada produk
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {products.map((product) => (
          <div
            key={product.id}
            className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${
              isLowStock(product) ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                {product.sku && (
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                )}
                <p className="text-sm text-gray-600">{product.category.name}</p>
              </div>
              {product.photo && (
                <div className="ml-2">
                  <img
                    src={product.photo}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Stok:</span>
                <span className={`font-medium ${isLowStock(product) ? 'text-red-600' : 'text-gray-900'}`}>
                  {product.stock} {product.unit}
                  {isLowStock(product) && ' ⚠️'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Harga Beli:</span>
                <span className="text-gray-900">{formatCurrency(product.purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Harga Jual:</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(product.sellingPrice)}</span>
              </div>
              {product.placement && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lokasi:</span>
                  <span className="text-gray-900">{product.placement}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(product)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => onDelete(product.id)}
              >
                Hapus
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

