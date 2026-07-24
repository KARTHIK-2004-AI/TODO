import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const testEmail = 'test@example.com';
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Upsert the test user
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      email: testEmail,
      name: 'Test User',
      password: hashedPassword,
    },
  });

  console.log(`Test user created/found: ${user.email} (ID: ${user.id})`);

  // Clear existing todos for this user to make it clean
  await prisma.todo.deleteMany({
    where: { userId: user.id },
  });

  // Create sample todos
  const todos = [
    {
      title: 'Welcome to your Todo App',
      description: 'This is a sample task automatically created to get you started.',
      completed: false,
    },
    {
      title: 'Verify database setup',
      description: 'Prisma, MySQL, and the database schema are working properly!',
      completed: true,
    },
    {
      title: 'Explore the REST API',
      description: 'Test the auth and todo endpoints outlined in shared/API.md.',
      completed: false,
    },
  ];

  for (const item of todos) {
    const todo = await prisma.todo.create({
      data: {
        title: item.title,
        description: item.description,
        completed: item.completed,
        userId: user.id,
      },
    });
    console.log(`Created Todo: "${todo.title}"`);
  }

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
