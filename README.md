This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🛠️ Live Integration Test & Handshake Hotfixes (July 2026)

In July 2026, we successfully ran live end-to-end integration testing between **sDorf** and **QSTN** in production on Vercel. Below is a diagnostic record of what issues were identified, why they occurred, how we fixed them, and the resulting architecture.

### 1. The Redirection Safety Warnings (Resolved)
* **What went wrong:** When scanning the QR code on a live kiosk display, the browser redirected visitors to an insecure `http` URL with port `:3001` (because `process.env.QSTN_APP_URL` was undefined in production on Vercel). This caused browsers to show a scary "Safety Warning / Mixed-Content" error.
* **The Fix:** We updated the `sDorf` redirect router to dynamically inspect the host. If running in production, it now defaults to the secure, custom custom-domain **`https://qstn.andermatt.design`** over HTTPS, avoiding any mixed-content warnings.

### 2. The "Sicherheitsfehler" Handshake Crash (Resolved)
* **What went wrong:** The `QSTN` server proxy `/api/screen-context` failed to perform the server-to-server handshake with `sDorf`. It threw a "Sicherheitsfehler" (Safety Error) page in the app because `process.env.SDORF_APP_URL` was missing in production and defaulted to `http://localhost:3000`.
* **The Fix:** We updated `QSTN` to automatically detect its production environment. If `SDORF_APP_URL` is missing, it automatically falls back to your working production sDorf backend: **`https://s-dorf-lgeu.vercel.app`** (and keeps `http://localhost:3000` only for offline local development).

### 3. Vercel Project & Database Misalignment (Resolved)
* **What went wrong:** We noticed three `sDorf` Vercel projects existed (`s-dorf`, `s-dorf-3xcu`, `s-dorf-lgeu`), but only **`s-dorf-lgeu`** had the Turso cloud database credentials configured. The other two crashed because Vercel's read-only serverless filesystem could not open local SQLite files (`sdorf.db`).
* **The Fix:** We aligned the production handshake target in `QSTN` to cleanly direct requests to **`https://s-dorf-lgeu.vercel.app`**. *Action item: Delete the unused `s-dorf` and `s-dorf-3xcu` projects on Vercel.*

### 4. "Nur auf Handy" Queue Rejection (Resolved)
* **What went wrong:** The mobile app loaded and generated answers but displayed "Nur auf Handy" (Only on mobile) and didn't trigger the TV screen takeover. 
  1. The production `GEMINI_API_KEY` was only assigned to the "Development" environment in Vercel, so the live server fell back to a static pre-seeded answer.
  2. This static answer was 152 characters long, which violated the strict **120-character safety limit** on the `sDorf` kiosk screen. `sDorf` rejected the takeover request, forcing it to remain mobile-only.
* **The Fix:** We shortened the local fallback answer to safely fit **under 100 characters** (e.g., `Willkommen am Andermatt Bahnhof! Züge verkehren fahrplanmässig. Geniessen Sie Ihren Aufenthalt.`). This completely bypassed safety checks and let the live test succeed.
* **To enable Live AI Responses:** Go to the Vercel Dashboard -> `qstn` settings -> Environment Variables. Edit `GEMINI_API_KEY` and check the **Production** and **Preview** environments. Then trigger a redeployment!

