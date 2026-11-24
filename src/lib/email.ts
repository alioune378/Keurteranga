import 'server-only';
import { Resend } from 'resend';

let resend: Resend | null = null;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.NOTIFY_EMAIL);
}

export function notifyAddress() {
  return process.env.NOTIFY_EMAIL || '';
}

/**
 * Sends one email through Resend. Throws on failure so the outbox keeps the
 * message pending and retries it later. Never reports success when the
 * provider is not configured.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('EMAIL_NOT_CONFIGURED: set RESEND_API_KEY and EMAIL_FROM');
  }
  if (!opts.to) throw new Error('EMAIL_NO_RECIPIENT');
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo
  });
  if (error) throw new Error(`${error.name}: ${error.message}`);
}

/** Sends up to 100 separate emails in one Resend call (each recipient gets their own email). */
export async function sendEmailBatch(items: Array<{ to: string; subject: string; html: string; replyTo?: string }>) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('EMAIL_NOT_CONFIGURED: set RESEND_API_KEY and EMAIL_FROM');
  }
  if (!items.length) return;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM;
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100).map((m) => ({ from, to: m.to, subject: m.subject, html: m.html, replyTo: m.replyTo }));
    const { error } = await resend.batch.send(chunk);
    if (error) throw new Error(`${error.name}: ${error.message}`);
  }
}
