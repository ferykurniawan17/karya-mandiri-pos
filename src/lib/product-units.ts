import { Product, ProductSellingUnit } from "@/types";

/**
 * Convert selling unit quantity to base unit quantity
 * @param quantity - Quantity in selling unit
 * @param sellingUnit - The selling unit with conversion factor
 * @returns Quantity in base unit
 */
export function convertToBaseUnit(
  quantity: number,
  sellingUnit: ProductSellingUnit
): number {
  const conversionFactor = Number(sellingUnit.conversionFactor);
  return quantity * conversionFactor;
}

/**
 * Convert base unit quantity to selling unit quantity
 * @param baseQuantity - Quantity in base unit
 * @param sellingUnit - The selling unit with conversion factor
 * @returns Quantity in selling unit
 */
export function convertFromBaseUnit(
  baseQuantity: number,
  sellingUnit: ProductSellingUnit
): number {
  const conversionFactor = Number(sellingUnit.conversionFactor);
  if (conversionFactor === 0) return 0;
  return baseQuantity / conversionFactor;
}

/**
 * Calculate quantity from price for price-based sales
 * @param price - Price in rupiah
 * @param sellingUnit - The selling unit
 * @returns Quantity in base unit
 */
export function calculateQuantityFromPrice(
  price: number,
  sellingUnit: ProductSellingUnit
): number {
  if (!sellingUnit.allowPriceBased) {
    throw new Error("Price-based sales not allowed for this unit");
  }

  // Calculate price per base unit
  const sellingPrice = Number(sellingUnit.sellingPrice);
  const conversionFactor = Number(sellingUnit.conversionFactor);
  const pricePerBaseUnit = sellingPrice / conversionFactor;
  if (pricePerBaseUnit === 0) return 0;

  // Calculate quantity in base unit
  return price / pricePerBaseUnit;
}

/**
 * Calculate stock deduction in base unit
 * @param quantity - Quantity in selling unit
 * @param sellingUnit - The selling unit
 * @returns Stock to deduct in base unit
 */
export function calculateStockDeduction(
  quantity: number,
  sellingUnit: ProductSellingUnit
): number {
  return convertToBaseUnit(quantity, sellingUnit);
}

/**
 * Get default selling unit for a product
 * @param product - The product
 * @returns Default selling unit or null
 */
export function getDefaultSellingUnit(
  product: Product
): ProductSellingUnit | null {
  if (!product.sellingUnits || product.sellingUnits.length === 0) {
    return null;
  }

  // Find default selling unit
  const defaultUnit = product.sellingUnits.find(
    (unit) => unit.isDefault && unit.isActive
  );

  if (defaultUnit) {
    return defaultUnit;
  }

  // If no default, return first active unit
  const firstActive = product.sellingUnits.find((unit) => unit.isActive);
  return firstActive || null;
}

/**
 * Get effective stock for a product
 * Returns baseStock if available, otherwise falls back to stock
 */
export function getEffectiveStock(product: Product): number {
  if (product.baseStock !== null && product.baseStock !== undefined) {
    return Number(product.baseStock);
  }
  return product.stock || 0;
}

/**
 * Get effective unit for a product
 * Returns baseUnit if available, otherwise falls back to unit
 */
export function getEffectiveUnit(product: Product): string {
  return product.baseUnit || product.unit || "";
}

/**
 * Check if product has multiple selling units
 */
export function hasMultipleSellingUnits(product: Product): boolean {
  return (
    product.sellingUnits !== undefined &&
    product.sellingUnits.length > 0 &&
    product.sellingUnits.filter((unit) => unit.isActive).length > 1
  );
}

/**
 * Get active selling units for a product
 */
export function getActiveSellingUnits(product: Product): ProductSellingUnit[] {
  if (!product.sellingUnits) {
    return [];
  }
  return product.sellingUnits.filter((unit) => unit.isActive);
}
