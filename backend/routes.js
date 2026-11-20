const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool, withTx } = require('./db');
const { createCompany, addInvitations } = require('./lib/invitations');

const router = express.Router();
const MAX_PER_REQUEST = 500;

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseCount(value, { min = 0 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > MAX_PER_REQUEST) {
    throw httpError(400, `Number of invitations must be a whole number between ${min} and ${MAX_PER_REQUEST}`);
  }
  return n;
}

// ---------- Auth ----------
router.post(
  '/auth/login',
  h(async (req, res) => {
    const { username, password } = req.body || {};
    const okUser = safeEqual(username || '', process.env.ADMIN_USERNAME || 'admin');
    const okPass = safeEqual(password || '', process.env.ADMIN_PASSWORD || '');
    if (!process.env.ADMIN_PASSWORD) throw httpError(500, 'ADMIN_PASSWORD is not configured on the server');
    if (!(okUser && okPass)) throw httpError(401, 'Wrong username or password');
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  })
);

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Please log in'));
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(httpError(401, 'Session expired, please log in again'));
  }
}
router.use(auth);

// ---------- Stats ----------
const COMPANY_STATS_SQL = `
  SELECT c.id, c.company_name, c.prefix, c.created_at,
         COUNT(i.id)::int AS allocated,
         (COUNT(i.id) FILTER (WHERE i.status = 'checked_in'))::int AS scanned
  FROM companies c
  LEFT JOIN invitations i ON i.company_id = c.id
`;

router.get(
  '/stats',
  h(async (req, res) => {
    const { rows } = await pool.query(`${COMPANY_STATS_SQL} GROUP BY c.id ORDER BY c.company_name`);
    const companies = rows.map((r) => ({ ...r, remaining: r.allocated - r.scanned }));
    const allocated = companies.reduce((s, c) => s + c.allocated, 0);
    const scanned = companies.reduce((s, c) => s + c.scanned, 0);
    const { rows: recent } = await pool.query(
      `SELECT s.id, s.status, s.scanned_at, s.token_scanned, i.invitation_code, c.company_name
       FROM scans s
       LEFT JOIN invitations i ON i.id = s.invitation_id
       LEFT JOIN companies c ON c.id = i.company_id
       ORDER BY s.scanned_at DESC, s.id DESC LIMIT 10`
    );
    res.json({
      totals: {
        companies: companies.length,
        allocated,
        scanned,
        remaining: allocated - scanned,
        percentage: allocated ? Math.round((scanned / allocated) * 1000) / 10 : 0,
      },
      companies,
      recent,
    });
  })
);

// ---------- Companies ----------
router.get(
  '/companies',
  h(async (req, res) => {
    const search = (req.query.search || '').trim();
    const { rows } = await pool.query(
      `${COMPANY_STATS_SQL}
       WHERE ($1 = '' OR c.company_name ILIKE '%' || $1 || '%' OR c.prefix ILIKE '%' || $1 || '%')
       GROUP BY c.id ORDER BY c.company_name`,
      [search]
    );
    res.json(rows.map((r) => ({ ...r, remaining: r.allocated - r.scanned })));
  })
);

router.post(
  '/companies',
  h(async (req, res) => {
    const name = String(req.body.company_name || '').trim();
    if (!name) throw httpError(400, 'Company name is required');
    if (name.length > 150) throw httpError(400, 'Company name is too long');
    const count = parseCount(req.body.count, { min: 1 });
    const prefix = String(req.body.prefix || '').trim();
    if (prefix && !/^[A-Za-z0-9]{2,8}$/.test(prefix)) {
      throw httpError(400, 'Prefix must be 2-8 letters or numbers');
    }
    const id = await withTx((client) => createCompany(client, { name, prefix, count }));
    res.status(201).json({ id });
  })
);

router.get(
  '/companies/:id',
  h(async (req, res) => {
    const { rows } = await pool.query(`${COMPANY_STATS_SQL} WHERE c.id = $1 GROUP BY c.id`, [req.params.id]);
    if (!rows.length) throw httpError(404, 'Company not found');
    res.json({ ...rows[0], remaining: rows[0].allocated - rows[0].scanned });
  })
);

// Add more QR codes to an existing company (can be done any number of times)
router.post(
  '/companies/:id/invitations',
  h(async (req, res) => {
    const count = parseCount(req.body.count, { min: 1 });
    await withTx((client) => addInvitations(client, req.params.id, count));
    res.status(201).json({ added: count });
  })
);

router.delete(
  '/companies/:id',
  h(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    if (!rowCount) throw httpError(404, 'Company not found');
    res.json({ ok: true });
  })
);

