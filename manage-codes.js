const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const crypto = require('crypto');

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like I, 1, O, 0
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('\n🌟 01Agent 授权码管理工具 🌟');
  console.log('---------------------------------');

  while (true) {
    console.log('\n请选择操作：');
    console.log('1. 生成随机授权码');
    console.log('2. 添加指定授权码');
    console.log('3. 查看所有授权码及使用情况');
    console.log('4. 删除授权码');
    console.log('0. 退出');

    const choice = await prompt('\n输入序号 (0-4): ');

    try {
      if (choice === '1') {
        const countStr = await prompt('请输入要生成的数量 (默认 1): ');
        const count = parseInt(countStr) || 1;
        
        console.log(`\n正在生成 ${count} 个授权码...`);
        for (let i = 0; i < count; i++) {
          const code = generateRandomCode();
          await prisma.authCode.create({
            data: { code, usageCount: 0 }
          });
          console.log(`✅ ${code}`);
        }
      } 
      
      else if (choice === '2') {
        const code = await prompt('请输入自定义授权码: ');
        if (!code.trim()) {
          console.log('❌ 授权码不能为空');
          continue;
        }
        
        const existing = await prisma.authCode.findUnique({ where: { code: code.trim() } });
        if (existing) {
          console.log('❌ 该授权码已存在');
        } else {
          await prisma.authCode.create({
            data: { code: code.trim(), usageCount: 0 }
          });
          console.log(`✅ 成功添加授权码: ${code.trim()}`);
        }
      } 
      
      else if (choice === '3') {
        const codes = await prisma.authCode.findMany({
          orderBy: { createdAt: 'desc' }
        });
        
        console.log(`\n📊 共有 ${codes.length} 个授权码：`);
        console.log('------------------------------------------------------------');
        console.log('授权码\t\t今日使用次数\t最后使用时间\t\t创建时间');
        console.log('------------------------------------------------------------');
        
        for (const c of codes) {
          const now = new Date();
          const lastUsed = c.lastUsedAt || new Date(0);
          const isSameDay = lastUsed.getFullYear() === now.getFullYear() &&
                            lastUsed.getMonth() === now.getMonth() &&
                            lastUsed.getDate() === now.getDate();
          
          const todayUsage = isSameDay ? c.usageCount : 0;
          const lastUsedStr = c.lastUsedAt ? c.lastUsedAt.toLocaleString('zh-CN') : '从未';
          const createdStr = c.createdAt.toLocaleString('zh-CN');
          
          console.log(`${c.code.padEnd(16)}${todayUsage.toString().padEnd(16)}${lastUsedStr.padEnd(24)}${createdStr}`);
        }
        console.log('------------------------------------------------------------');
      } 
      
      else if (choice === '4') {
        const code = await prompt('请输入要删除的授权码: ');
        if (!code.trim()) {
          console.log('❌ 授权码不能为空');
          continue;
        }
        
        try {
          await prisma.authCode.delete({
            where: { code: code.trim() }
          });
          console.log(`✅ 成功删除授权码: ${code.trim()}`);
        } catch (e) {
          console.log(`❌ 删除失败，可能该授权码不存在`);
        }
      } 
      
      else if (choice === '0') {
        console.log('👋 再见！');
        break;
      } 
      
      else {
        console.log('❌ 无效的输入');
      }
    } catch (error) {
      console.error('发生错误:', error.message);
    }
  }

  rl.close();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });