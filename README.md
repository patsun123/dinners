# dinners.thesunfam.net — GourmetLog

A no-build static web app that uses a Google Sheet as its database. Recreates the
GourmetLog design as a single-page React app (React via CDN, no bundler), hosted
on Cloudflare Pages.

## How it works

- The page loads React + Google Identity Services from CDN.
- You sign in with Google. Only `ALLOWED_EMAIL` from `config.js` is permitted.
- After sign-in we request an OAuth access token with the `spreadsheets` scope.
- All reads/writes go directly from the browser to the Google Sheets API.
- There is no backend. Cloudflare Pages just serves three static files.

The Sheet itself is the security boundary — even if someone bypassed the
email check, the API would reject anyone who isn't a collaborator on the Sheet.

## One-time setup

### 1. Google OAuth client ID

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create or pick a project.
3. **APIs & Services → Library → enable "Google Sheets API"**.
4. **OAuth consent screen**: set it up as "External", User type = External, add
   `patrick.sun@gmail.com` as a test user (or publish, but test is fine for personal use).
5. **Credentials → Create Credentials → OAuth client ID → Web application**.
6. Authorized JavaScript origins:
   - `https://dinners.thesunfam.net`
   - `http://localhost:8080` (for local dev)
7. Copy the client ID (looks like `1234-abc.apps.googleusercontent.com`) into
   `config.js` → `GOOGLE_CLIENT_ID`.

### 2. Local dev

The app is just static files. Any static server works:

```powershell
# Python (already installed on Win11)
python -m http.server 8080
# or PowerShell one-off (npm-free)
```

Open http://localhost:8080.

### 3. Deploy to Cloudflare Pages

```powershell
git remote add origin https://github.com/patsun123/dinners.git
git push -u origin main
```

In Cloudflare dashboard:
1. Workers & Pages → Create → Pages → Connect to Git.
2. Pick `patsun123/dinners`. Production branch = `main`.
3. Build command: *(leave empty)*. Build output directory: `/` (root).
4. Save and deploy.
5. After it deploys: **Custom domains → Set up a custom domain → `dinners.thesunfam.net`**.
   If `thesunfam.net` is already on Cloudflare DNS this is a one-click step.

## File layout

```
index.html   ← layout shell, font/CDN includes
config.js    ← OAuth client ID + sheet ID (commit-safe; client ID is public)
sheets.js    ← OAuth flow + Sheets API CRUD
app.js       ← React UI (no JSX, uses React.createElement)
```

## Sheet → recipe mapping

Sheet columns (header row = row 1):

| Col | Sheet header              | Recipe field           |
|-----|---------------------------|------------------------|
| A   | Category                  | `cuisine`              |
| B   | Meal                      | `name`                 |
| C   | Times Cooked (Last 365…)  | `cooked` (`—` = 0)     |
| D   | Recipe Link               | `url` (if `http…`) or `linkLabel` |
| E   | Type                      | `History` / `Recommended` |

- A row with `Type = Recommended` and no URL shows the "Copy search" link
  action (copies "<name> recipe" to clipboard).
- A row with a URL shows "Recipe ↗" and opens in a new tab.
- Otherwise shows "No recipe link".

New recipes default to `Type = Recommended` when not yet cooked and no URL is
given; otherwise `History`.
