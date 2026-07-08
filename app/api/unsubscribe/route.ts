import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { verifyUnsubscribeSig, deleteSeekerPin } from "@/lib/unsubscribe";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// GET shows a confirmation page; POST performs the delete. Deletion must not
// happen on GET — mail scanners (Outlook SafeLinks etc.) prefetch links and
// would silently unsubscribe users.

function page(title: string, body: string, button = "") {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — findmytrainer</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0812;color:#e2e8f0;font-family:system-ui,sans-serif}
main{max-width:26rem;padding:2rem;text-align:center}h1{font-size:1.15rem}p{color:#94a3b8;font-size:.9rem;line-height:1.6}
button{margin-top:1rem;padding:.6rem 1.4rem;border:0;border-radius:.65rem;background:linear-gradient(90deg,#ff2a7a,#ff7a28);color:#fff;font-weight:600;cursor:pointer}
a{color:#ff5c9d}</style></head>
<body><main><h1>${title}</h1><p>${body}</p>${button}<p><a href="/">← findmytrainer</a></p></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function parseParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pinId = Number(sp.get("pin"));
  const sig = sp.get("sig") || "";
  return { pinId: Number.isInteger(pinId) && pinId > 0 ? pinId : null, sig };
}

async function pinEmail(pinId: number): Promise<string | null> {
  const row = await (await db()).get<{ email: string }>(
    "SELECT email FROM seeker_pins WHERE id = ?",
    [pinId]
  );
  return row?.email ?? null;
}

export async function GET(req: NextRequest) {
  const { pinId, sig } = parseParams(req);
  if (!pinId) return page("Invalid link", "This unsubscribe link is malformed.");
  const email = await pinEmail(pinId);
  if (email === null)
    return page("Already unsubscribed", "This alert no longer exists — nothing more to do.");
  if (!verifyUnsubscribeSig(pinId, email, sig))
    return page("Invalid link", "This unsubscribe link is invalid or has expired.");
  return page(
    "Unsubscribe from match alerts?",
    "You will stop receiving trainer-match emails for this alert.",
    `<form method="post" action="${req.nextUrl.pathname}${req.nextUrl.search}"><button type="submit">Unsubscribe</button></form>`
  );
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`unsub:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok)
    return page("Too many requests", "Please try again in a minute.");
  const { pinId, sig } = parseParams(req);
  if (!pinId) return page("Invalid link", "This unsubscribe link is malformed.");
  const email = await pinEmail(pinId);
  if (email === null)
    return page("Already unsubscribed", "This alert no longer exists — nothing more to do.");
  if (!verifyUnsubscribeSig(pinId, email, sig))
    return page("Invalid link", "This unsubscribe link is invalid or has expired.");
  await deleteSeekerPin(pinId);
  return page(
    "Unsubscribed",
    "Done — this alert is deleted and you won't receive further emails for it."
  );
}
