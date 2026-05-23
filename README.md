# Allo Inventory — Real-time Stock Reservation System

A Next.js application that solves the race condition at checkout: when a customer proceeds to payment, their units are **temporarily held** for 10 minutes. If payment succeeds, the hold is confirmed. If it times out or is cancelled, the units return to available stock.

**Live URL**: [https://allo-inventory.vercel.app](https://allo-inventory.vercel.app) ← _deploy and update this_

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── products/route.ts          # GET products with stock per warehouse
│   │   ├── reservations/route.ts      # POST (create), GET (fetch by id)
│   │   ├── reservations/[id]/
│   │   │   ├── confirm/route.ts       # PATCH confirm purchase
│   │   │   └── cancel/route.ts        # PATCH cancel reservation
│   │   └── cron/release-expired/      # GET — Vercel Cron for expiry sweep
│   ├── checkout/[id]/
│   │   ├── page.tsx                   # Server component
│   │   └── CheckoutClient.tsx         # Client — countdown, confirm, cancel
│   └── page.tsx                       # Product listing page
├── components/
│   ├── ProductGrid.tsx                # Auto-refreshing product list
│   ├── ProductCard.tsx                # Per-product card with reserve action
│   └── ProductGridSkeleton.tsx        # Loading skeleton
└── lib/
    ├── prisma.ts                      # Singleton PrismaClient
    ├── redis.ts                       # Singleton ioredis + lock/idempotency helpers
    ├── schemas.ts                     # Zod validation schemas
    └── utils.ts                       # formatCurrency, countdown helpers
```

---

## Data Model

| Table | Key fields |
|-------|-----------|
| `products` | id, name, description, price, imageUrl |
| `warehouses` | id, name, location |
| `stocks` | productId, warehouseId, **total**, **reserved** (unique on product+warehouse) |
| `reservations` | id, productId, warehouseId, quantity, **status** (PENDING/CONFIRMED/RELEASED), **expiresAt**, idempotencyKey |

**Available = `total − reserved`**. Confirming decrements both `total` and `reserved`. Releasing (expiry or cancel) decrements only `reserved`.

---

## How Concurrency Safety Works

This is the core of the exercise. Two concurrent requests for the last unit must yield exactly one success and one 409.

### 1. Distributed Lock (Redis)
Before any database read, the API acquires a per-product-per-warehouse Redis lock using `SET key 1 PX 5000 NX`. Only one request holds the lock at a time. The other receives a **503** and should retry. Lock is released in a `finally` block.

```ts
const locked = await acquireLock(`${productId}:${warehouseId}`, 5000);
if (!locked) return 503;
```

### 2. Serializable Transaction + `SELECT FOR UPDATE`
Inside the lock, the reservation runs in a **Serializable** Prisma transaction. The stock row is fetched with `FOR UPDATE` (row-level lock), ensuring no phantom reads even in high-concurrency scenarios.

```sql
SELECT id, total, reserved FROM stocks
WHERE productId = $1 AND warehouseId = $2
FOR UPDATE;
```

If `total - reserved < quantity` → throw `InsufficientStockError` → **409 Conflict**.

### 3. Lazy Expiry Cleanup
Before checking stock, the API runs a lazy sweep: any `PENDING` reservations for the same product+warehouse that have passed `expiresAt` are released, returning units to available stock. This means even without a cron job running, stale reservations don't permanently lock out inventory.

---

## Reservation Expiry Mechanism

Three complementary approaches are used:

### A. Vercel Cron Job (Primary — production)
`vercel.json` schedules `GET /api/cron/release-expired` **every minute**. This sweeps all expired `PENDING` reservations globally and releases them. Protected by `CRON_SECRET` env var.

### B. Lazy Cleanup on Read (Secondary — always active)
Every time a reservation endpoint is called, expired reservations for that product+warehouse are released inline. This means even if the cron is down, the system self-heals on the next request.

### C. Client-side Countdown + Expiry Detection
The checkout page polls the reservation status and immediately transitions to an "Expired (410)" state when `expiresAt` passes, giving the user instant feedback.

**Trade-off**: Cron jobs run at most once per minute, so a reservation could live up to ~1 minute past expiry in the worst case. Lazy cleanup mitigates this per-product, and the client timer prevents the user from attempting to confirm an expired reservation.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `PATCH /api/reservations/[id]/confirm` endpoints support idempotency via the `Idempotency-Key` header.

**Implementation**:
1. Client generates a UUID and sends it as `Idempotency-Key: <uuid>`.
2. Server checks Redis for `idempotency:<key>` before processing.
3. If found, return the cached response immediately (no side effect).
4. If not found, process normally, then store the response in Redis with a 24-hour TTL.

```ts
const cached = await getIdempotencyResponse(idempotencyKey);
if (cached) return NextResponse.json(cached, { status: 200 });
// ... process ...
await setIdempotencyResponse(idempotencyKey, response);
```

This prevents double-charges from network retries (e.g., 3DS redirects that fire the reserve endpoint twice).

---

## Running Locally

### Prerequisites
- Node.js 18+
- A hosted Postgres database (Supabase / Neon / Railway)
- A Redis instance (Upstash / local Redis)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/allo-inventory
cd allo-inventory
npm install
```

Copy and fill in environment variables:
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL
```

Run migrations and seed:
```bash
npm run db:push          # Push schema to DB (no migration history)
# OR
npm run db:migrate       # Use proper migration history (recommended)

npm run db:seed          # Seed 3 warehouses + 6 products + stock
```

Start dev server:
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Deployment

**Vercel + Supabase + Upstash (recommended)**:

1. Push to GitHub.
2. Import into Vercel. Set env vars:
   - `DATABASE_URL` — Supabase connection string (transaction pooler)
   - `REDIS_URL` — Upstash Redis REST URL
   - `CRON_SECRET` — any random secret
   - `RESERVATION_EXPIRY_MINUTES` — default `10`
3. Vercel will auto-detect Next.js and deploy.
4. Run `npx prisma migrate deploy` against production DB.
5. Run the seed once: `npx ts-node prisma/seed.ts`.

---

## Trade-offs & What I'd Do Differently

### What I'd do with more time
- **Proper payment flow**: Integrate Stripe or Razorpay. The "confirm" button currently simulates payment success; in production, confirmation should happen via a webhook after payment processor confirms.
- **Quantity selection**: The UI currently reserves exactly 1 unit. The API already supports `quantity`, so this would be a small frontend change.
- **User sessions**: Reservations are anonymous. In production, tie reservations to authenticated users (NextAuth/Clerk) so users can see their active reservations.
- **Optimistic UI**: Immediately decrement the displayed stock count on the frontend after a successful reservation, before the next polling cycle.
- **Email notifications**: Send order confirmation emails via Resend or SendGrid.
- **Rate limiting**: Add per-IP rate limiting on the reserve endpoint to prevent abuse.

### Deliberate simplifications
- **No payment processor**: The "Confirm Purchase" button directly transitions the reservation to CONFIRMED. A real system would initiate payment here and confirm only on webhook receipt.
- **SQLite not used**: As specified, a hosted Postgres instance is required (Supabase/Neon/Railway).
- **Cron granularity**: Vercel Cron on free tier runs at most every minute. For stricter expiry, a Redis sorted-set with expiry callbacks or a Zeplo/QStash queue would be more precise.
