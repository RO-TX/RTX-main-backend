/**
 * Reset script — clears all seeded/sample data so the platform can be fed real
 * data, while KEEPING staff accounts (admin / microadmin / call_center) so
 * nobody gets locked out of the dashboard.
 *
 * Run:  npm run reset-data          (dry run — prints counts, changes nothing)
 *       npm run reset-data -- --yes (actually deletes)
 *
 * Always writes a full JSON backup of every affected collection to
 * ./backups/<timestamp>/ before deleting, so a wipe is recoverable.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Model } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import {
  User,
  Category,
  Product,
  Order,
  Payment,
  Review,
  Certification,
  RepairRequest,
  AmcEnquiry,
  CartActivity,
  Warehouse,
  Notification,
  LoginLog,
  Counter,
  Otp,
  ResetToken,
  RefreshToken,
} from '../models';
import { logger } from '../lib/logger';

/** Staff keep their accounts; everything else about them is fair game. */
const STAFF_ROLES = ['admin', 'microadmin', 'call_center'];

interface Target {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  /** Restricts what gets backed up + deleted. Omit to mean "everything". */
  filter?: Record<string, unknown>;
  note?: string;
}

const TARGETS: Target[] = [
  // ── Catalog & content ──
  { name: 'products', model: Product },
  { name: 'categories', model: Category },
  { name: 'reviews', model: Review },
  { name: 'certifications', model: Certification },
  { name: 'warehouses', model: Warehouse },
  // ── Transactional ──
  { name: 'orders', model: Order },
  { name: 'payments', model: Payment },
  { name: 'cartactivities', model: CartActivity },
  { name: 'repairrequests', model: RepairRequest },
  { name: 'amcenquiries', model: AmcEnquiry },
  // ── Operational noise generated while testing ──
  { name: 'notifications', model: Notification },
  { name: 'loginlogs', model: LoginLog },
  { name: 'otps', model: Otp },
  { name: 'resettokens', model: ResetToken },
  { name: 'refreshtokens', model: RefreshToken, note: 'forces everyone to log in again' },
  { name: 'counters', model: Counter, note: 'SKU/order sequences restart at 1' },
  // ── Users: non-staff only ──
  {
    name: 'users',
    model: User,
    filter: { role: { $nin: STAFF_ROLES } },
    note: 'staff accounts (admin/microadmin/call_center) are kept',
  },
];

async function main(): Promise<void> {
  const apply = process.argv.includes('--yes');

  await connectDB();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', stamp);

  const rows: { name: string; count: number; note?: string }[] = [];
  let total = 0;

  if (apply) await mkdir(backupDir, { recursive: true });

  for (const t of TARGETS) {
    const filter = t.filter ?? {};
    const docs = await t.model.find(filter).lean();
    rows.push({ name: t.name, count: docs.length, note: t.note });
    total += docs.length;

    if (apply && docs.length > 0) {
      await writeFile(
        path.join(backupDir, `${t.name}.json`),
        JSON.stringify(docs, null, 2),
        'utf8',
      );
    }
  }

  const width = Math.max(...rows.map((r) => r.name.length));
  logger.info(apply ? 'Deleting:' : 'Dry run — nothing will be deleted:');
  for (const r of rows) {
    logger.info(
      `  ${r.name.padEnd(width)}  ${String(r.count).padStart(5)}${r.note ? `   (${r.note})` : ''}`,
    );
  }

  const staffKept = await User.countDocuments({ role: { $in: STAFF_ROLES } });
  logger.info(`  ${'—'.repeat(width)}  ${String(total).padStart(5)} documents`);
  logger.info(`Staff accounts kept: ${staffKept}`);

  if (!apply) {
    logger.info('Re-run with `--yes` to apply.');
    await disconnectDB();
    return;
  }

  logger.info(`Backup written to ${backupDir}`);

  for (const t of TARGETS) {
    const res = await t.model.deleteMany(t.filter ?? {});
    logger.info(`Deleted ${res.deletedCount} from ${t.name}`);
  }

  logger.info('Done. Database is clean and ready for real data.');
  await disconnectDB();
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
