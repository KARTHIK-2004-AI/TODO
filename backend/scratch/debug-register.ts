import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { AuthService } from '../services/authService';

async function debugRegister() {
  try {
    const user = await AuthService.register(`debug_${Date.now()}@example.com`, 'TestPassword123!', 'Debug User');
    console.log('Register succeeded:', user);
  } catch (err: any) {
    console.error('Register failed with error:');
    console.error(err);
  }
}

debugRegister();
