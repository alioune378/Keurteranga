import { NextResponse, type NextRequest } from 'next/server';
import { processOutbox } from '@/lib/outbox';

export const dynamic = 'force-dynamic';

/**
 * Retries pending emails (called every 10 minutes by the Netlify scheduled
 * function in netlify/functions/email-retry.mts, or any external cron).
 * Protected by CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await processOutbox({ limit: 50 });
  return NextResponse.json(result);
}
