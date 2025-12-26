import * as XLSX from 'xlsx'

export interface ExportColumn {
  header: string
  dataKey: string
}

export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  // Prepare data with headers
  const worksheetData = [
    columns.map((col) => col.header),
    ...data.map((row) =>
      columns.map((col) => {
        const value = row[col.dataKey]
        if (value === null || value === undefined) return ''
        if (value instanceof Date) {
          return value.toLocaleDateString('id-ID')
        }
        return value
      })
    ),
  ]

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Set column widths
  const colWidths = columns.map(() => ({ wch: 20 }))
  worksheet['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Write file
  XLSX.writeFile(workbook, filename)
}

export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename: string
) {
  // Prepare CSV content
  const headers = columns.map((col) => col.header).join(',')
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.dataKey]
        if (value === null || value === undefined) return ''
        // Escape commas and quotes in CSV
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(',')
  )

  const csvContent = [headers, ...rows].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

