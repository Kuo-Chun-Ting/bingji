# Self-hosting Bingji

Self-hosting requires your own Google Form, Google Sheet, Apps Script project, and LINE Login channel.

## Google Form and Sheet

Create four required short-answer fields in this order:

```text
姓名 | 電話 | Email | 購買堂數
```

Link the responses to a spreadsheet. Keep the generated `表單回覆 1` tab and add these operational tabs:

```text
accounts
phone | lineUserId

courses
id | date | startTime | endTime | isOpen

registrations
id | courseId | phone | status | createdAt | updatedAt
```

The system creates account and registration rows. Courses are maintained directly in the Sheet, with `isOpen` set to `TRUE` or `FALSE`.

## Apps Script

Add these Script Properties:

```text
SPREADSHEET_ID
ADMIN_ACCOUNT
ADMIN_PASSWORD
SESSION_SECRET
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
LINE_REDIRECT_URI
```

Deploy the web app as the owner and allow access to anyone.

Install dependencies and log in with the Google account that owns the Apps Script project:

```bash
npm install
npm install --prefix apps-script
npm run apps:login
```

Create `apps-script/.clasp.json` and keep it out of Git:

```json
{
  "scriptId": "YOUR_APPS_SCRIPT_ID",
  "rootDir": "."
}
```

Create the first deployment:

```bash
./scripts/deploy-apps-script-init.sh
```

Copy the deployment ID into the `redeploy` script in `apps-script/package.json`. Later deployments use:

```bash
./scripts/deploy-apps-script.sh
```

## LINE Login

Configure the channel callback URL:

```text
https://your-domain/auth/line-callback
```

Set `LINE_REDIRECT_URI` and `NUXT_PUBLIC_LINE_REDIRECT_URI` to the same URL. Publish the LINE Login channel before allowing users without a developer role to sign in.

## Frontend

Create `.env`:

```env
NUXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
NUXT_PUBLIC_LINE_CHANNEL_ID=LINE_CHANNEL_ID
NUXT_PUBLIC_LINE_REDIRECT_URI=https://your-domain/auth/line-callback
NUXT_PUBLIC_REGISTRATION_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.PHONE_FIELD_ID={phone}
```

Start the frontend:

```bash
npm run dev
```

Deploy the generated frontend to Vercel with the same public environment variables.

Keep `ADMIN_PASSWORD`, `SESSION_SECRET`, and `LINE_CHANNEL_SECRET` only in Apps Script properties. Never place them in `.env`, frontend code, or Git.
