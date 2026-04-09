const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_CODES = [
  "WTEMG67Z", "B692TUGY", "6PFSHSXN", "2VWEVJKN", "NJTSLQ8Q", "B3CUT5KM",
  "DWG6G7P3", "XVZ93W8N", "WDPT2JKF", "XQJAWADB", "ECCZ53YL", "8KGHW2BB",
  "JSVDJB84", "7699FN5C", "UWWFRZWS", "FPSFEXDB", "QWV78YRG", "WXWZB9Z5",
  "XKB346ML", "UWNB9S83", "7DRSHF8A", "UJDYXEA4", "2ETHHZ56", "B77T34V5",
  "M6PDD7AG", "7V6CN4CU", "FF4NDVSQ", "Q8AXGM4M", "9Q8EFZ82", "J7R75QW9",
  "M8Z3X346", "AS2LV7HL", "GCUHDTDM", "QQ6ET3A2", "MKW962YD", "RRACXZ8X",
  "L5ZM97B7", "QDUZLJW7", "RETJGWCC", "3L4K3W34", "99F4US37", "K34H2SHW",
  "YY63WQ83", "VL4YPWRD", "EZQ8TEVF", "5PN4K7BZ", "68653ZXS", "42HX4HS6",
  "JDFRXMZ7", "67CBU84Z"
];

async function main() {
  const deleteResult = await prisma.authCode.deleteMany({});
  console.log(`已删除 ${deleteResult.count} 个旧授权码`);

  let created = 0;
  for (const code of NEW_CODES) {
    await prisma.authCode.create({
      data: { code, usageCount: 0, maxUsage: 10 }
    });
    created++;
  }
  console.log(`已创建 ${created} 个新授权码（每个限用10篇）`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
