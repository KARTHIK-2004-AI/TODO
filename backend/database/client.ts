import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
  log: ['warn', 'error'],
});

export default prisma;

