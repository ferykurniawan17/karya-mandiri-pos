'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Edit, Trash2, Copy } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
  photo?: string
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
  brand?: Brand
  createdAt: Date
  updatedAt: Date
}

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onDuplicate: (product: Product) => void
}

export default function ProductList({ products, onEdit, onDelete, onDuplicate }: ProductListProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
        {products.map((product) => (
          <div
            key={product.id}
            className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
              isLowStock(product) ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            {product.photo && (
              <div className="w-full h-[130px] bg-gray-100 flex items-center justify-center">
                <img
                  src={product.photo}
                  alt={product.name}
                  className="w-full h-full max-h-[130px] object-contain"
                />
              </div>
            )}
            <div className="p-4">
              <div className="mb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 flex-1">{product.name}</h3>
                  {product.brand?.photo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <img
                              src={product.brand.photo}
                              alt={product.brand.name}
                              className="h-6 w-6 object-contain flex-shrink-0"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{product.brand.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {product.sku && (
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                )}
                <p className="text-sm text-gray-600">{product.category.name}</p>
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

            <div className="mt-4 flex justify-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(product)}
                      className="h-9 w-9"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Produk</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDuplicate(product)}
                      className="h-9 w-9"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Duplikat Produk</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(product.id)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hapus Produk</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

