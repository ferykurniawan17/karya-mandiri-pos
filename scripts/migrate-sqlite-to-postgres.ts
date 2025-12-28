// This script migrates data from SQLite to PostgreSQL
// Usage: DATABASE_URL_SQLITE="file:./pos.db" DATABASE_URL="postgresql://..." tsx scripts/migrate-sqlite-to-postgres.ts

// IMPORTANT: Set DATABASE_URL before importing Prisma Client
const sqliteUrl = process.env.DATABASE_URL_SQLITE || 'file:./prisma/pos.db'
const originalDatabaseUrl = process.env.DATABASE_URL

if (!originalDatabaseUrl) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

// Temporarily set DATABASE_URL to SQLite for SQLite client
process.env.DATABASE_URL = sqliteUrl
const { PrismaClient: SQLitePrismaClient } = require('@prisma/client')

// Set DATABASE_URL to PostgreSQL for PostgreSQL client
process.env.DATABASE_URL = originalDatabaseUrl
const { PrismaClient: PostgresPrismaClient } = require('@prisma/client')

async function main() {
  console.log('Starting migration from SQLite to PostgreSQL...')
  console.log(`SQLite: ${sqliteUrl}`)
  console.log(`PostgreSQL: ${originalDatabaseUrl}`)

  // Create SQLite client (using SQLite URL)
  process.env.DATABASE_URL = sqliteUrl
  const sqlitePrisma = new SQLitePrismaClient()

  // Create PostgreSQL client (using PostgreSQL URL)
  process.env.DATABASE_URL = originalDatabaseUrl
  const postgresPrisma = new PostgresPrismaClient()

  try {
    // Test connections
    await sqlitePrisma.$connect()
    console.log('✓ Connected to SQLite')
    
    await postgresPrisma.$connect()
    console.log('✓ Connected to PostgreSQL')

    // Migrate in order of dependencies
    console.log('\n1. Migrating Users...')
    const users = await sqlitePrisma.user.findMany()
    for (const user of users) {
      await postgresPrisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      })
    }
    console.log(`  ✓ Migrated ${users.length} users`)

    console.log('\n2. Migrating Categories...')
    const categories = await sqlitePrisma.category.findMany()
    for (const category of categories) {
      await postgresPrisma.category.upsert({
        where: { id: category.id },
        update: category,
        create: category,
      })
    }
    console.log(`  ✓ Migrated ${categories.length} categories`)

    console.log('\n3. Migrating Tags...')
    const tags = await sqlitePrisma.tag.findMany()
    for (const tag of tags) {
      await postgresPrisma.tag.upsert({
        where: { id: tag.id },
        update: tag,
        create: tag,
      })
    }
    console.log(`  ✓ Migrated ${tags.length} tags`)

    console.log('\n4. Migrating Brands...')
    const brands = await sqlitePrisma.brand.findMany()
    for (const brand of brands) {
      await postgresPrisma.brand.upsert({
        where: { id: brand.id },
        update: brand,
        create: brand,
      })
    }
    console.log(`  ✓ Migrated ${brands.length} brands`)

    console.log('\n5. Migrating Customers...')
    const customers = await sqlitePrisma.customer.findMany()
    for (const customer of customers) {
      await postgresPrisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer,
      })
    }
    console.log(`  ✓ Migrated ${customers.length} customers`)

    console.log('\n6. Migrating Projects...')
    const projects = await sqlitePrisma.project.findMany()
    for (const project of projects) {
      await postgresPrisma.project.upsert({
        where: { id: project.id },
        update: project,
        create: project,
      })
    }
    console.log(`  ✓ Migrated ${projects.length} projects`)

    console.log('\n7. Migrating Providers...')
    const providers = await sqlitePrisma.provider.findMany()
    for (const provider of providers) {
      await postgresPrisma.provider.upsert({
        where: { id: provider.id },
        update: provider,
        create: provider,
      })
    }
    console.log(`  ✓ Migrated ${providers.length} providers`)

    console.log('\n8. Migrating Products...')
    const products = await sqlitePrisma.product.findMany({
      include: {
        tags: true,
      },
    })
    for (const product of products) {
      const { tags, ...productData } = product
      await postgresPrisma.product.upsert({
        where: { id: product.id },
        update: {
          ...productData,
          tags: {
            set: tags.map((tag) => ({ id: tag.id })),
          },
        },
        create: {
          ...productData,
          tags: {
            connect: tags.map((tag) => ({ id: tag.id })),
          },
        },
      })
    }
    console.log(`  ✓ Migrated ${products.length} products`)

    console.log('\n9. Migrating ProductSellingUnits...')
    const sellingUnits = await sqlitePrisma.productSellingUnit.findMany()
    for (const unit of sellingUnits) {
      await postgresPrisma.productSellingUnit.upsert({
        where: { id: unit.id },
        update: unit,
        create: unit,
      })
    }
    console.log(`  ✓ Migrated ${sellingUnits.length} selling units`)

    console.log('\n10. Migrating PurchaseOrders...')
    const purchaseOrders = await sqlitePrisma.purchaseOrder.findMany({
      include: {
        items: true,
      },
    })
    for (const po of purchaseOrders) {
      const { items, ...poData } = po
      await postgresPrisma.purchaseOrder.upsert({
        where: { id: po.id },
        update: {
          ...poData,
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
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
          },
        },
        create: {
          ...poData,
          items: {
            create: items.map((item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              purchaseUnit: item.purchaseUnit,
              purchasePrice: item.purchasePrice,
              subtotal: item.subtotal,
              receivedQuantity: item.receivedQuantity,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
          },
        },
      })
    }
    console.log(`  ✓ Migrated ${purchaseOrders.length} purchase orders`)

    console.log('\n11. Migrating Transactions...')
    const transactions = await sqlitePrisma.transaction.findMany({
      include: {
        items: true,
      },
    })
    for (const transaction of transactions) {
      const { items, ...transactionData } = transaction
      await postgresPrisma.transaction.upsert({
        where: { id: transaction.id },
        update: {
          ...transactionData,
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
          ...transactionData,
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
    await sqlitePrisma.$disconnect()
    await postgresPrisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

