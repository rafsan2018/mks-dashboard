# Deploying the MKS Dashboard to cPanel

The app is two parts, hosted on two subdomains:

| Part | What it is | Address (example) | Where it lives on the server |
|---|---|---|---|
| Frontend | Static files (React build) | `https://mks.elliancesystem.com` | the subdomain's document root |
| Backend | Node.js API (Express + MySQL) | `https://mks-api.elliancesystem.com` | `~/mks-api` (outside `public_html`), run by **Setup Node.js App** |

If your dashboard address is not `mks.elliancesystem.com`, use your real one everywhere below,
including `CORS_ORIGIN`. If the API address changes, update `frontend/.env.production` too.

**Needs:** a cPanel account with **Setup Node.js App** (CloudLinux/Passenger) offering Node.js 18 or newer,
and a MySQL database.

---

## 1. Build the upload files (on your PC)

1. Copy `backend/.env.production.example` to `backend/.env.production` and fill in the real values:
   database login, SMTP mailbox, and `CORS_ORIGIN` = the dashboard address
   (`https://...`, no trailing slash). This file is git-ignored, so passwords stay out of git.
   Also set `ALERT_MONITOR_TOKEN` to a long random text (see step 8, alert emails).
2. From the project root, run:

   ```bash
   node deploy/build-cpanel.mjs
   ```

   This builds the frontend and creates:
   - `deploy/out/mks-frontend.zip`
   - `deploy/out/mks-backend.zip` (with your `.env.production` inside as `.env`, no `node_modules`)

## 2. Database

