import jsPDF from 'jspdf'
import 'jspdf-autotable'

export interface ExportColumn {
  header: string
  dataKey: string
  width?: number
}

export function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF()

  // Add title if provided
  if (title) {
    doc.setFontSize(16)
    doc.text(title, 14, 15)
  }

  // Prepare table data
  const tableData = data.map((row) =>
    columns.map((col) => {
      const value = row[col.dataKey]
      if (value === null || value === undefined) return ''
      if (typeof value === 'number') {
        // Format numbers with thousand separators
        return value.toLocaleString('id-ID')
      }
      if (value instanceof Date) {
        return value.toLocaleDateString('id-ID')
      }
      return String(value)
    })
  )

  const headers = columns.map((col) => col.header)

  // Add table
  ;(doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: title ? 25 : 15,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width }
      }
      return acc
    }, {} as Record<number, { cellWidth: number }>),
  })

  // Save PDF
  doc.save(filename)
}

