import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: {
            warehouse: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute available = total - reserved
    const enriched = products.map((product) => ({
      ...product,
      stocks: product.stocks.map((stock) => ({
        ...stock,
        available: stock.total - stock.reserved,
      })),
    }));

    return NextResponse.json({ products: enriched });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
