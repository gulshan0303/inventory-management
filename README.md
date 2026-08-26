# Inventory Management System

A production-quality Inventory Management System built with **Node.js + Express** (backend), **Next.js** (frontend), **PostgreSQL** (persistence), and **Apache Kafka / Redpanda** (event ingestion). The system ingests purchase and sale events from a Kafka topic (`inventory-events`), applies a strict **First-In First-Out (FIFO)** costing algorithm to calculate the exact cost of each sale, and presents live inventory metrics on a secured dashboard.

---

## 🔗 Deployment

| Layer | URL |
|---|---|
| **Frontend** | `https://inventory-management-iota-seven.vercel.app` |
| **Backend API** | `http://52.65.223.73:3001` |
| **API Documentation** | `http://52.65.223.73:3001/api-docs` |

### Demo Credentials

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `admin123` |

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Architecture](#3-architecture)
4. [FIFO Costing — How It Works](#4-fifo-costing--how-it-works)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Kafka Producer — Local Setup](#7-kafka-producer--local-setup)
8. [Environment Variables](#8-environment-variables)
9. [Local Development Setup](#9-local-development-setup)
10. [Testing](#10-testing)
11. [Project Structure](#11-project-structure)

---

## 1. Project Overview

Traditional inventory management tools track only stock counts. This system goes further by tracking the **exact cost** of inventory using FIFO costing — a standard accounting requirement for businesses where the cost of goods varies between purchase batches.

**What the system does:**

- **Purchase events** are published to Kafka. The consumer creates a new inventory batch, recording the quantity and unit price.
- **Sale events** are published to Kafka. The consumer applies the FIFO algorithm: it consumes the **oldest available batches first** (sorted by `purchased_at ASC`), calculates the precise total cost of the sale across one or more batches, and records each batch allocation.
- The **dashboard** shows real-time inventory levels, total inventory value, average cost per unit, and a full transaction ledger.
- Every Kafka event is tracked through its full lifecycle: `PUBLISHED → CONSUMED → VALIDATED → FIFO_PROCESSED → DATABASE_COMMITTED`.

---

## 2. Key Features

| Feature | Status |
|---|---|
| FIFO inventory costing (exact cost calculation) | ✅ |
| Kafka event ingestion (topic: `inventory-events`) | ✅ |
| Purchase event processing | ✅ |
| Sale event processing | ✅ |
| Inventory batch tracking | ✅ |
| Sale allocation tracking (which batches were consumed) | ✅ |
| Product stock overview (quantity, total cost, avg cost) | ✅ |
| Transaction ledger with pagination | ✅ |
| Live dashboard updates (polling every 5 seconds) | ✅ |
| JWT-based login / authentication | ✅ |
| Automated Kafka batch simulator (`npm run simulator`) | ✅ |
| In-dashboard automated FIFO scenario runner (5 scenarios) | ✅ |
| Manual single-event simulator (via dashboard form) | ✅ |
| FIFO breakdown modal per sale transaction | ✅ |
| Kafka event processing status tracker (per event) | ✅ |
| API / Database / Kafka system health card | ✅ |
| Idempotent event processing (duplicate event guard) | ✅ |
| CSV export of full transaction ledger | ✅ |
| Swagger / OpenAPI documentation (`/api-docs`) | ✅ |
| Docker Compose infrastructure (PostgreSQL + Redpanda) | ✅ |
| Concurrency protection (`FOR UPDATE` row-level locks) | ✅ |
| Atomic transactions with rollback on failure | ✅ |
| Insufficient inventory error handling | ✅ |

---

## 3. Architecture

```mermaid
flowchart TD
    U([Browser / User]) -->|HTTPS| FE[Next.js Frontend\nport 3000]
    FE -->|REST API + JWT| BE[Node.js + Express\nport 3001]

    BE -->|SELECT / INSERT| DB[(PostgreSQL\nport 5433)]
    BE -->|Produce messages| K[Kafka / Redpanda\nport 9092\ntopic: inventory-events]

    SIM[Kafka Simulator Script\nnpm run simulator] -->|Produce messages| K

    K -->|Consume messages| CON[Kafka Consumer\ninside Express process]
    CON -->|Validate schema| VAL{Valid?}
    VAL -- No --> ERR[Log FAILED status\nto event_status table]
    VAL -- Yes --> FIFO[FifoEngine.processSale\nor processPurchase]
    FIFO -->|Atomic BEGIN / COMMIT| DB
    FIFO -->|Update steps| ES[(event_status table)]

    BE -->|GET /api/health| HLT[Health Check\nDB + Kafka ping]
```

**Request flow for a sale event:**

1. Frontend (or simulator) calls `POST /api/transactions` with `event_type: "sale"`.
2. Backend publishes a JSON message to `inventory-events` Kafka topic and returns the `event_id`.
3. Kafka consumer picks up the message, validates it with Zod, then calls `InventoryService.processSale()`.
4. The service opens a PostgreSQL transaction, fetches available batches with `FOR UPDATE`, runs `FifoEngine.processSale()`, persists results, and commits.
5. Event status steps are updated at each stage to `SUCCESS` or `FAILED`.
6. Frontend polls `GET /api/events/:eventId/status` to display live progress.

---

## 4. FIFO Costing — How It Works

**First-In First-Out (FIFO)** is an inventory costing method where the cost of goods sold is determined by the cost of the **oldest (earliest purchased) inventory batches**.

### Purchase

When a purchase event is processed, a new row is inserted into `inventory_batches` with:
- `product_id`, `original_quantity`, `remaining_quantity`, `unit_price`, `purchased_at`

### Sale

When a sale event is processed, the FIFO engine:

1. Fetches all available batches for the product, sorted by `purchased_at ASC` (oldest first), with `FOR UPDATE` to prevent concurrent modification.
2. Iterates through batches in order. For each batch, it takes `min(batch.remaining_quantity, remaining_to_sell)` units.
3. Calculates the cost contribution of each batch: `quantity_from_batch × unit_price`.
4. Sums all batch costs to get `total_sale_cost`.
5. Persists each batch allocation to `sale_allocations` and decrements `remaining_quantity` on each consumed batch.
6. If total available inventory is less than the sale quantity, throws `InsufficientInventoryError` and rolls back the entire transaction.

### Example

| Batch | Purchased At | Qty | Unit Price |
|---|---|---|---|
| A | Day 1 | 50 | $100 |
| B | Day 2 | 30 | $120 |

**Sale of 60 units (FIFO result):**
- 50 units from Batch A → 50 × $100 = **$5,000**
- 10 units from Batch B → 10 × $120 = **$1,200**
- **Total FIFO cost = $6,200** (Batch A exhausted, Batch B has 20 remaining)

**Precision:** All monetary calculations use the [`big.js`](https://github.com/MikeMcl/big.js/) library for arbitrary-precision decimal arithmetic — no floating-point rounding errors.

---

## 5. Database Schema

Three migrations create the full schema:

### `products`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `product_id` | VARCHAR(50) | Unique business key (e.g. `PRD001`) |
| `name` | VARCHAR(255) | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `inventory_batches`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `product_id` | VARCHAR(50) FK → `products` | |
| `original_quantity` | INTEGER | Quantity at time of purchase |
| `remaining_quantity` | INTEGER | Decremented as sales consume it |
| `unit_price` | NUMERIC(15,4) | Purchase cost per unit |
| `purchased_at` | TIMESTAMPTZ | Determines FIFO order |

### `sales`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `product_id` | VARCHAR(50) FK → `products` | |
| `quantity` | INTEGER | |
| `total_cost` | NUMERIC(15,4) | FIFO-calculated sale cost |
| `sold_at` | TIMESTAMPTZ | |

### `sale_allocations`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `sale_id` | UUID FK → `sales(id)` | CASCADE delete |
| `batch_id` | UUID FK → `inventory_batches(id)` | |
| `quantity` | INTEGER | Units consumed from this batch |
| `unit_cost` | NUMERIC(15,4) | Unit price of the batch |
| `total_cost` | NUMERIC(15,4) | `quantity × unit_cost` |

### `processed_events`
Idempotency table — prevents duplicate Kafka message processing.

| Column | Type |
|---|---|
| `event_id` | UUID PK |
| `processed_at` | TIMESTAMPTZ |

### `event_status`
Tracks Kafka event lifecycle per event ID.

| Column | Type | Notes |
|---|---|---|
| `event_id` | UUID PK | |
| `status` | VARCHAR(20) | `PENDING \| PROCESSING \| SUCCESS \| FAILED` |
| `event_type` | VARCHAR(20) | `purchase \| sale` |
| `product_id` | VARCHAR(50) | |
| `quantity` | INTEGER | |
| `unit_price` | NUMERIC(15,4) | Nullable (sales have no unit_price) |
| `steps` | JSONB | Array of `{name, status, error?}` |
| `error_message` | TEXT | Populated on failure |

---

## 6. API Reference

Interactive documentation: **`<BACKEND_URL>/api-docs`** (Swagger UI)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Obtain JWT token |
| `GET` | `/api/inventory` | JWT | Product stock overview (qty, cost, avg) |
| `GET` | `/api/inventory/:productId` | JWT | Single product inventory metrics |
| `GET` | `/api/products` | JWT | List all products |
| `GET` | `/api/transactions` | JWT | Paginated transaction ledger |
| `POST` | `/api/transactions` | JWT | Publish purchase or sale event to Kafka |
| `GET` | `/api/transactions/:id` | JWT | FIFO batch breakdown for a sale |
| `GET` | `/api/events/:eventId/status` | JWT | Kafka event lifecycle status |
| `POST` | `/api/simulate-batch` | JWT | Trigger the full 7-event batch simulator |
| `POST` | `/api/simulate-scenario` | JWT | Run a predefined FIFO test scenario (1–5) |
| `POST` | `/api/reset` | JWT | Truncate all inventory data |
| `GET` | `/api/health` | — | System health (API + DB + Kafka) |
| `GET` | `/api-docs` | — | Swagger UI |
| `GET` | `/api-docs/swagger.json` | — | Raw OpenAPI 3.0 specification |

### How to Use Swagger UI

1. Open your browser and navigate to `<BACKEND_URL>/api-docs` (e.g., `http://localhost:3001/api-docs` locally).
2. Most endpoints require authentication. To get access:
   - Scroll down to the `POST /api/auth/login` endpoint.
   - Click **Try it out** and enter the demo credentials (`{"username": "admin", "password": "admin123"}`).
   - Click **Execute** and copy the `token` string from the Response body.
3. Scroll to the very top of the page and click the green **Authorize** button.
4. Type `Bearer ` followed by a space and paste your token (e.g., `Bearer eyJhbG...`).
5. Click **Authorize** and then **Close**. You can now test any protected endpoint by clicking **Try it out**!

### Event Payload (Kafka / `POST /api/transactions`)

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "product_id": "PRD001",
  "event_type": "purchase",
  "quantity": 50,
  "unit_price": 100.00,
  "timestamp": "2026-08-25T10:00:00.000Z"
}
```

For a sale, omit `unit_price`.

---

## 7. Kafka Producer — Local Setup

> **Assignment requirement:** This section explains exactly how to run the Kafka producer locally.

The simulator script is at `scripts/kafka-simulator/index.ts`. It uses the same `getKafkaProducer()` used by the backend and publishes 7 events (purchases and sales across PRD001 and PRD002) to the `inventory-events` topic, with a 1-second delay between each event to simulate real traffic.

### Prerequisites

- Docker infrastructure must be running (see [Step 1 of Local Setup](#9-local-development-setup))
- Backend dependencies must be installed

### Run the Kafka Simulator

```bash
# From the backend directory
cd backend
npm run simulator
```

This script:
1. Connects to the Kafka broker at `localhost:9092` (Redpanda)
2. Publishes 7 events sequentially to the `inventory-events` topic:
   - Purchase PRD001: 50 qty @ $100
   - Purchase PRD001: 30 qty @ $120
   - Sale PRD001: 60 qty
   - Purchase PRD002: 100 qty @ $80
   - Sale PRD002: 20 qty
   - Purchase PRD001: 40 qty @ $150
   - Sale PRD001: 10 qty
3. The Kafka consumer (running inside the Express server) picks up each event and processes it in real time.

> Watch the dashboard update automatically as events are consumed. The FIFO cost of each sale is calculated and stored atomically.

### In-Dashboard Simulator

The dashboard also provides two built-in simulation options:

- **🚀 Run Scenario** — Runs one of 5 predefined FIFO test scenarios (clean-slate, isolated, with pass/fail report)
- **✍️ Manual Event** — Submit a single purchase or sale event for any product

---

## 8. Environment Variables

Copy `.env.example` to `.env` before starting the backend.

```bash
cp backend/.env.example backend/.env
```

| Variable | Default (from `.env.example`) | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://inventory_user:inventory_password@localhost:5432/inventory_db` | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `inventory-backend` | Kafka client identifier |
| `KAFKA_GROUP_ID` | `inventory-consumer-group` | Consumer group ID |
| `KAFKA_TOPIC` | `inventory-events` | Topic the consumer subscribes to |
| `JWT_SECRET` | `supersecretjwtkey` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiry duration |
| `PORT` | `3001` | Express server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `NODE_ENV` | `development` | `development` or `production` |

> **Note:** The `DATABASE_URL` in `.env.example` uses port `5432`, but `docker-compose.yml` maps PostgreSQL to host port `5433`. Use `5433` in your local `.env`.

---

## 9. Local Development Setup

### Prerequisites

- Node.js v18+
- Docker and Docker Compose

### Step 1 — Start Infrastructure (PostgreSQL + Kafka)

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 15** on `localhost:5433` (database: `inventory_db`, user: `inventory_user`, password: `inventory_password`)
- **Redpanda** (Kafka-compatible) on `localhost:9092`

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env
# Edit .env — change DATABASE_URL port to 5433 if using docker-compose

# Run database migrations (creates all tables)
npm run migrate:up

# Seed initial product data (PRD001, PRD002, PRD003)
npm run seed

# Start the backend server (also starts the Kafka consumer)
npm run dev
```

Backend runs at **http://localhost:3001**

### Step 3 — Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

### Step 4 — Open the Application

Navigate to **http://localhost:3000**

Login with:
- **Username:** `admin`
- **Password:** `admin123`

### Step 5 — Run the Kafka Producer (optional)

Open a third terminal:

```bash
cd backend
npm run simulator
```

Watch the dashboard update in real time as purchase and sale events flow through Kafka.

---

## 10. Testing

### Run All Tests

```bash
cd backend
npm test
```

### Test Coverage

| Suite | File | What is tested |
|---|---|---|
| **Unit** | `tests/unit/fifo.engine.test.ts` | FIFO engine: basic FIFO order, multi-batch sales, exact batch consumption, insufficient inventory error, precision arithmetic |
| **Integration** | `tests/integration/enhancements.test.ts` | Health check endpoint, FIFO breakdown endpoint, event status tracking, scenario simulation, 404/400 error cases |

### Build Verification

```bash
# Backend TypeScript compile check
cd backend && npm run build

# Frontend Next.js production build
cd frontend && npm run build
```

---

## 11. Project Structure

```
inventory-management/
├── docker-compose.yml          # PostgreSQL + Redpanda (Kafka) infrastructure
├── REQUIREMENTS.md             # Assignment traceability matrix
│
├── scripts/
│   └── kafka-simulator/
│       └── index.ts            # Standalone Kafka producer script (npm run simulator)
│
├── backend/
│   ├── .env.example            # Environment variable template
│   ├── migrations/             # node-pg-migrate database migrations
│   │   ├── *_initial-schema.js           # products, inventory_batches, sales, sale_allocations
│   │   ├── *_add-idempotency-table.js    # processed_events (duplicate guard)
│   │   └── *_add-event-status.js        # event_status (Kafka lifecycle tracking)
│   ├── seeds/                  # Database seed scripts
│   ├── src/
│   │   ├── server.ts           # Express app entry, routes, Swagger, health endpoint
│   │   ├── config/
│   │   │   ├── db.ts           # PostgreSQL pool
│   │   │   └── swagger.json    # OpenAPI 3.0 specification
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── inventory.controller.ts   # All business endpoints + scenarios
│   │   ├── kafka/
│   │   │   ├── producer/index.ts         # KafkaJS producer
│   │   │   └── consumer/index.ts         # Message consumption + status tracking
│   │   ├── services/
│   │   │   ├── fifo.engine.ts            # Pure FIFO cost calculation
│   │   │   └── inventory.service.ts      # Transactional purchase/sale processing
│   │   ├── repositories/
│   │   │   ├── inventory.repository.ts   # Batch CRUD + FOR UPDATE lock
│   │   │   ├── sales.repository.ts       # Sales + allocations CRUD
│   │   │   ├── event.repository.ts       # event_status table CRUD
│   │   │   ├── idempotency.repository.ts # Duplicate event guard
│   │   │   └── query.repository.ts       # Inventory overview queries
│   │   ├── middleware/
│   │   │   ├── auth.ts                   # JWT verification
│   │   │   └── errorHandler.ts           # Centralized error handling
│   │   ├── validators/
│   │   │   └── kafkaEvents.ts            # Zod schema for Kafka message validation
│   │   └── errors/
│   │       └── applicationErrors.ts      # Custom error classes
│   └── tests/
│       ├── unit/fifo.engine.test.ts
│       └── integration/enhancements.test.ts
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx              # Root redirect to /login
    │   │   ├── login/page.tsx        # Login page
    │   │   └── dashboard/page.tsx    # Main protected dashboard
    │   ├── components/
    │   │   ├── AddTransactionForm.tsx    # Automated + manual simulator panel
    │   │   ├── DashboardHeader.tsx       # Top navigation bar
    │   │   ├── EventStatusTracker.tsx    # Kafka event lifecycle visualizer
    │   │   ├── FifoBreakdownModal.tsx    # Sale FIFO batch allocation modal
    │   │   ├── InventoryOverview.tsx     # Product cards (stock, cost, avg)
    │   │   ├── LoginForm.tsx             # Login form
    │   │   ├── SystemHealthCard.tsx      # API/DB/Kafka health display
    │   │   ├── TransactionLedger.tsx     # Paginated ledger + CSV export
    │   │   ├── LoadingState.tsx
    │   │   └── ErrorState.tsx
    │   ├── hooks/
    │   │   └── usePolling.ts             # Generic polling hook (5s intervals)
    │   └── lib/
    │       └── api.ts                    # fetchApi wrapper with JWT headers
    └── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL 15, `pg` driver, `node-pg-migrate` |
| **Messaging** | Apache Kafka protocol via KafkaJS, Redpanda (Docker) |
| **Validation** | Zod (API + Kafka message schemas) |
| **Auth** | JWT (`jsonwebtoken`) |
| **Precision Math** | `big.js` (no floating-point errors in FIFO cost) |
| **Testing** | Jest, ts-jest |
| **API Docs** | Swagger UI (OpenAPI 3.0) |
| **Infrastructure** | Docker Compose |

## 12. Assignment Requirements Checklist

### Assignment Objective
- [x] Build a fully working Inventory Management Tool using FIFO costing method.
- [x] Inventory data flows through Kafka.
- [x] Backend stores data with FIFO logic.
- [x] Frontend shows real-time updates.

### Required Tech Stack
- [x] **Backend:** Node.js (Express.js) & TypeScript
- [x] **Database:** PostgreSQL
- [x] **Messaging:** Apache Kafka
- [x] **Frontend:** React / Next.js

### Required Functionality
- [x] **Kafka Integration:** Created inventory-events topic, Producer publishes events, Consumer processes events on boot.
- [x] **Database Models:** Implemented Products, Inventory Batches (purchases), Sales, and Allocations tables.
- [x] **FIFO Logic:** On purchase, create batch. On sale, consume oldest batches first. Exact cost calculated and persisted.
- [x] **Frontend UI:** Product Stock Overview (Qty, Cost, Avg Cost) and Transaction Ledger (time-series with FIFO cost).
- [x] **Live Updates:** Dashboard auto-updates via real-time fetching.
- [x] **Login Page:** Basic Auth with JWT implemented (Credentials: dmin / dmin123).

### Deliverables Included
- [x] **GitHub Repository:** Codebase structured and pushed.
- [x] **Kafka Simulator:** 
pm run simulator script included to publish dummy events and test the pipeline.
- [x] **README.md:** Comprehensive documentation, local setup guide, and detailed FIFO logic explanation.
