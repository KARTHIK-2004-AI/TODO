import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true })

// Retrieve the base database URL
const dbUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/tododb'

// Dynamically target the 'tododb_test' database by replacing the database name
const testDbUrl = dbUrl.replace(/\/([^\/]*)$/, '/tododb_test')

process.env.DATABASE_URL = testDbUrl
