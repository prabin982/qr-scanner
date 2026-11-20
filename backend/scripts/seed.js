// Loads sample companies: npm run seed
require('dotenv').config();
const { pool, initDb, withTx } = require('../db');
const { createCompany } = require('../lib/invitations');

const SAMPLE = [
  { name: 'Company A', prefix: 'CMPA', count: 10 },
  { name: 'Company B', prefix: 'CMPB', count: 25 },
  { name: 'Company C', prefix: 'CMPC', count: 50 },
  { name: 'Company D', prefix: 'CMPD', count: 100 },
];

(async () => {
  await initDb();
  for (const s of SAMPLE) {
    const { rowCount } = await pool.query('SELECT 1 FROM companies WHERE company_name = $1', [s.name]);
    if (rowCount) {
      console.log(`Skipping ${s.name} (already exists)`);
      continue;
    }
    await withTx((client) => createCompany(client, s));
    console.log(`Created ${s.name}: ${s.count} invitations`);
  }
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
