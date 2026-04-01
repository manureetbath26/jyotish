import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "interest-emails.json");

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ detail: "Invalid email" }, { status: 400 });
    }

    // Load existing emails
    let emails: { email: string; registeredAt: string }[] = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        emails = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      } catch {
        emails = [];
      }
    }

    // Avoid duplicates
    const already = emails.some(e => e.email.toLowerCase() === email.toLowerCase().trim());
    if (!already) {
      emails.push({ email: email.trim().toLowerCase(), registeredAt: new Date().toISOString() });
      fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2));
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { detail: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
