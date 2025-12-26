'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AutocompleteSelect } from '@/components/ui/autocomplete-select'
import ExportButtons from './ExportButtons'
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface StockReportData {
  reportType: string
  data: Array<{
    productId: string
    productName: string
    sku: string | null
    category: string
    brand: string
    stock: number
    minimalStock?: number
    unit: string
    purchasePrice: number
    sellingPrice?: number
    valuation?: number
    quantity?: number
    revenue?: number
  }>
  total: number
}

export default function StockReport() {
  const [reportData, setReportData] = useState<StockReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('low-stock')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [brandId, setBrandId] = useState<string | undefined>()
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchCategories()
    fetchBrands()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [reportType, categoryId, brandId])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      const data = await response.json()
      if (response.ok) {
        setBrands(data.brands)
      }
    } catch (err) {
      console.error('Error fetching brands:', err)
    }
  }

  const fetchReport = async () => {
    try {
      setLoading(true)
      let url = `/api/reports/stock?reportType=${reportType}`
      if (categoryId) url += `&categoryId=${categoryId}`
      if (brandId) url += `&brandId=${brandId}`

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching stock report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getExportColumns = () => {
    switch (reportType) {
      case 'low-stock':
        return [
          { header: 'Produk', dataKey: 'productName' },
          { header: 'SKU', dataKey: 'sku' },
          { header: 'Kategori', dataKey: 'category' },
          { header: 'Brand', dataKey: 'brand' },
          { header: 'Stok', dataKey: 'stock' },
          { header: 'Stok Minimal', dataKey: 'minimalStock' },
          { header: 'Unit', dataKey: 'unit' },
        ]
      case 'fast-moving':
        return [
          { header: 'Produk', dataKey: 'productName' },
          { header: 'SKU', dataKey: 'sku' },
          { header: 'Kategori', dataKey: 'category' },
          { header: 'Brand', dataKey: 'brand' },
          { header: 'Quantity Terjual', dataKey: 'quantity' },
          { header: 'Revenue', dataKey: 'revenue' },
        ]
      case 'slow-moving':
        return [
          { header: 'Produk', dataKey: 'productName' },
          { header: 'SKU', dataKey: 'sku' },
          { header: 'Kategori', dataKey: 'category' },
          { header: 'Brand', dataKey: 'brand' },
          { header: 'Stok', dataKey: 'stock' },
          { header: 'Unit', dataKey: 'unit' },
        ]
      case 'valuation':
        return [
          { header: 'Produk', dataKey: 'productName' },
          { header: 'SKU', dataKey: 'sku' },
          { header: 'Kategori', dataKey: 'category' },
          { header: 'Brand', dataKey: 'brand' },
          { header: 'Stok', dataKey: 'stock' },
          { header: 'Harga Beli', dataKey: 'purchasePrice' },
          { header: 'Valuasi', dataKey: 'valuation' },
        ]
      default:
        return []
    }
  }

  const getExportData = () => {
    if (!reportData) return []
    return reportData.data.map((row) => {
      const base = {
        productName: row.productName,
        sku: row.sku || '-',
        category: row.category,
        brand: row.brand,
      }
      switch (reportType) {
        case 'low-stock':
          return {
            ...base,
            stock: row.stock,
            minimalStock: row.minimalStock || 0,
            unit: row.unit,
          }
        case 'fast-moving':
          return {
            ...base,
            quantity: row.quantity || 0,
            revenue: formatCurrency(row.revenue || 0),
          }
        case 'slow-moving':
          return {
            ...base,
            stock: row.stock,
            unit: row.unit,
          }
        case 'valuation':
          return {
            ...base,
            stock: row.stock,
            purchasePrice: formatCurrency(row.purchasePrice),
            valuation: formatCurrency(row.valuation || 0),
          }
        default:
          return base
      }
    })
  }

  const getReportTitle = () => {
    switch (reportType) {
      case 'low-stock':
        return 'Laporan Stok Rendah'
      case 'fast-moving':
        return 'Laporan Produk Cepat Laku'
      case 'slow-moving':
        return 'Laporan Produk Lambat Laku'
      case 'valuation':
        return 'Laporan Valuasi Stok'
      default:
        return 'Laporan Stok'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Laporan Stok</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label>Jenis Laporan</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low-stock">Stok Rendah</SelectItem>
                <SelectItem value="fast-moving">Cepat Laku</SelectItem>
                <SelectItem value="slow-moving">Lambat Laku</SelectItem>
                <SelectItem value="valuation">Valuasi Stok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kategori</Label>
            <AutocompleteSelect
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Semua Kategori"
              searchPlaceholder="Cari kategori..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Brand</Label>
            <AutocompleteSelect
              options={brands.map((b) => ({ id: b.id, name: b.name }))}
              value={brandId}
              onValueChange={setBrandId}
              placeholder="Semua Brand"
              searchPlaceholder="Cari brand..."
              className="mt-1"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}

        {reportData && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Total: {reportData.total} produk
              </p>
              <ExportButtons
                data={getExportData()}
                columns={getExportColumns()}
                filename={`${getReportTitle().toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`}
                title={getReportTitle()}
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    {reportType === 'low-stock' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stok
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stok Minimal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                      </>
                    )}
                    {reportType === 'fast-moving' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                      </>
                    )}
                    {reportType === 'slow-moving' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stok
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                      </>
                    )}
                    {reportType === 'valuation' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stok
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Harga Beli
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valuasi
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.brand}
                      </td>
                      {reportType === 'low-stock' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {row.stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.minimalStock || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.unit}
                          </td>
                        </>
                      )}
                      {reportType === 'fast-moving' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.revenue || 0)}
                          </td>
                        </>
                      )}
                      {reportType === 'slow-moving' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.unit}
                          </td>
                        </>
                      )}
                      {reportType === 'valuation' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.purchasePrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.valuation || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

