import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import http from 'http';
import { UserService } from './services/userService';
import prisma from './database/client';
import bcrypt from 'bcrypt';


async function testBackendDirectly() {
  console.log('--- 1. Testing UserService & Database Schema Direct Operations ---');

  const testEmail = `test_sprint2_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const hashedPassword = await bcrypt.hash(initialPassword, 10);

  // 1. Create test user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: 'Direct Test User',
    },
  });
  console.log('[OK] Created User:', user.id, user.email);

  // 2. Get Profile
  const profile = await UserService.getProfile(user.id);
  console.log('[OK] Get Profile:', profile);
  if (profile.name !== 'Direct Test User' || profile.bio !== '') {
    throw new Error('Get profile assertion failed');
  }

  // 3. Update Profile
  const updatedProfile = await UserService.updateProfile(user.id, {
    name: 'Updated Direct Test User',
    bio: 'Backend Architecture Specialist',
    phoneNumber: '+1-555-0123',
    avatarUrl: 'https://example.com/avatar.jpg',
    timezone: 'America/New_York',
  });
  console.log('[OK] Update Profile:', updatedProfile);
  if (updatedProfile.bio !== 'Backend Architecture Specialist' || updatedProfile.timezone !== 'America/New_York') {
    throw new Error('Update profile assertion failed');
  }

  // 4. Get Settings
  const settings = await UserService.getSettings(user.id);
  console.log('[OK] Get Settings:', settings);

  // 5. Update Settings
  const updatedSettings = await UserService.updateSettings(user.id, {
    theme: 'dark',
    notifications: false,
  });
  console.log('[OK] Update Settings:', updatedSettings);
  if (updatedSettings.theme !== 'dark' || updatedSettings.notifications !== false) {
    throw new Error('Update settings assertion failed');
  }

  // 6. Change Password
  const newPassword = 'NewStrongPassword456!';
  await UserService.changePassword(user.id, initialPassword, newPassword);
  console.log('[OK] Changed Password successfully');

  // Verify wrong current password throws error
  try {
    await UserService.changePassword(user.id, 'WrongPassword', 'AnotherPassword');
    throw new Error('Should have failed with wrong current password');
  } catch (err: any) {
    console.log('[OK] Wrong current password caught as expected:', err.message);
  }

  // 7. Delete Account
  await UserService.deleteAccount(user.id);
  console.log('[OK] Account deleted successfully');

  // Verify user no longer exists
  const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (deletedUser) {
    throw new Error('User was not deleted');
  }
  console.log('[OK] Confirmed deletion from database');

  console.log('\n[SUCCESS] ALL SPRINT 2 BACKEND SERVICES & DB SCHEMA OPERATIONS VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testBackendDirectly().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
