import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron job to release expired reservations.
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/release-expired", "schedule": "* * * * *" }]
 * }
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all expired PENDING reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0, message: "No expired reservations." });
    }

    // Release each in a transaction
    let released = 0;
    for (const r of expired) {
      try {
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id: r.id },
            data: { status: "RELEASED", releasedAt: now },
          }),
          prisma.$executeRaw`
            UPDATE stocks
            SET reserved = GREATEST(0, reserved - ${r.quantity}), "updatedAt" = NOW()
            WHERE "productId" = ${r.productId}
              AND "warehouseId" = ${r.warehouseId}
          `,
        ]);
        released++;
      } catch (e) {
        console.error(`[cron] Failed to release reservation ${r.id}:`, e);
      }
    }

    console.log(`[cron] Released ${released}/${expired.length} expired reservations.`);
    return NextResponse.json({ released, total: expired.length });
  } catch (err) {
    console.error("[cron] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
