import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (user) {
    console.log('✅ User found in database:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Password (hashed):', user.password);
    console.log('  Password Length:', user.password.length);
    console.log('  Created At:', user.createdAt);
    console.log('  Updated At:', user.updatedAt);

    // Verify password is hashed (bcrypt hashes are typically 60 characters)
    if (user.password.length === 60 && user.password.startsWith('$2b$')) {
      console.log('\n✅ Password is properly hashed using bcrypt');
    } else {
      console.log('\n❌ Password does not appear to be bcrypt hashed');
    }
  } else {
    console.log('❌ User not found in database');
  }

  await prisma.$disconnect();
}

testUser().catch(console.error);
