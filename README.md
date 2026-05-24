# Allo Inventory Reservation System

A high-concurrency e-commerce reservation engine designed to prevent inventory race conditions and double-allocations. The system guarantees transactional safety by locking stock allocations for a 10-minute checkout window before final payment verification.

- **Production URL:** [https://allo-health-chi.vercel.app](https://allo-health-chi.vercel.app)
- **GitHub Repository:** [https://github.com/pragadeeshwaran7/allo-health](https://github.com/pragadeeshwaran7/allo-health)

---

## 🛠️ Architecture & Concurrency Control

To guarantee that two concurrent checkout requests do not allocate the same physical stock unit at the exact same millisecond, the system employs a two-tier locking strategy:

### 1. Redis Distributed Lock (Mutex)
When a user requests a reserve hold, the API immediately attempts to acquire a distributed lock in Redis for the specific `productId` and `warehouseId`. This serializes concurrent checkout requests at the application gateway level.

### 2. Serializable Database Transactions
Once the Redis lock is acquired, the application opens a `SERIALIZABLE` database transaction block using Prisma and PostgreSQL. The transaction:
- Assesses current available stock count.
- If stock is available, decrements the balance and generates a reservation record bound to the user.
- Rolls back immediately on any isolation conflicts or insufficient stock conditions.

### 3. TTL Expiry & Reclamation (10-Minute Hold)
Reservations are flagged with a 10-minute expiration timestamp. 
- During checkout, the user has a visual timer countdown representing the allocation hold.
- If checkout is completed, the status is updated to `CONFIRMED`.
- If the reservation times out, an automated background cron job releases the locked stock, returning it to the catalog.

---

## 🚀 Technology Stack

- **Framework:** Next.js (App Router, Turbopack compiler)
- **Database ORM:** Prisma with PostgreSQL (Supabase)
- **Cache & Locks:** Redis (Upstash)
- **Authentication:** NextAuth.js (Google OAuth login)
- **Styling:** Tailwind CSS v4

---

## 🎨 Design Philosophy

The interface follows a developer-centric, minimalist design system inspired by Stripe, Vercel, and Linear:
- **Matte Base**: A strict `#09090b` (Zinc-950) slate canvas overlayed with a subtle monospace coordinate grid.
- **Zero Glows**: No rainbow gradients, neon glowing overlays, or flashy visual sweeps.
- **Crisp Spacing**: High-density elements lined with clean 1px borders (`border-white/10`) and flat selection states.
- **Structured Checkout**: An Apple Card-style matte black payment layout and clean forms for simulated transactions.

---

## 💻 Local Setup & Development

### Prerequisites
- A PostgreSQL database instance (e.g., Supabase)
- A Redis instance (e.g., Upstash)
- Google Cloud Console API credentials (for OAuth redirect)

### Steps

1. **Clone and Install:**
   ```bash
   git clone https://github.com/pragadeeshwaran7/allo-health.git
   cd allo-inventory
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://..."
   REDIS_URL="rediss://..."
   RESERVATION_EXPIRY_MINUTES="10"
   
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-32-character-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **Database Migration:**
   ```bash
   npx prisma db push
   ```

4. **Run Dev Server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view it locally.
