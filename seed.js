const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.SUPERADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || 'admin123456';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create/update superadmin from env
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      password: hashedPassword,
      isAdmin: true,
      credits: 999999,
    },
    create: {
      username: adminUsername,
      email: `${adminUsername}@local`,
      password: hashedPassword,
      credits: 999999,
      isAdmin: true,
    },
  });
  console.log('Superadmin created:', admin.username);

  // Also ensure 'admin' user works with default password
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { isAdmin: true, credits: 999999 },
    create: {
      username: 'admin',
      email: 'admin@local',
      password: hashedPassword,
      credits: 999999,
      isAdmin: true,
    },
  });
  console.log('Admin user ready');
}
main().then(() => process.exit(0));
