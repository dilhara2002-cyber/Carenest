const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const p = new PrismaClient();
  try {
    const admins = await p.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true, isActive: true, password: true }
    });
    console.log('Admin users found:', admins.length);
    for (const admin of admins) {
      console.log('  Email:', admin.email);
      console.log('  Name:', admin.name);
      console.log('  isActive:', admin.isActive);
      console.log('  Password hash:', admin.password.substring(0, 20) + '...');
      const match = await bcrypt.compare('password123', admin.password);
      console.log('  Password "password123" matches:', match);
    }
    if (admins.length === 0) {
      console.log('NO ADMIN USERS FOUND IN DATABASE!');
      console.log('You need to run: npm run db:seed');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
