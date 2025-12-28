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

