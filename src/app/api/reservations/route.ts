import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, acquireLock, releaseLock, setIdempotencyResponse, getIdempotencyResponse } from "@/lib/redis";
import { CreateReservationSchema } from "@/lib/schemas";
import { ZodError } from "zod";

const RESERVATION_EXPIRY_MINUTES = parseInt(
  process.env.RESERVATION_EXPIRY_MINUTES || "10",
  10
);

export async function POST(request: NextRequest) {
  let lockKey: string | null = null;

  try {
    const body = await request.json();

    // Validate input
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // --- Idempotency check ---
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const cached = await getIdempotencyResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // --- Acquire distributed lock to prevent race conditions ---
    lockKey = `${productId}:${warehouseId}`;
    const locked = await acquireLock(lockKey, 5000);
    if (!locked) {
      return NextResponse.json(
        { error: "Service busy. Please retry in a moment." },
        { status: 503 }
      );
    }

    // --- Lazy cleanup: release expired reservations for this product+warehouse ---
    await releaseExpiredReservations(productId, warehouseId);

    // --- Check available stock using a serializable transaction ---
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the stock row for this product+warehouse
        const stock = await tx.$queryRaw<
          Array<{ id: string; total: number; reserved: number }>
        >`
          SELECT id, total, reserved
          FROM stocks
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        if (!stock.length) {
          throw new StockNotFoundError("No stock record found for this product in this warehouse.");
        }

        const { total, reserved } = stock[0];
        const available = total - reserved;

        if (available < quantity) {
          throw new InsufficientStockError(
            `Only ${available} unit(s) available, but ${quantity} requested.`
          );
        }

        // Decrement available (increment reserved)
        await tx.$executeRaw`
          UPDATE stocks
          SET reserved = reserved + ${quantity}, "updatedAt" = NOW()
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
        `;

        // Create reservation
        const expiresAt = new Date(
          Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000
        );

        const reservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "PENDING",
            expiresAt,
            idempotencyKey: idempotencyKey || undefined,
          },
          include: {
            product: { select: { id: true, name: true, price: true, imageUrl: true } },
          },
        });

        return reservation;
      },
      {
        isolationLevel: "Serializable",
        timeout: 10000,
      }
    );

    const response = {
      reservation: result,
      message: `Reserved ${quantity} unit(s) for ${RESERVATION_EXPIRY_MINUTES} minutes.`,
    };

    // Store idempotency response
    if (idempotencyKey) {
      await setIdempotencyResponse(idempotencyKey, response);
    }

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof StockNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/reservations] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (lockKey) {
      await releaseLock(lockKey).catch(() => {});
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get("id");

  if (reservationId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product: { select: { id: true, name: true, price: true, imageUrl: true, description: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Check if expired and release lazily
    if (
      reservation.status === "PENDING" &&
      new Date() > new Date(reservation.expiresAt)
    ) {
      await releaseReservation(reservation.id, reservation.productId, reservation.warehouseId, reservation.quantity);
      return NextResponse.json(
        { error: "Reservation has expired and the hold has been released." },
        { status: 410 }
      );
    }

    return NextResponse.json({ reservation });
  }

  return NextResponse.json({ error: "Missing reservation ID" }, { status: 400 });
}

// ---- Helper: Lazy cleanup of expired reservations ----
async function releaseExpiredReservations(productId: string, warehouseId: string) {
  const expired = await prisma.reservation.findMany({
    where: {
      productId,
      warehouseId,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    select: { id: true, quantity: true },
  });

  for (const r of expired) {
    await releaseReservation(r.id, productId, warehouseId, r.quantity).catch(
      (e) => console.warn("[lazy cleanup] Failed to release reservation:", e)
    );
  }
}

async function releaseReservation(
  reservationId: string,
  productId: string,
  warehouseId: string,
  quantity: number
) {
  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED", releasedAt: new Date() },
    }),
    prisma.$executeRaw`
      UPDATE stocks
      SET reserved = GREATEST(0, reserved - ${quantity}), "updatedAt" = NOW()
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
    `,
  ]);
}

class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

class StockNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockNotFoundError";
  }
}
