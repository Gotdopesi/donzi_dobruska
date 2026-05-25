/**
 * Veřejná URL webu pro odkazy v e-mailech (zrušení rezervace).
 * Nepoužívá VERCEL_URL — preview deploymenty často vyžadují přihlášení k Vercelu.
 */
export function getPublicSiteUrl(): string {
  const explicit =
    process.env.SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://kadernictvi.dweby.cz";
}
