import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProducts() {
  console.log('Starting product migration to multi-unit system...')

  try {
    // Get all products
    const products = await prisma.product.findMany({
      include: {
        sellingUnits: true,
      },
    })

    console.log(`Found ${products.length} products to migrate`)

    let migrated = 0

    for (const product of products) {
      // Skip if already migrated (has sellingUnits or has productType set)
      if (product.sellingUnits.length > 0 || product.productType !== 'SIMPLE') {
        continue
      }

      // Set productType to SIMPLE if not set
      // Set baseUnit = unit, baseStock = stock
      const baseUnit = product.unit || 'pcs'
      const baseStock = product.stock || 0
      const minimalBaseStock = product.minimalStock || 0

      // Update product with new fields
      await prisma.product.update({
        where: { id: product.id },
        data: {
          productType: 'SIMPLE',
          baseUnit: baseUnit,
          baseStock: baseStock,
          minimalBaseStock: minimalBaseStock,
        },
      })

      // Create default selling unit with conversionFactor = 1
      await prisma.productSellingUnit.create({
        data: {
          productId: product.id,
          name: `Per ${baseUnit}`,
          unit: baseUnit,
          conversionFactor: 1,
          sellingPrice: product.sellingPrice,
          isDefault: true,
          isActive: true,
          displayOrder: 0,
        },
      })

      migrated++
      console.log(`Migrated product: ${product.name}`)
    }

    console.log(`\nMigration completed! Migrated ${migrated} products.`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateProducts()
  .then(() => {
    console.log('Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })

