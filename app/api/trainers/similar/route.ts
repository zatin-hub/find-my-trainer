import { NextRequest, NextResponse } from "next/server";
import { findSimilarTrainers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const name = sp.get("name") || "";
  const area = sp.get("area") || undefined;
  if (name.trim().length < 2) return NextResponse.json({ matches: [] });
  return NextResponse.json({ matches: await findSimilarTrainers(name, area) });
}
