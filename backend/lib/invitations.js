const crypto = require('crypto');
const QRCode = require('qrcode');

// "Nepal Telecom" -> NT, "Acme" -> ACME, "Company A" -> CA
function autoPrefix(name) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'CMP';
  if (words.length === 1) return words[0].slice(0, 4);
  return words.map((w) => w[0]).join('').slice(0, 4);
}

async function uniquePrefix(client, base) {
  let candidate = base;
  for (let n = 1; n < 100; n++) {
    const { rowCount } = await client.query('SELECT 1 FROM companies WHERE prefix = $1', [candidate]);
    if (!rowCount) return candidate;
    candidate = base.slice(0, 6) + n;
  }
  throw new Error('Could not generate a unique prefix, please provide one');
}

// Adds `count` new invitations (with QR images) to an existing company.
// Can be called many times for the same company.
async function addInvitations(client, companyId, count) {
  const { rows: crow } = await client.query(
    'SELECT id, prefix FROM companies WHERE id = $1 FOR UPDATE',
    [companyId]
  );
  if (!crow.length) {
    const e = new Error('Company not found');
    e.status = 404;
    throw e;
  }
  const { prefix } = crow[0];

  const { rows: m } = await client.query(
    'SELECT COALESCE(MAX(seq), 0) AS max FROM invitations WHERE company_id = $1',
    [companyId]
  );
  const start = Number(m[0].max) + 1;

  const seqs = [];
  const codes = [];
  const tokens = [];
  for (let i = 0; i < count; i++) {
    const seq = start + i;
    seqs.push(seq);
    codes.push(`${prefix}-${String(seq).padStart(3, '0')}`);
    tokens.push(crypto.randomBytes(12).toString('base64url')); // 16 chars, unguessable
  }

  // The QR only contains the random token, nothing personal.
  const images = await Promise.all(
    tokens.map((t) => QRCode.toDataURL(t, { width: 400, margin: 2, errorCorrectionLevel: 'M' }))
  );

  await client.query(
    `INSERT INTO invitations (company_id, seq, invitation_code, unique_token, qr_code_data)
     SELECT $1, s, c, t, q
     FROM unnest($2::int[], $3::text[], $4::text[], $5::text[]) AS x(s, c, t, q)`,
    [companyId, seqs, codes, tokens, images]
  );

  await client.query(
    'UPDATE companies SET allocated_invitations = allocated_invitations + $2 WHERE id = $1',
    [companyId, count]
  );
  return count;
}

async function createCompany(client, { name, prefix, count }) {
  const cleanPrefix = prefix
    ? prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    : await uniquePrefix(client, autoPrefix(name));

  const { rows } = await client.query(
    'INSERT INTO companies (company_name, prefix) VALUES ($1, $2) RETURNING id',
    [name, cleanPrefix]
  );
  const id = rows[0].id;
  if (count > 0) await addInvitations(client, id, count);
  return id;
}

module.exports = { addInvitations, createCompany };
