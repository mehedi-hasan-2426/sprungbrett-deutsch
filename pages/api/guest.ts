import type { NextApiRequest, NextApiResponse } from "next";
import { GUEST_COOKIE, guestCookie } from "../../src/lib/guest.ts";

export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };

export default function guest(request: NextApiRequest, response: NextApiResponse) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Vary", "Cookie");
  if (request.method !== "POST" && request.method !== "DELETE") {
    response.setHeader("Allow", "POST, DELETE");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  let origin: URL;
  try {
    origin = new URL(request.headers.origin ?? "");
  } catch {
    response.status(403).json({ error: "A same-origin guest request is required" });
    return;
  }
  if (request.headers["x-sprungbrett-guest"] !== "1" || request.headers["sec-fetch-site"] === "cross-site" || origin.origin !== request.headers.origin || origin.host !== request.headers.host || !["http:", "https:"].includes(origin.protocol)) {
    response.status(403).json({ error: "A same-origin guest request is required" });
    return;
  }
  const secure = origin.protocol === "https:";
  response.setHeader("Set-Cookie", request.method === "POST" ? guestCookie(secure) : `${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
  response.status(204).end();
}