import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting transaction reset...')

  try {
    // Count transactions before deletion
    const countBefore = await prisma.transaction.count()
    console.log(`Found ${countBefore} transactions to delete`)

    if (countBefore === 0) {
      console.log('No transactions to delete. Database is already empty.')
      return
    }

    // Delete all transactions (TransactionItems will be deleted automatically due to cascade)
    const result = await prisma.transaction.deleteMany({})

    console.log(`Successfully deleted ${result.count} transactions`)
    console.log('Transaction reset completed!')
  } catch (error) {
    console.error('Error resetting transactions:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

