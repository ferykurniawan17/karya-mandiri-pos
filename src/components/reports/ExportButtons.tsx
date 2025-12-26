'use client'

import { Button } from '@/components/ui/button'
import { FileText, Download, FileSpreadsheet } from 'lucide-react'
import { exportToPDF, ExportColumn } from '@/lib/export/pdf'
import { exportToExcel, exportToCSV, ExportColumn as ExcelColumn } from '@/lib/export/excel'

interface ExportButtonsProps {
  data: any[]
  columns: ExportColumn[]
  filename: string
  title?: string
}

export default function ExportButtons({
  data,
  columns,
  filename,
  title,
}: ExportButtonsProps) {
  const handleExportPDF = () => {
    exportToPDF(data, columns, `${filename}.pdf`, title)
  }

  const handleExportExcel = () => {
    exportToExcel(data, columns as ExcelColumn[], `${filename}.xlsx`)
  }

  const handleExportCSV = () => {
    exportToCSV(data, columns as ExcelColumn[], `${filename}.csv`)
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={data.length === 0}
      >
        <FileText className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        disabled={data.length === 0}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  )
}

