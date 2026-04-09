const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.userSettings.findUnique({ where: { userId: 'default' } });
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
