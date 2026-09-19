/** Job IDs are session scoped; a link never bypasses the server's ownership check. */
export function jobIdFromUrl(url: string): string | null {
  const value = new URL(url).searchParams.get("job");
  return value && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : null;
}
export function jobUrl(url: string, id: string): string {
  const next = new URL(url);
  next.searchParams.set("job", id);
  return `${next.pathname}${next.search}${next.hash}`;
}
