// Netlify Scheduled Function — retries pending booking/notification emails.
// Requires the CRON_SECRET and URL environment variables (URL is set by Netlify).
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`${base}/api/cron/emails`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  console.log('[email-retry]', res.status, await res.text());
};

export const config = { schedule: '*/10 * * * *' };
