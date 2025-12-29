import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate and format number input
 * Allows typing decimal numbers including "0.", ".", etc.
 * @param value - Input value as string
 * @param options - Validation options
 * @returns Validated number value or null if invalid
 */
export function validateNumberInput(
  value: string,
  options: {
    min?: number
    max?: number
    allowDecimal?: boolean
    allowNegative?: boolean
  } = {}
): number | null {
  const { min, max, allowDecimal = true, allowNegative = false } = options

  // Allow empty string while typing
  if (value === "" || value === "." || value === "-" || value === "-.") {
    return null
  }

  // Remove leading zeros except for "0."
  let cleaned = value.replace(/^0+(?=\d)/, "")

  // Validate format
  const numberRegex = allowDecimal
    ? allowNegative
      ? /^-?\d*\.?\d*$/
      : /^\d*\.?\d*$/
    : allowNegative
      ? /^-?\d+$/
      : /^\d+$/

  if (!numberRegex.test(cleaned)) {
    return null
  }

  const numValue = parseFloat(cleaned)

  if (isNaN(numValue)) {
    return null
  }

  // Check min/max
  if (min !== undefined && numValue < min) {
    return null
  }
  if (max !== undefined && numValue > max) {
    return null
  }

  return numValue
}

/**
 * Format number for display in input field
 * Preserves decimal input while typing
 */
export function formatNumberForInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (typeof value === "string") {
    return value
  }
  return value.toString()
}

/**
 * Format number as Rupiah currency string
 * @param value - Number value
 * @returns Formatted string like "Rp 1.000.000"
 */
export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }
  const numValue = typeof value === "string" ? parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", ".")) : value
  if (isNaN(numValue)) {
    return ""
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

/**
 * Parse Rupiah formatted string to number
 * @param value - Rupiah formatted string like "Rp 1.000.000"
 * @returns Number value
 */
export function parseRupiah(value: string): number {
  if (!value) return 0
  // Remove currency symbols and spaces, replace dots with empty, comma with dot
  const cleaned = value
    .replace(/Rp\s?/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim()
  const numValue = parseFloat(cleaned)
  return isNaN(numValue) ? 0 : numValue
}

