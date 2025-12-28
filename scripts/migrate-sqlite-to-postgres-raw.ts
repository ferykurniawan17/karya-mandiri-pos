// Alternative migration script using raw SQL queries
// This script reads directly from SQLite and writes to PostgreSQL

import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import * as path from 'path'

async function main() {
  const sqlitePath = process.env.DATABASE_URL_SQLITE?.replace('file:', '') || './prisma/pos.db'
  const postgresUrl = process.env.DATABASE_URL

  if (!postgresUrl) {
    console.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('Starting migration from SQLite to PostgreSQL...')
  console.log(`SQLite: ${sqlitePath}`)
  console.log(`PostgreSQL: ${postgresUrl}`)

  // Open SQLite database
  const sqliteDb = new Database(path.resolve(sqlitePath), { readonly: true })

  // Create PostgreSQL client
  process.env.DATABASE_URL = postgresUrl
  const postgresPrisma = new PrismaClient()

  try {
    await postgresPrisma.$connect()
    console.log('✓ Connected to PostgreSQL')

    // Helper function to convert SQLite date (integer) to Date
    const convertDate = (dateValue: any): Date => {
      if (!dateValue) return new Date()
      if (dateValue instanceof Date) return dateValue
      if (typeof dateValue === 'number') return new Date(dateValue)
      if (typeof dateValue === 'string') return new Date(dateValue)
      return new Date()
    }

    // Helper function to convert SQLite boolean (integer) to Boolean
    const convertBoolean = (boolValue: any): boolean => {
      if (typeof boolValue === 'boolean') return boolValue
      if (typeof boolValue === 'number') return boolValue !== 0
      if (typeof boolValue === 'string') return boolValue === 'true' || boolValue === '1'
      return false
    }

    // Migrate Users
    console.log('\n1. Migrating Users...')
    const users = sqliteDb.prepare('SELECT * FROM User').all() as any[]
    for (const user of users) {
      await postgresPrisma.user.upsert({
        where: { id: user.id },
        update: {
          ...user,
          createdAt: convertDate(user.createdAt),
        },
        create: {
          ...user,
          createdAt: convertDate(user.createdAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${users.length} users`)

    // Migrate Categories
    console.log('\n2. Migrating Categories...')
    const categories = sqliteDb.prepare('SELECT * FROM Category').all() as any[]
    for (const category of categories) {
      await postgresPrisma.category.upsert({
        where: { id: category.id },
        update: {
          ...category,
          createdAt: convertDate(category.createdAt),
        },
        create: {
          ...category,
          createdAt: convertDate(category.createdAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${categories.length} categories`)

    // Migrate Tags
    console.log('\n3. Migrating Tags...')
    const tags = sqliteDb.prepare('SELECT * FROM Tag').all() as any[]
    for (const tag of tags) {
      await postgresPrisma.tag.upsert({
        where: { id: tag.id },
        update: {
          ...tag,
          createdAt: convertDate(tag.createdAt),
        },
        create: {
          ...tag,
          createdAt: convertDate(tag.createdAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${tags.length} tags`)

    // Migrate Brands
    console.log('\n4. Migrating Brands...')
    const brands = sqliteDb.prepare('SELECT * FROM Brand').all() as any[]
    for (const brand of brands) {
      await postgresPrisma.brand.upsert({
        where: { id: brand.id },
        update: {
          ...brand,
          createdAt: convertDate(brand.createdAt),
        },
        create: {
          ...brand,
          createdAt: convertDate(brand.createdAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${brands.length} brands`)

    // Migrate Customers
    console.log('\n5. Migrating Customers...')
    const customers = sqliteDb.prepare('SELECT * FROM Customer').all() as any[]
    for (const customer of customers) {
      await postgresPrisma.customer.upsert({
        where: { id: customer.id },
        update: {
          ...customer,
          createdAt: convertDate(customer.createdAt),
          updatedAt: convertDate(customer.updatedAt),
        },
        create: {
          ...customer,
          createdAt: convertDate(customer.createdAt),
          updatedAt: convertDate(customer.updatedAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${customers.length} customers`)

    // Migrate Projects
    console.log('\n6. Migrating Projects...')
    const projects = sqliteDb.prepare('SELECT * FROM Project').all() as any[]
    for (const project of projects) {
      await postgresPrisma.project.upsert({
        where: { id: project.id },
        update: {
          ...project,
          isDefault: convertBoolean(project.isDefault),
          createdAt: convertDate(project.createdAt),
          updatedAt: convertDate(project.updatedAt),
        },
        create: {
          ...project,
          isDefault: convertBoolean(project.isDefault),
          createdAt: convertDate(project.createdAt),
          updatedAt: convertDate(project.updatedAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${projects.length} projects`)

    // Migrate Providers
    console.log('\n7. Migrating Providers...')
    const providers = sqliteDb.prepare('SELECT * FROM Provider').all() as any[]
    for (const provider of providers) {
      await postgresPrisma.provider.upsert({
        where: { id: provider.id },
        update: {
          ...provider,
          createdAt: convertDate(provider.createdAt),
          updatedAt: convertDate(provider.updatedAt),
        },
        create: {
          ...provider,
          createdAt: convertDate(provider.createdAt),
          updatedAt: convertDate(provider.updatedAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${providers.length} providers`)

    // Migrate Products (with tags)
    console.log('\n8. Migrating Products...')
    const products = sqliteDb.prepare('SELECT * FROM Product').all() as any[]
    const productTags = sqliteDb.prepare('SELECT * FROM _ProductToTag').all() as any[]
    const tagMap = new Map<string, string[]>()
    productTags.forEach((pt: any) => {
      if (!tagMap.has(pt.A)) {
        tagMap.set(pt.A, [])
      }
      tagMap.get(pt.A)!.push(pt.B)
    })

    for (const product of products) {
      const tagIds = tagMap.get(product.id) || []
      await postgresPrisma.product.upsert({
        where: { id: product.id },
        update: {
          ...product,
          createdAt: convertDate(product.createdAt),
          updatedAt: convertDate(product.updatedAt),
          tags: {
            set: tagIds.map((id) => ({ id })),
          },
        },
        create: {
          ...product,
          createdAt: convertDate(product.createdAt),
          updatedAt: convertDate(product.updatedAt),
          tags: {
            connect: tagIds.map((id) => ({ id })),
          },
        },
      })
    }
    console.log(`  ✓ Migrated ${products.length} products`)

    // Migrate ProductSellingUnits
    console.log('\n9. Migrating ProductSellingUnits...')
    const sellingUnits = sqliteDb.prepare('SELECT * FROM ProductSellingUnit').all() as any[]
    for (const unit of sellingUnits) {
      await postgresPrisma.productSellingUnit.upsert({
        where: { id: unit.id },
        update: {
          ...unit,
          isDefault: convertBoolean(unit.isDefault),
          allowPriceBased: convertBoolean(unit.allowPriceBased),
          isActive: convertBoolean(unit.isActive),
          createdAt: convertDate(unit.createdAt),
          updatedAt: convertDate(unit.updatedAt),
        },
        create: {
          ...unit,
          isDefault: convertBoolean(unit.isDefault),
          allowPriceBased: convertBoolean(unit.allowPriceBased),
          isActive: convertBoolean(unit.isActive),
          createdAt: convertDate(unit.createdAt),
          updatedAt: convertDate(unit.updatedAt),
        },
      })
    }
    console.log(`  ✓ Migrated ${sellingUnits.length} selling units`)

    // Migrate PurchaseOrders
    console.log('\n10. Migrating PurchaseOrders...')
    const purchaseOrders = sqliteDb.prepare('SELECT * FROM PurchaseOrder').all() as any[]
    const poItems = sqliteDb.prepare('SELECT * FROM PurchaseOrderItem').all() as any[]
    const itemsByPO = new Map<string, any[]>()
    poItems.forEach((item: any) => {
      if (!itemsByPO.has(item.purchaseOrderId)) {
        itemsByPO.set(item.purchaseOrderId, [])
      }
      itemsByPO.get(item.purchaseOrderId)!.push(item)
    })

    for (const po of purchaseOrders) {
      const items = itemsByPO.get(po.id) || []
      await postgresPrisma.purchaseOrder.upsert({
        where: { id: po.id },
        update: {
          ...po,
          createdAt: convertDate(po.createdAt),
          updatedAt: convertDate(po.updatedAt),
          receivedAt: po.receivedAt ? convertDate(po.receivedAt) : undefined,
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              purchaseUnit: item.purchaseUnit,
              purchasePrice: item.purchasePrice,
              subtotal: item.subtotal,
              receivedQuantity: item.receivedQuantity,
              createdAt: convertDate(item.createdAt),
              updatedAt: convertDate(item.updatedAt),
            })),
          },
        },
        create: {
          ...po,
          createdAt: convertDate(po.createdAt),
          updatedAt: convertDate(po.updatedAt),
          receivedAt: po.receivedAt ? convertDate(po.receivedAt) : undefined,
          items: {
            create: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              purchaseUnit: item.purchaseUnit,
              purchasePrice: item.purchasePrice,
              subtotal: item.subtotal,
              receivedQuantity: item.receivedQuantity,
              createdAt: convertDate(item.createdAt),
              updatedAt: convertDate(item.updatedAt),
            })),
          },
        },
      })
    }
    console.log(`  ✓ Migrated ${purchaseOrders.length} purchase orders`)

    // Migrate Transactions
    console.log('\n11. Migrating Transactions...')
    const transactions = sqliteDb.prepare('SELECT * FROM "Transaction"').all() as any[]
    const transactionItems = sqliteDb.prepare('SELECT * FROM TransactionItem').all() as any[]
    const itemsByTransaction = new Map<string, any[]>()
    transactionItems.forEach((item: any) => {
      if (!itemsByTransaction.has(item.transactionId)) {
        itemsByTransaction.set(item.transactionId, [])
      }
      itemsByTransaction.get(item.transactionId)!.push(item)
    })

    for (const transaction of transactions) {
      const items = itemsByTransaction.get(transaction.id) || []
      await postgresPrisma.transaction.upsert({
        where: { id: transaction.id },
        update: {
          ...transaction,
          createdAt: convertDate(transaction.createdAt),
          updatedAt: convertDate(transaction.updatedAt),
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              sellingUnitId: item.sellingUnitId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              status: item.status,
            })),
          },
        },
        create: {
          ...transaction,
          createdAt: convertDate(transaction.createdAt),
          updatedAt: convertDate(transaction.updatedAt),
          items: {
            create: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              sellingUnitId: item.sellingUnitId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              status: item.status,
            })),
          },
        },
      })
    }
    console.log(`  ✓ Migrated ${transactions.length} transactions`)

    console.log('\n✅ Migration completed successfully!')
    console.log('\nSummary:')
    console.log(`  - Users: ${users.length}`)
    console.log(`  - Categories: ${categories.length}`)
    console.log(`  - Tags: ${tags.length}`)
    console.log(`  - Brands: ${brands.length}`)
    console.log(`  - Customers: ${customers.length}`)
    console.log(`  - Projects: ${projects.length}`)
    console.log(`  - Providers: ${providers.length}`)
    console.log(`  - Products: ${products.length}`)
    console.log(`  - Selling Units: ${sellingUnits.length}`)
    console.log(`  - Purchase Orders: ${purchaseOrders.length}`)
    console.log(`  - Transactions: ${transactions.length}`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    sqliteDb.close()
    await postgresPrisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

