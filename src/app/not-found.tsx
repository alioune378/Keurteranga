// Fallback for URLs outside the [locale] segment
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Page introuvable · Page not found</h1>
        <p><a href="/fr">Accueil (FR)</a> · <a href="/en">Home (EN)</a></p>
      </body>
    </html>
  );
}
