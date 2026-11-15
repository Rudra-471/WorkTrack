// One-off: copies all WorkTrack data from one database to another (empty) one.
// Usage: FROM_URL=... TO_URL=... node prisma/copy-db.js
// Run `prisma migrate deploy` against TO_URL first so the tables exist.
import { PrismaClient } from '@prisma/client';

const from = new PrismaClient({ datasourceUrl: process.env.FROM_URL });
const to = new PrismaClient({ datasourceUrl: process.env.TO_URL });

// Parents before children so foreign keys are satisfied.
const MODELS = ['user', 'task', 'progressUpdate', 'comment', 'dailyLog', 'notification', 'activity'];
const TABLES = ['User', 'Task', 'ProgressUpdate', 'Comment', 'DailyLog', 'Notification', 'Activity'];

async function main() {
  if (!process.env.FROM_URL || !process.env.TO_URL) throw new Error('Set FROM_URL and TO_URL');
  for (const m of MODELS) {
    if (await to[m].count()) throw new Error(`Target ${m} table is not empty; refusing to copy`);
  }

  // Read everything first, then write it all in one transaction.
  const data = {};
  for (const m of MODELS) data[m] = await from[m].findMany({ orderBy: { id: 'asc' } });

  await to.$transaction(async (tx) => {
    for (const m of MODELS) {
      if (data[m].length) await tx[m].createMany({ data: data[m] });
      console.log(`${m}: ${data[m].length} rows`);
    }
    // Keep auto-increment ids continuing after the copied rows.
    for (const t of TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`,
      );
    }
  }, { maxWait: 30000, timeout: 120000 });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => Promise.all([from.$disconnect(), to.$disconnect()]));
