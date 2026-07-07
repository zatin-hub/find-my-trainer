import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { isOwner } from "@/lib/claim";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const d = await db();
  const trainer = await d.get<{ id: number }>(
    "SELECT id FROM trainers WHERE slug = ?",
    [slug]
  );
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  if (!(await isOwner(trainer.id)))
    return NextResponse.json({ error: "Not the owner" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await d.run(
    `UPDATE trainers SET
       bio = @bio,
       contact_instagram = @instagram,
       contact_phone = @phone,
       price_min = @price_min,
       price_max = @price_max,
       price_unit = @price_unit
     WHERE id = @id`,
    {
      id: trainer.id,
      bio: body.bio ? String(body.bio).slice(0, 600) : null,
      instagram: body.contact_instagram
        ? String(body.contact_instagram).replace(/^@/, "")
        : null,
      // Owners may add a phone since they've consented (gated to claimed profiles).
      phone: body.contact_phone ? String(body.contact_phone) : null,
      price_min: body.price_min ? Number(body.price_min) : null,
      price_max: body.price_max ? Number(body.price_max) : null,
      price_unit: body.price_unit ? String(body.price_unit) : null,
    }
  );

  return NextResponse.json({ ok: true });
}
