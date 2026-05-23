import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setIdempotencyResponse, getIdempotencyResponse } from "@/lib/redis";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reservationId } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  // Idempotency check
  if (idempotencyKey) {
    const cached = await getIdempotencyResponse(`confirm:${idempotencyKey}`);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Cannot confirm a reservation with status: ${reservation.status}.`,
          status: reservation.status,
        },
        { status: 409 }
      );
    }

    // Check expiry
    if (new Date() > new Date(reservation.expiresAt)) {
      // Lazily release
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "RELEASED", releasedAt: new Date() },
        }),
        prisma.$executeRaw`
          UPDATE stocks
          SET reserved = GREATEST(0, reserved - ${reservation.quantity}), "updatedAt" = NOW()
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `,
      ]);
      return NextResponse.json(
        { error: "Reservation expired. The hold has been released." },
        { status: 410 }
      );
    }

    // Confirm: decrement total stock (not just reserved), clear reservation hold
    const confirmed = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include: {
          product: { select: { id: true, name: true, price: true, imageUrl: true } },
        },
      });

      // Decrement total stock and reserved
      await tx.$executeRaw`
        UPDATE stocks
        SET 
          total = GREATEST(0, total - ${reservation.quantity}),
          reserved = GREATEST(0, reserved - ${reservation.quantity}),
          "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return updated;
    });

    const response = {
      reservation: confirmed,
      message: "Purchase confirmed! Your order has been placed.",
    };

    if (idempotencyKey) {
      await setIdempotencyResponse(`confirm:${idempotencyKey}`, response);
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error(`[PATCH /api/reservations/${reservationId}/confirm]`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