**Already have the database** (the cloud MySQL the C# service uses)? Skip to step 3 and put
its host and login in `.env.production`. If that MySQL is on a different server from the
cPanel host, it must allow connections from the cPanel server's IP address.
Make sure these migrations from `backend/migrations/` have been run on that database
(in this order, each is safe to repeat), **before** the new dashboard and the new C# service go live:
1. `2026-11-06-alert-recipients.sql`
2. `2026-11-06-sms-settings.sql`

**Starting fresh on this cPanel account:**
1. cPanel → **MySQL Databases**: create a database and a user, then add the user to the
   database with **ALL PRIVILEGES**. cPanel adds your account name in front, e.g. `myacct_mks`.
2. Open `backend/schema.sql` and delete the `CREATE DATABASE ...` and `USE elliance_mks;` lines
   at the top (lines 7–11). cPanel does not allow creating databases from SQL.
3. cPanel → **phpMyAdmin** → select your new database → **Import** → choose `schema.sql` → Go.
   `schema.sql` already contains every table, so the files in `migrations/` are not needed.
4. In `.env.production` use `DB_HOST=localhost` and the full prefixed database and user names.

## 3. Create the two subdomains

cPanel → **Domains** → **Create A New Domain**:
- `mks.elliancesystem.com`, document root e.g. `mks.elliancesystem.com`
- `mks-api.elliancesystem.com`, document root e.g. `mks-api.elliancesystem.com`

If your DNS is not managed by this cPanel, add an `A` record for each subdomain
pointing to the server's IP address.

## 4. Upload the frontend

1. cPanel → **File Manager** → open the dashboard subdomain's document root.
2. **Upload** `mks-frontend.zip`, then right-click it → **Extract**, then delete the zip.
3. Click **Settings** (top right) → tick **Show Hidden Files**, and check `.htaccess` is there.
   Without it, refreshing any page other than the home page shows a 404.

## 5. Upload and start the backend

1. In **File Manager**, go to your home folder and create a folder `mks-api`
   (next to `public_html`, not inside it, so `.env` can never be downloaded).
2. Open `mks-api`, **Upload** `mks-backend.zip`, **Extract**, then delete the zip.
   No `.env` in the zip? Create one here with **+ File** and paste the contents of
   `backend/.env.production.example` with real values.
3. cPanel → **Setup Node.js App** → **Create Application**:
   - Node.js version: the newest offered (at least 18)
   - Application mode: **Production**
   - Application root: `mks-api`
   - Application URL: `mks-api.elliancesystem.com`
   - Application startup file: `server.js`
   - Click **Create**.
4. On the same page, click **Run NPM Install** and wait for it to finish.
5. Click **Restart**.

## 6. Turn on HTTPS

cPanel → **SSL/TLS Status** → select both subdomains → **Run AutoSSL**.
After the certificates are issued you can force HTTPS on the dashboard by uncommenting
the three lines at the top of its `.htaccess`.

## 7. Check it works

1. Open `https://mks-api.elliancesystem.com/health` → you should see `"status":"healthy"`.
2. Open `https://mks.elliancesystem.com` → the login page loads and you can sign in.
3. Settings → **Send test email** to confirm SMTP works.
4. Open **SMS Alerts** → it loads the settings and the SMS log. If it says the migration has not been
   run, the dashboard is connected to a different database from the one you migrated.

## 8. Alert emails need a timer (cron)

Threshold alert emails are sent by checking the newest readings every minute. The backend can do
this itself (`ALERT_POLL_SECONDS=60`), but cPanel (Passenger) may stop an idle Node app, and then
the timer stops with it. The reliable way is a cron job:

1. In `~/mks-api/.env` set `ALERT_POLL_SECONDS=0` (no timer inside the app) and
   `ALERT_MONITOR_TOKEN=<your long random text>`, then **Restart** the Node.js app.
2. cPanel → **Cron Jobs** → add one that runs **every minute** (`* * * * *`):

   ```
   curl -s -X POST -H "x-monitor-token: YOUR_TOKEN" https://mks-api.elliancesystem.com/api/v1/alert-monitor/run > /dev/null
   ```
3. Test it once by hand. It should answer `"success":true` with `thresholds`, `checked` and `alerts`:

   ```bash
   curl -X POST -H "x-monitor-token: YOUR_TOKEN" https://mks-api.elliancesystem.com/api/v1/alert-monitor/run
   ```

A wrong token gives 403, and a missing `ALERT_MONITOR_TOKEN` switches the endpoint off (404).
SMS alerts do not depend on this: they are sent on site by the C# service.

---

## Updating later

1. Run `node deploy/build-cpanel.mjs` again.
2. **Frontend:** upload and extract `mks-frontend.zip` over the old files (allow overwrite).
   Old files in `assets/` can be deleted; they are unused.
3. **Backend:** upload and extract `mks-backend.zip` into `mks-api` (allow overwrite), then in
   **Setup Node.js App** click **Run NPM Install** (only if `package.json` changed) and **Restart**.
4. Database changes: run any new file from `backend/migrations/` in phpMyAdmin
   (remove its `USE elliance_mks;` line first if your database has a different name).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| API shows "Incomplete response" / 503 | The backend crashed at start, usually the database login. Read `~/mks-api/stderr.log` and `~/mks-api/logs/error-*.log`. Fix `.env`, then **Restart**. |
| Browser console says **CORS** / "Not allowed by CORS" | `CORS_ORIGIN` in `~/mks-api/.env` does not exactly match the dashboard address (check `https`, `www`, no trailing `/`). Fix and **Restart**. |
| Page refresh gives 404 | `.htaccess` missing from the dashboard's document root (step 4.3). |
| Changes don't appear after an update | Hard-refresh the browser (Ctrl+F5). For the backend, make sure you clicked **Restart**. |
| SMS Alerts page says the migration has not been run | `backend/migrations/2026-11-06-sms-settings.sql` was not run on the database the backend uses (check `DB_NAME` in `.env`). |
| Alert emails never arrive | The timer is not running (step 8), SMTP is not set up (use Settings → Send test email), or nobody is selected for that threshold on the Alert Recipients page. |
| "Too many requests" | Raise `RATE_LIMIT_MAX` in `.env` and **Restart**. Live readings are already exempt. |
| Slow or "Resource limit reached" | The dashboard polls every second; shared hosting limits concurrent processes. Raise `POLL_INTERVAL` in `frontend/src/constants/pollConstants.js` (e.g. 5000), rebuild, re-upload. |
