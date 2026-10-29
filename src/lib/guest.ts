export const GUEST_COOKIE = "sprungbrett.guest";
export const GUEST_PROGRESS_KEY = "sprungbrett.progress.guest";

export function isGuest(cookies: Partial<Record<string, string>>): boolean {
  return cookies[GUEST_COOKIE] === "1";
}

export function guestCookie(secure: boolean): string {
  return `${GUEST_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`;
}