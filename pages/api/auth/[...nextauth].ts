import NextAuth from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { authConfigured, authOptions } from "../../../src/server/auth.ts";

export default async function authentication(request: NextApiRequest, response: NextApiResponse) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!authConfigured()) {
    response.status(503).json({ error: "Google sign-in is not configured. Access is closed." });
    return;
  }
  await NextAuth(request, response, authOptions);
}