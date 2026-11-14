import { notFound } from 'next/navigation';

// Unknown localized URLs render the translated [locale]/not-found page
export default function CatchAll() {
  notFound();
}
