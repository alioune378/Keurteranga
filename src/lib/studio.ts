import 'server-only';
import { cache } from 'react';
import { resolveContact, type ResolvedContact, type SiteSettingsRow } from './site-settings';
import { getPublicClient } from './supabase/public';
import type { Localized } from './types';

/**
 * Public reads for the content the owner manages in Kër Téranga Studio.
 * Row Level Security only returns PUBLISHED items whose dates are current,
 * so drafts and expired offers never reach visitors.
 */

export interface Announcement {
  id: string;
  status: 'draft' | 'published';
  placement: 'banner' | 'home';
  title: Localized;
  body: Localized;
  cta_label: Localized;
  cta_url: string | null;
  event_date: string | null;
  image_url: string | null;
  image_path: string | null;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
}

export interface Offer {
  id: string;
  status: 'draft' | 'published';
  experience_id: string | null;
  title: Localized;
  description: Localized;
  discount_percent: number | null;
  offer_price_xof: number | null;
  code: string | null;
  image_url: string | null;
  image_path: string | null;
  starts_on: string | null;
  ends_on: string | null;
  show_on_home: boolean;
  sort_order: number;
  experiences?: { slug: string; title: Localized; price_xof: number | null } | null;
}

export interface MediaItem {
  id: string;
  title: Localized;
  kind: 'flyer' | 'poster' | 'photo' | 'other';
  file_url: string;
  storage_path: string | null;
  mime: string;
  show_on_home: boolean;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
  created_at: string;
}

export const getSiteSettings = cache(async (): Promise<{ contact: ResolvedContact; content: NonNullable<SiteSettingsRow['content']> }> => {
  const supabase = getPublicClient();
  if (!supabase) return { contact: resolveContact(null), content: {} };
  const { data, error } = await supabase.from('site_settings').select('contact, content').eq('id', 1).maybeSingle();
  if (error) console.error('[studio] settings', error.message);
  const row = (data ?? null) as SiteSettingsRow | null;
  return { contact: resolveContact(row), content: row?.content ?? {} };
});

export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) console.error('[studio] announcements', error.message);
  return (data ?? []) as Announcement[];
});

export const getOffers = cache(async (): Promise<Offer[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('offers')
    .select('*, experiences ( slug, title, price_xof )')
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) console.error('[studio] offers', error.message);
  return (data ?? []) as Offer[];
});

export const getHomeMedia = cache(async (): Promise<MediaItem[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('show_on_home', true)
    .order('sort_order')
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) console.error('[studio] media', error.message);
  return (data ?? []) as MediaItem[];
});
