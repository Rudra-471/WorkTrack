// Creates the starting accounts if they don't exist yet. Safe to run more than once:
// it never deletes data or changes existing accounts.
// The accounts have no password; each person creates their own on first sign-in.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNTS = [
  { email: 'bishnu.kiddymaitri@gmail.com', name: 'Bishnu', role: 'SUPERVISOR' },
  { email: 'chrudra471@gmail.com', name: 'Rudra', role: 'EMPLOYEE' },
];

async function main() {
  for (const a of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      console.log(`exists:  ${a.email}`);
    } else {
      await prisma.user.create({ data: a });
      console.log(`created: ${a.email} (${a.role.toLowerCase()})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
