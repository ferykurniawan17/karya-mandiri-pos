import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

// This script creates a database template with schema initialized
// This template can be copied for new installations

async function createDatabaseTemplate() {
  const templatePath = path.join(process.cwd(), 'prisma', 'pos-template.db')
  
  // Set DATABASE_URL to template path
  process.env.DATABASE_URL = `file:${templatePath}`
  
  // Remove existing template if exists
  if (fs.existsSync(templatePath)) {
    fs.unlinkSync(templatePath)
  }
  
  // Push schema to create database with tables
  console.log('Creating database template with schema...')
  try {
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: `file:${templatePath}` },
      stdio: 'inherit',
    })
    console.log('✅ Database template created successfully')
    console.log(`📁 Template location: ${templatePath}`)
  } catch (error) {
    console.error('❌ Failed to create database template:', error)
    process.exit(1)
  }
}

createDatabaseTemplate()

