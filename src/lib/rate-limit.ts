import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getServiceClient } from './supabase/service';

async function clientKey() {
  const h = await headers();
  const ip =
    h.get('x-nf-client-connection-ip') || // Netlify
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'kt';
  // only a salted hash is stored — never the raw IP address
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

/**
 * Returns true if the request is allowed. Limits are stored in Postgres
 * (works across serverless instances). Fails open if the check itself errors,
 * so a monitoring glitch never blocks a genuine customer.
 */
export async function rateLimit(bucket: string, max: number, windowSeconds: number) {
  const supabase = getServiceClient();
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('hit_rate_limit', {
    p_bucket: bucket,
    p_key_hash: await clientKey(),
    p_max: max,
    p_window_seconds: windowSeconds
  });
  if (error) {
    console.error('[rate-limit]', error.message);
    return true;
  }
  return data === true;
}
