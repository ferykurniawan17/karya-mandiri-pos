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
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  onSave: () => void
  onCancel: () => void
}

export default function ProductForm({ product, categories, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        stock: product.stock.toString(),
        minimalStock: product.minimalStock.toString(),
        unit: product.unit,
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        photo: product.photo || '',
        placement: product.placement || '',
        categoryId: product.categoryId,
      })
      if (product.photo) {
        setPhotoPreview(product.photo)
      }
    }
  }, [product])

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
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori *</Label>
            <Select
              required
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih Kategori" />
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

