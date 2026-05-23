import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const [mumbai, delhi, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi NCR Hub", location: "Gurgaon, Haryana" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Fulfillment", location: "Whitefield, Bangalore" },
    }),
  ]);

  console.log("✅ Warehouses created");

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5 Headphones",
        description: "Industry-leading noise cancelling wireless headphones with Auto NC Optimizer.",
        price: 29990,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Apple iPhone 15 Pro",
        description: "Titanium. So strong. So light. So Pro. A17 Pro chip with 48MP camera system.",
        price: 134900,
        imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Samsung Galaxy Tab S9",
        description: "The ultimate tablet experience with Dynamic AMOLED 2X display.",
        price: 74999,
        imageUrl: "https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Nike Air Max 270",
        description: "The Nike Air Max 270 features Nike's biggest heel Air unit yet.",
        price: 12995,
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Dyson V15 Detect",
        description: "Laser detects invisible dust. Scientifically proven deep clean.",
        price: 52900,
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Logitech MX Master 3S",
        description: "Advanced wireless mouse for performance across any surface.",
        price: 9995,
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
      },
    }),
  ]);

  console.log("✅ Products created");

  // Create stock entries (varied per warehouse)
  const stockData = [
    // Sony Headphones
    { productId: products[0].id, warehouseId: mumbai.id, total: 3, reserved: 0 },
    { productId: products[0].id, warehouseId: delhi.id, total: 1, reserved: 0 },
    { productId: products[0].id, warehouseId: bangalore.id, total: 5, reserved: 0 },
    // iPhone 15 Pro
    { productId: products[1].id, warehouseId: mumbai.id, total: 2, reserved: 0 },
    { productId: products[1].id, warehouseId: delhi.id, total: 4, reserved: 0 },
    { productId: products[1].id, warehouseId: bangalore.id, total: 0, reserved: 0 },
    // Samsung Tab S9
    { productId: products[2].id, warehouseId: mumbai.id, total: 6, reserved: 0 },
    { productId: products[2].id, warehouseId: delhi.id, total: 3, reserved: 0 },
    { productId: products[2].id, warehouseId: bangalore.id, total: 1, reserved: 0 },
    // Nike Air Max
    { productId: products[3].id, warehouseId: mumbai.id, total: 10, reserved: 0 },
    { productId: products[3].id, warehouseId: delhi.id, total: 8, reserved: 0 },
    { productId: products[3].id, warehouseId: bangalore.id, total: 12, reserved: 0 },
    // Dyson V15
    { productId: products[4].id, warehouseId: mumbai.id, total: 2, reserved: 0 },
    { productId: products[4].id, warehouseId: delhi.id, total: 1, reserved: 0 },
    { productId: products[4].id, warehouseId: bangalore.id, total: 3, reserved: 0 },
    // Logitech MX Master
    { productId: products[5].id, warehouseId: mumbai.id, total: 15, reserved: 0 },
    { productId: products[5].id, warehouseId: delhi.id, total: 7, reserved: 0 },
    { productId: products[5].id, warehouseId: bangalore.id, total: 9, reserved: 0 },
  ];

  await prisma.stock.createMany({ data: stockData });
  console.log("✅ Stock records created");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
