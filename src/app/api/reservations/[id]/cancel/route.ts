import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reservationId } = await params;

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
          error: `Cannot cancel a reservation with status: ${reservation.status}.`,
          status: reservation.status,
        },
        { status: 409 }
      );
    }

    // Cancel: release the hold
    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED", releasedAt: new Date() },
        include: {
          product: { select: { id: true, name: true, price: true } },
        },
      });

      await tx.$executeRaw`
        UPDATE stocks
        SET reserved = GREATEST(0, reserved - ${reservation.quantity}), "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return updated;
    });

    return NextResponse.json({
      reservation: cancelled,
      message: "Reservation cancelled. Units have been returned to available stock.",
    });
  } catch (err) {
    console.error(`[PATCH /api/reservations/${reservationId}/cancel]`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
