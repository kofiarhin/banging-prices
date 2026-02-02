# Banging Prices

A real-time fashion price intelligence platform.

Banging Prices continuously crawls online retailers, normalises product data, and tracks **verified price drops** over time — surfacing only genuine discounts, not artificial markdowns or affiliate-driven noise.

The system is designed to answer one question reliably:

> What products have actually dropped in price right now?

---

## Core Features

- Real-time price tracking across multiple retailers
- Verified discount detection based on historical prices
- Canonical product tracking (same item, same identity)
- Category and gender-based browsing
- Sorting by biggest price drop, newest, or price
- Product tracking and alerts (price, percentage, stock)
- Direct click-through to retailer product pages

---

## How It Works

### 1. Retailer Crawlers

- Each retailer is handled by a dedicated crawler
- Crawlers target category- and gender-specific entry points
- Pagination and depth are tightly controlled
- Crawling is scheduled and repeatable

---

### 2. Product Normalisation

All scraped data is converted into a single canonical format:

- Product URL
- Title
- Current price
- Original price
- Currency
- Images
- Category
- Gender
- Stock status

A **canonical key** uniquely identifies the same product across crawls, ensuring consistent tracking over time.

---

### 3. Price Drop Verification

- Current prices are compared against previously stored values
- Discount percentages are calculated dynamically
- Only real reductions are surfaced
- No client-side discount logic

---

### 4. Database Persistence

- Products are upserted using their canonical key
- Records update automatically when:
  - Price changes
  - Stock status changes
  - Metadata changes
- Each product is refreshed with a `lastSeenAt` timestamp

---

## Stack

- **Client:** React (Vite) + SCSS
- **Server:** Node.js + Express
- **Database:** MongoDB (Mongoose)
- **Crawling:** Crawlee + Playwright

---

## Monorepo Structure

```txt
banging-prices/
  client/      # Vite React app
  server/      # Express API
  scripts/     # Crawlers and smoke tests
  data/        # Optional local datasets
  storage/     # Optional local storage
```

---

## Environment Variables

### Client (Vite)

Create `client/.env`:

```bash
VITE_API_URL=http://localhost:5000
```

Production:

```bash
VITE_API_URL=https://api.your-domain.com
```

---

### Server (Express)

Create `.env` in the project root:

```bash
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
```

---

## Local Development

### Install dependencies

```bash
npm install
```

### Start the API

```bash
npm run server
```

### Start the client

```bash
npm run client
```

- Client → http://localhost:4000
- API → http://localhost:5000

---

## API Overview

### Health

- `GET /`
- `GET /health`

---

### Products

```http
GET /api/products
GET /api/products/:id
```

Query parameters:

- `search`
- `gender`
- `category`
- `sort`
- `page`
- `limit`

---

### Tracking

```http
POST /api/track
```

```json
{
  "productId": "product_id",
  "type": "price | percent | stock",
  "value": 25
}
```

---

## Sorting Logic

- `discount-desc` (default) – biggest verified drops first
- `price-asc`
- `price-desc`
- `newest`

---

## Design Principles

- Scrape first, verify second
- Canonical identity over raw listings
- Server-side price logic only
- No affiliate manipulation
- No fake discounts

If the price didn’t actually drop, it doesn’t appear.

---

## Notes

- Crawling is source-specific, not generic
- `.env` files are never committed
- Production uses platform environment variables only
- Data accuracy is prioritised over volume
