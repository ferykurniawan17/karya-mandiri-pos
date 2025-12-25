'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'

interface Category {
  id: string
  name: string
}

interface Tag {
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
  aliasName?: string
  sku?: string
  stock: number
  minimalStock: number
  unit: string
  purchasePrice: number
  sellingPrice: number
  photo?: string
  placement?: string
  categoryId: string
  brandId?: string
  tags?: Tag[]
  brand?: Brand
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  tags: Tag[]
  brands: Brand[]
  onSave: () => void
  onCancel: () => void
}

export default function ProductForm({ product, categories, tags, brands, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    aliasName: '',
    sku: '',
    stock: '0',
    minimalStock: '0',
    unit: 'pcs',
    purchasePrice: '0',
    sellingPrice: '0',
    photo: '',
    placement: '',
    categoryId: '',
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingSKU, setGeneratingSKU] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (product) {
      const categoryId = product.categoryId || ''
      setFormData({
        name: product.name,
        aliasName: product.aliasName || '',
        sku: product.sku || '',
        stock: product.stock.toString(),
        minimalStock: product.minimalStock.toString(),
        unit: product.unit,
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        photo: product.photo || '',
        placement: product.placement || '',
        categoryId: categoryId,
      })
      // Set selected category ID separately for Select component
      // Set immediately - Radix Select should handle this
      setSelectedCategoryId(categoryId)
      setSelectedTags(product.tags ? product.tags.map(t => t.id) : [])
      setSelectedBrandId(product.brandId || '')
      if (product.photo) {
        setPhotoPreview(product.photo)
      }
    } else {
      // Reset form when no product (new product)
      setFormData({
        name: '',
        aliasName: '',
        sku: '',
        stock: '0',
        minimalStock: '0',
        unit: 'pcs',
        purchasePrice: '0',
        sellingPrice: '0',
        photo: '',
        placement: '',
        categoryId: '',
      })
      setSelectedCategoryId('')
      setSelectedTags([])
      setSelectedBrandId('')
      setPhotoPreview('')
      setPhotoFile(null)
    }
  }, [product])

  const generateSKU = async () => {
    if (!formData.name) {
      toast({
        title: 'Peringatan',
        description: 'Nama produk harus diisi terlebih dahulu',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCategoryId) {
      toast({
        title: 'Peringatan',
        description: 'Kategori harus diisi terlebih dahulu untuk generate SKU',
        variant: 'destructive',
      })
      return
    }

    setGeneratingSKU(true)

    try {
      // Get category code (first 3 letters of category name, uppercase)
      const category = categories.find((c) => c.id === selectedCategoryId)
      if (!category) {
        toast({
          title: 'Peringatan',
          description: 'Kategori tidak ditemukan',
          variant: 'destructive',
        })
        setGeneratingSKU(false)
        return
      }

      const categoryCode = category.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase()

      // Get product name abbreviation (first 3-4 letters, uppercase, remove spaces and special chars)
      const productNameAbbr = formData.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase()

      // Generate SKU with retry logic to ensure uniqueness
      let sku = ''
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        // Generate SKU: CAT-PROD-XXX (where XXX is random 3 digits)
        const randomNum = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')
        
        sku = `${categoryCode}-${productNameAbbr}-${randomNum}`

        // Check if SKU already exists
        try {
          const checkResponse = await fetch(`/api/products/check-sku?sku=${encodeURIComponent(sku)}${product ? `&excludeId=${product.id}` : ''}`)
          const checkData = await checkResponse.json()
          
          if (!checkData.exists) {
            // SKU is unique, use it
            setFormData({ ...formData, sku })
            toast({
              title: 'SKU Generated',
              description: `SKU berhasil dibuat: ${sku}`,
            })
            setGeneratingSKU(false)
            return
          }
        } catch (error) {
          console.error('Error checking SKU:', error)
          // If check fails, still use the generated SKU (backend will validate)
          setFormData({ ...formData, sku })
          toast({
            title: 'SKU Generated',
            description: `SKU berhasil dibuat: ${sku}`,
          })
          setGeneratingSKU(false)
          return
        }

        attempts++
      }

      // If we couldn't generate a unique SKU after max attempts
      toast({
        title: 'Error',
        description: 'Gagal generate SKU yang unique. Silakan coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingSKU(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let photoUrl = formData.photo

      // Upload photo if new file selected
      if (photoFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', photoFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          setError(uploadData.error || 'Gagal mengunggah foto')
          setLoading(false)
          return
        }

        photoUrl = uploadData.url
      }

      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          categoryId: selectedCategoryId || formData.categoryId,
          brandId: selectedBrandId || undefined,
          tagIds: selectedTags,
          photo: photoUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Gagal menyimpan produk')
        setLoading(false)
        return
      }

      setLoading(false)
      onSave()
      toast({
        title: 'Berhasil',
        description: product ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan',
      })
    } catch (err) {
      setError('Terjadi kesalahan')
      setLoading(false)
      toast({
        title: 'Error',
        description: 'Gagal menyimpan produk',
        variant: 'destructive',
      })
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk *</Label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aliasName">Nama Lain (Opsional)</Label>
            <Input
              id="aliasName"
              type="text"
              value={formData.aliasName}
              onChange={(e) => setFormData({ ...formData, aliasName: e.target.value })}
              placeholder="Nama alternatif produk"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <div className="flex gap-2">
              <Input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={product ? "SKU tidak bisa diubah" : "Kosongkan untuk generate otomatis"}
                className="flex-1"
                disabled={!!product}
                readOnly={!!product}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateSKU}
                disabled={!formData.name || !selectedCategoryId || !!product || generatingSKU}
                title={product ? "SKU tidak bisa diubah saat edit" : "Generate SKU otomatis (kategori harus diisi)"}
              >
                <RefreshCw className={`h-4 w-4 ${generatingSKU ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {product 
                ? "SKU tidak bisa diubah setelah produk dibuat"
                : "Klik tombol untuk generate SKU otomatis (kategori harus diisi terlebih dahulu)"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori *</Label>
            <Select
              required
              value={selectedCategoryId && selectedCategoryId !== '' ? selectedCategoryId : undefined}
              onValueChange={(value) => {
                setSelectedCategoryId(value)
                setFormData((prev) => ({ ...prev, categoryId: value }))
              }}
              key={`category-select-${product?.id || 'new'}-${selectedCategoryId}`}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih Kategori">
                  {selectedCategoryId && categories.find((c) => c.id === selectedCategoryId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand (Opsional)</Label>
            <Select
              value={selectedBrandId && selectedBrandId !== '' ? selectedBrandId : undefined}
              onValueChange={(value) => {
                setSelectedBrandId(value)
              }}
            >
              <SelectTrigger id="brand">
                <SelectValue placeholder="Pilih Brand">
                  {selectedBrandId && brands.find((b) => b.id === selectedBrandId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">Tags (Opsional)</Label>
            <MultiSelect
              options={tags.map(t => ({ id: t.id, name: t.name }))}
              selected={selectedTags}
              onSelectionChange={setSelectedTags}
              placeholder="Pilih tags..."
              searchPlaceholder="Cari tags..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Satuan *</Label>
            <Select
              required
              value={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
            >
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pcs</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="m">Meter</SelectItem>
                <SelectItem value="m2">M²</SelectItem>
                <SelectItem value="m3">M³</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
                <SelectItem value="box">Box</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stok</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimalStock">Stok Minimal</Label>
            <Input
              id="minimalStock"
              type="number"
              min="0"
              value={formData.minimalStock}
              onChange={(e) => setFormData({ ...formData, minimalStock: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Harga Beli *</Label>
            <Input
              id="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Harga Jual *</Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placement">Penempatan</Label>
            <Input
              id="placement"
              type="text"
              value={formData.placement}
              onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
              placeholder="Contoh: Rak A1, Gudang 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Foto</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Preview"
                className="mt-2 h-32 object-cover rounded"
              />
            )}
          </div>
        </div>
        <div className="flex space-x-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  )
}

