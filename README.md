# Allo Inventory

Hey there! 👋 Welcome to Allo Inventory. https://allo-health-chi.vercel.app/

I built this project to solve a very specific, yet incredibly common problem in e-commerce: **inventory race conditions**. You know that frustrating moment when you add the last item to your cart, go to checkout, and someone else buys it before you finish paying? Yeah, I hate that too.

This app is a production-grade inventory reservation system that handles high-traffic checkouts gracefully. It locks items for users while they check out, ensuring that if it says "in stock," it actually is.

## 🚀 The Tech Stack

I wanted to keep the stack modern, fast, and scalable:

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS (with some custom glassmorphism effects)
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Prisma
- **Auth:** NextAuth.js (Auth.js) via Google OAuth
- **Distributed Locking:** Redis (Upstash)

## 💡 How It Actually Works

The biggest challenge here was making sure two users can't grab the exact same item at the same millisecond. Here is how the system handles it:

1. **Authentication:** Users have to log in via Google. No anonymous hoarding allowed.
2. **The Distributed Lock:** When a user clicks "Reserve", the backend immediately requests a Redis lock. If another request comes in at the exact same time, Redis acts as the bouncer and queues them up.
3. **Serializable Transactions:** Once past Redis, Prisma opens a `Serializable` transaction with Postgres. It double-checks the stock count, decrements the available stock, and creates a reservation tied to the user.
4. **The 10-Minute Window:** The user gets exactly 10 minutes to finish their checkout.
5. **Lazy Cleanup:** If they bail or time out, a background job automatically wipes the expired reservation and puts the item back on the virtual shelf for the next person.

## 🛠️ Running It Locally

If you want to spin this up on your own machine, you'll need a few things:

1. A PostgreSQL database (I recommend Supabase).
2. A Redis instance (Upstash has a great free tier).
3. A Google Cloud project (for the OAuth Client ID and Secret).

### Setup Steps:

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory and add your keys:
   ```env
   DATABASE_URL="your-postgres-url"
   REDIS_URL="your-redis-url"
   RESERVATION_EXPIRY_MINUTES="10"
   
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-random-string-here"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. Push the database schema:
   ```bash
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎨 Design Philosophy

I really didn't want this to look like another generic dashboard. I spent extra time on the UI to give it a premium, "Next-Gen" feel. It uses a dark mode base, subtle glowing gradients, and CSS glassmorphism to make the interactive elements pop. I also ensured the layout is completely responsive and perfectly centered, even on ultrawide monitors.

## 🔮 What's Next?

If I had more time, I'd love to wire up WebSockets so that when one user reserves an item, everyone else sees the stock counter tick down in real-time without refreshing. I'd also hook up the actual Stripe payment gateway to finalize the reservation loop.

---

Thanks for checking out the project! Feel free to poke around the source code or reach out if you have any questions about the architecture.
