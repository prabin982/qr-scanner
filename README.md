# QR Invitation System

Admin dashboard + QR scanner for event invitations, grouped by company.

- **Frontend:** React + Vite + Tailwind + lucide-react (deploy to Vercel)
- **Backend:** Node + Express REST API (deploy to Render)
- **Database:** PostgreSQL (Render). Tables are created automatically on first start.

```
qr-invite/
├── backend/
│   ├── server.js            # Express app + startup
│   ├── routes.js            # all API routes (auth, companies, scan, reports)
│   ├── db.js                # Postgres pool + transaction helper
│   ├── schema.sql           # database schema (auto-applied on start)
│   ├── lib/invitations.js   # random tokens + QR image generation
│   ├── scripts/seed.js      # sample companies
│   └── .env.example
├── frontend/
│   ├── src/pages/           # Login, Dashboard, Companies, CompanyDetail, Scanner, History
│   ├── src/lib/exports.js   # PDF sheet, ZIP, PNG downloads
│   ├── vercel.json          # SPA routing for Vercel
│   └── .env.example
└── render.yaml              # optional one-click Render blueprint
```

## How it works

- Each invitation gets a printed ID like `CA-001` and a random 16-character token. The **QR contains only the token** (no company or personal data); the server looks it up.
- A company can have QR codes added **any number of times** (Company page -> "Add more QR codes").
- Check-in is a single atomic SQL `UPDATE ... WHERE status = 'unused'`, so two devices scanning the same code at the same moment can never both succeed. A repeat shows **Already Checked In** and is not counted.
- If the network or server fails during a scan, the scanner shows a red **Scan failed** card with a **Try again** button, and the code is not marked as seen, so it can be rescanned.
- Dashboard numbers are computed from the real invitation rows and refresh every 5 seconds.

## Run locally

Requirements: Node 20+, PostgreSQL.

```bash
# 1. database
createdb qr_invite

# 2. backend
cd backend
cp .env.example .env        # edit DATABASE_URL, ADMIN_PASSWORD, JWT_SECRET
npm install
npm run seed                # optional: sample companies A-D (10/25/50/100 invitations)
npm run dev                 # http://localhost:4000

# 3. frontend (new terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env`.

## Deploy

### 1. Database + backend on Render

The recommended setup is to create the database yourself, then connect a Render web service to it. Do not use the Blueprint flow as well: `render.yaml` creates its own database.

#### A. Create PostgreSQL on Render

1. In the Render Dashboard choose **New -> PostgreSQL**.
2. Set a name such as `qr-invite-db`, choose a region, and save that region for the backend service.
3. For real event data, choose a paid database plan. Render's Free Postgres database expires after 30 days; do not store data you need to keep on a Free database.
4. Once the database is **Available**, open its **Connect** menu and copy the **Internal Database URL**. Keep it private; do not paste it into Vercel, GitHub, or this repository.

#### B. Deploy the backend on Render

1. Choose **New -> Web Service** and connect `https://github.com/prabin982/qr-scanner`.
2. Set **Root Directory** to `backend`, **Build Command** to `npm ci`, **Start Command** to `npm start`, and **Health Check Path** to `/health`. Choose the same region as the database.
3. Add these environment variables in the Render service's **Environment** page:

   | Key | Value to paste |
   |---|---|
   | `DATABASE_URL` | The database's **Internal Database URL** copied in step A |
   | `DATABASE_SSL` | `true` |
   | `ADMIN_USERNAME` | Your chosen admin login name |
   | `ADMIN_PASSWORD` | A new, strong password; save it privately |
   | `JWT_SECRET` | Generate a random secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and paste the output here. Do not commit it. |
   | `CORS_ORIGIN` | Temporary value `https://example.vercel.app`; replace it with your actual Vercel production URL in step C |

4. Deploy. Open `https://<your-render-service>.onrender.com/health`. It should return `{"ok":true}`. The app creates its tables automatically at startup.

#### C. Deploy the frontend on Vercel

1. In Vercel choose **Add New -> Project** and import `prabin982/qr-scanner`.
2. Set **Root Directory** to `frontend`; let Vercel detect Vite and use the default build settings. The frontend requires Node.js 20 or newer.
3. Add this project environment variable before deploying:

   | Key | Value to paste |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com` (no trailing slash) |

4. Deploy and copy the production URL Vercel assigns, for example `https://qr-scanner.vercel.app`.
5. In Render, replace `CORS_ORIGIN` with that exact Vercel URL (no trailing slash), save, and redeploy the backend. The login/API requests will work once this redeploy is complete.
6. Open the Vercel site, sign in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` from Render, then create a test company and invitation. Confirm the dashboard updates and scan the test QR. Keep database credentials and admin secrets only in Render's environment settings.

### Load sample data on Render (optional)

Only do this if you want the four demo companies and their invitations. In the Render web service, open **Shell** and run `npm run seed`; it skips sample companies that already exist. Otherwise, add your actual companies from the dashboard.

## Notes

- **Camera needs HTTPS.** Vercel gives you HTTPS; locally `localhost` is allowed. Allow camera permission in the browser when asked.
- Render's Free web service sleeps after 15 minutes without traffic, so its first request after sleeping can take about a minute. For an event, use an always-on paid service and test it beforehand.
- Render's Free PostgreSQL database expires after 30 days. Use a paid database for data you need to keep, and arrange backups/exports for important event records.
- Handheld USB scanners work too: click the "USB / handheld scanner" box on the Scanner page and scan.
- Print the QR sheet from the company page: **Printable PDF** (3x4 cards per A4 page with cut lines). **All QR images (ZIP)** gives one PNG per invitation.
- Max 500 invitations per "Generate" or "Add" action; you can repeat it as often as needed.

## API summary

All `/api/*` routes except login need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | admin login |
| GET | `/api/stats` | totals, per-company stats, recent scans |
| GET/POST | `/api/companies` | list (`?search=`) / create with `count` |
| GET/DELETE | `/api/companies/:id` | details / delete |
| POST | `/api/companies/:id/invitations` | add more QR codes |
| GET | `/api/invitations` | filters: `company_id`, `status`, `search`, `include_qr` |
| POST | `/api/scan` | atomic check-in `{ token }` |
| GET | `/api/scans` | scan history |
| GET | `/api/reports/invitations.csv` | per-invitation report (`?company_id=`) |
| GET | `/api/reports/summary.csv` | company summary |
