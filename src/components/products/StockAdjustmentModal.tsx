'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Product } from '@/types'

interface StockAdjustmentModalProps {
  product: Product
  currentStock: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function StockAdjustmentModal({
  product,
  currentStock,
  open,
  onOpenChange,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustment, setAdjustment] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const { toast } = useToast()

  // Calculate new stock preview
  const adjustmentValue = parseFloat(adjustment) || 0
  const newStock = currentStock + adjustmentValue

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setAdjustment('')
      setNote('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!adjustment || adjustment.trim() === '') {
      setError('Adjustment amount harus diisi')
      return
    }

    const adjustmentNum = parseFloat(adjustment)
    if (isNaN(adjustmentNum) || adjustmentNum === 0) {
      setError('Adjustment amount tidak valid (tidak boleh 0)')
      return
    }

    if (newStock < 0) {
      setError(`Stock tidak boleh negatif. Stock saat ini: ${currentStock}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/products/${product.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adjustment: adjustmentNum,
          note: note.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Gagal menyesuaikan stock')
        setLoading(false)
        return
      }

      toast({
        title: 'Berhasil',
        description: `Stock ${product.name} berhasil disesuaikan dari ${currentStock} menjadi ${data.newStock} ${product.unit}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('Adjust stock error:', err)
      setError('Terjadi kesalahan saat menyesuaikan stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {product.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentStock">Stock Saat Ini</Label>
            <Input
              id="currentStock"
              type="text"
              value={`${currentStock} ${product.unit}`}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment">
              Adjustment Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="adjustment"
              type="number"
              step="1"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="Masukkan jumlah (positif untuk tambah, negatif untuk kurang)"
              required
              className={error ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">
              Gunakan nilai positif untuk menambah stock, nilai negatif untuk mengurangi stock
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStock">Stock Baru (Preview)</Label>
            <Input
              id="newStock"
              type="text"
              value={`${newStock} ${product.unit}`}
              disabled
              className={`bg-gray-50 ${
                newStock < 0
                  ? 'border-red-500 text-red-600'
                  : newStock <= product.minimalStock
                  ? 'border-yellow-500 text-yellow-600'
                  : ''
              }`}
            />
            {newStock < 0 && (
              <p className="text-xs text-red-500">
                ⚠️ Stock tidak boleh negatif
              </p>
            )}
            {newStock > 0 && newStock <= product.minimalStock && (
              <p className="text-xs text-yellow-600">
                ⚠️ Stock akan berada di bawah atau sama dengan minimal stock
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Catatan (Opsional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masukkan catatan untuk adjustment ini..."
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading || newStock < 0}>
              {loading ? 'Menyimpan...' : 'Simpan Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

