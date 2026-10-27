export function approvedEmails(value: string | undefined): string[] {
  const emails = (value ?? "").split(",").map((email) => email.trim().toLowerCase());
  if (emails.length !== 2 || new Set(emails).size !== 2 || emails.some((email) => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email))) return [];
  return emails;
}

export function canAccess(email: unknown, verified: unknown, allowlist: string | undefined): boolean {
  return verified === true && typeof email === "string" && approvedEmails(allowlist).includes(email.trim().toLowerCase());
}

export function sessionIsCurrent(signedInAt: unknown, now = Date.now()): boolean {
  return typeof signedInAt === "number" && Number.isFinite(signedInAt) && signedInAt <= now && now - signedInAt < 8 * 60 * 60 * 1000;
}