// ---------- Invitations ----------
// ?company_id= &status=unused|checked_in &search= &include_qr=true &limit= &offset=
router.get(
  '/invitations',
  h(async (req, res) => {
    const { company_id, status, search = '', include_qr } = req.query;
    const limit = Math.min(Number(req.query.limit) || 1000, 1000);
    const offset = Number(req.query.offset) || 0;
    const rows = (
      await pool.query(
        `SELECT i.id, i.invitation_code, i.status, i.checked_in_at, i.created_at,
                i.company_id, c.company_name
                ${include_qr === 'true' ? ', i.qr_code_data' : ''}
         FROM invitations i JOIN companies c ON c.id = i.company_id
         WHERE ($1::int IS NULL OR i.company_id = $1)
           AND ($2::text IS NULL OR i.status = $2)
           AND ($3 = '' OR i.invitation_code ILIKE '%' || $3 || '%')
         ORDER BY c.company_name, i.seq
         LIMIT $4 OFFSET $5`,
        [company_id ? Number(company_id) : null, status || null, String(search).trim(), limit, offset]
      )
    ).rows;
    res.json(rows);
  })
);

// ---------- Scan (atomic check-in) ----------
router.post(
  '/scan',
  h(async (req, res) => {
    const token = String(req.body.token || '').trim();

    const logScan = (invitationId, status) =>
      pool.query('INSERT INTO scans (invitation_id, token_scanned, status) VALUES ($1, $2, $3)', [
        invitationId,
        token.slice(0, 100),
        status,
      ]);

    if (!token || token.length > 100) {
      await logScan(null, 'invalid');
      return res.json({ result: 'invalid', message: 'Invalid QR code' });
    }

    // One atomic statement: only the first scanner can flip unused -> checked_in,
    // even if many devices scan at the same moment.
    const upd = await pool.query(
      `UPDATE invitations i
       SET status = 'checked_in', checked_in_at = now()
       FROM companies c
       WHERE i.unique_token = $1 AND i.status = 'unused' AND c.id = i.company_id
       RETURNING i.id, i.invitation_code, i.checked_in_at, c.company_name`,
      [token]
    );
    if (upd.rowCount) {
      const inv = upd.rows[0];
      await logScan(inv.id, 'success');
      return res.json({
        result: 'success',
        message: 'Valid invitation - checked in',
        invitation: { code: inv.invitation_code, company_name: inv.company_name, checked_in_at: inv.checked_in_at },
      });
    }

    const { rows } = await pool.query(
      `SELECT i.id, i.invitation_code, i.checked_in_at, c.company_name
       FROM invitations i JOIN companies c ON c.id = i.company_id
       WHERE i.unique_token = $1`,
      [token]
    );
    if (rows.length) {
      const inv = rows[0];
      await logScan(inv.id, 'duplicate');
      return res.json({
        result: 'duplicate',
        message: 'Already Checked In',
        invitation: { code: inv.invitation_code, company_name: inv.company_name, checked_in_at: inv.checked_in_at },
      });
    }

    await logScan(null, 'invalid');
    res.json({ result: 'invalid', message: 'Invalid QR code - not found' });
  })
);

// ---------- Scan history ----------
router.get(
  '/scans',
  h(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const status = req.query.status || null;
    const { rows } = await pool.query(
      `SELECT s.id, s.status, s.scanned_at, s.token_scanned, i.invitation_code, c.company_name
       FROM scans s
       LEFT JOIN invitations i ON i.id = s.invitation_id
       LEFT JOIN companies c ON c.id = i.company_id
       WHERE ($1::text IS NULL OR s.status = $1)
       ORDER BY s.scanned_at DESC, s.id DESC LIMIT $2`,
      [status, limit]
    );
    res.json(rows);
  })
);

// ---------- CSV reports ----------
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

function sendCsv(res, filename, body) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + body);
}

// Invitation-level report. ?company_id= optional
router.get(
  '/reports/invitations.csv',
  h(async (req, res) => {
    const cid = req.query.company_id ? Number(req.query.company_id) : null;
    const { rows } = await pool.query(
      `SELECT c.company_name, i.invitation_code, i.status, i.checked_in_at
       FROM invitations i JOIN companies c ON c.id = i.company_id
       WHERE ($1::int IS NULL OR c.id = $1)
       ORDER BY c.company_name, i.seq`,
      [cid]
    );
    sendCsv(
      res,
      cid ? 'company-invitations.csv' : 'all-invitations.csv',
      toCsv(
        ['Company', 'Invitation ID', 'Status', 'Checked in at'],
        rows.map((r) => [
          r.company_name,
          r.invitation_code,
          r.status === 'checked_in' ? 'Checked in' : 'Not checked in',
          r.checked_in_at ? new Date(r.checked_in_at).toISOString() : '',
        ])
      )
    );
  })
);

// Company summary report
router.get(
  '/reports/summary.csv',
  h(async (req, res) => {
    const { rows } = await pool.query(`${COMPANY_STATS_SQL} GROUP BY c.id ORDER BY c.company_name`);
    sendCsv(
      res,
      'company-summary.csv',
      toCsv(
        ['Company', 'Prefix', 'Allocated', 'Scanned', 'Remaining'],
        rows.map((r) => [r.company_name, r.prefix, r.allocated, r.scanned, r.allocated - r.scanned])
      )
    );
  })
);

module.exports = router;
