require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const routes = require('./routes');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set.');
  process.exit(1);
}

const app = express();

const origins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That company name or prefix already exists' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error, please try again' : err.message });
});

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
