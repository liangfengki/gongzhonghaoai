const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('Error: SUPERADMIN_PASSWORD environment variable is required');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Always create admin + liangfengki as superadmins
  const admins = ['admin', 'liangfengki'];
  for (const username of admins) {
    await prisma.user.upsert({
      where: { username },
      update: { password: hashedPassword, isAdmin: true, credits: 999999 },
      create: {
        username,
        email: `${username}@local`,
        password: hashedPassword,
        credits: 999999,
        isAdmin: true,
      },
    });
    console.log('Superadmin ready:', username);
  }
}
main().then(() => process.exit(0));
