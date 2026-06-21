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

## Super Admin WAHA Dashboard

The Super Admin WhatsApp dashboard lives at:

```text
/admin/super-admin/waha
```

Use a super admin account to open it. The page reads WAHA state from the backend only and never receives `WAHA_API_KEY` in the browser.

### Before opening the page
- Make sure the backend is running.
- Configure `WAHA_BASE_URL`, `WAHA_API_KEY`, and `WAHA_SESSION` in the backend environment.
- Point the frontend to the backend with `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_BACKEND_URL`.

### Quick verification flow
1. Open `/admin/super-admin/waha`.
2. Click `Start Session` if the configured WAHA session does not exist or is stopped.
3. Scan the QR code if WAHA enters pairing mode.
4. Wait for the status to switch to `Connected`, or use `Refresh Status`.

### Troubleshooting
- If the QR expires, use `Refresh QR`.
- If WAHA stays disconnected after scanning, try `Restart Session`.
- If the page shows WAHA auth errors, verify the backend `WAHA_API_KEY` and `WAHA_BASE_URL`.
- Non-super-admin users are redirected away from the page and blocked by the backend with `403`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
