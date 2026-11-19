import { NextResponse, type NextRequest } from 'next/server';
import { getAdmin } from '@/lib/admin';
import { queryBookings } from '@/lib/admin-bookings';
import { formatTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV export of bookings (admin only). Opens directly in Excel / Google Sheets. */
export async function GET(request: NextRequest) {
  const { supabase, user, isAdmin } = await getAdmin();
  if (!user || !isAdmin) return new NextResponse('Forbidden', { status: 403 });

  const p = request.nextUrl.searchParams;
  const { rows, error } = await queryBookings(
    supabase,
    { q: p.get('q') ?? '', status: p.get('status') ?? '', from: p.get('from') ?? '', to: p.get('to') ?? '', session: p.get('session') ?? '' },
    5000
  );
  if (error) return new NextResponse(error.message, { status: 500 });

  const header = ['Référence', 'Statut', 'Expérience', 'Date', 'Début', 'Fin', 'Participants', 'Langue', 'Prénom', 'Nom', 'E-mail', 'Téléphone', 'Pays', 'Demandes', 'Code partenaire', 'Notes internes', 'Réservée le', 'Annulée le'];
  const lines = rows.map((r) =>
    [
      r.reference, r.status === 'confirmed' ? 'Confirmée' : r.status === 'pending' ? 'À confirmer' : 'Annulée', r.experiences?.title?.fr ?? '',
      r.sessions?.date, formatTime(r.sessions?.start_time), formatTime(r.sessions?.end_time), r.participants,
      r.language.toUpperCase(), r.first_name, r.last_name, r.email, r.phone, r.country, r.special_requests,
      r.promo_code, r.admin_notes, r.created_at, r.cancelled_at
    ].map(csvCell).join(';')
  );
  const body = '﻿' + [header.map(csvCell).join(';'), ...lines].join('\r\n'); // BOM + ";" for French Excel
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations-ker-teranga-${stamp}.csv"`,
      'Cache-Control': 'no-store'
    }
  });
}
