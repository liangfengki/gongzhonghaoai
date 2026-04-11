const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.SUPERADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || 'admin123456';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      password: hashedPassword,
      isAdmin: true,
      credits: 999999,
    },
    create: {
      username: adminUsername,
      email: 'admin@local',
      password: hashedPassword,
      credits: 999999,
      isAdmin: true,
    },
  });

  console.log('Superadmin created:', admin.username);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
