# Requirements Traceability Matrix

## Kafka
* [x] Kafka integration — KafkaJS with Redpanda (Docker)
* [x] Topic `inventory-events` — consumer subscribes, producer publishes to this topic
* [x] Producer — `backend/src/kafka/producer/index.ts` + `scripts/kafka-simulator/index.ts`
* [x] Consumer — `backend/src/kafka/consumer/index.ts`, started on server boot
* [x] Purchase event — processed via `InventoryService.processPurchase()`
* [x] Sale event — processed via `InventoryService.processSale()` with FIFO engine
* [x] Event validation — Zod schema validation in consumer (`kafkaEvents.ts`)
* [x] Kafka error handling — try/catch with status update to `event_status` table
* [x] Duplicate event handling — idempotency guard via `processed_events` table

## Database
* [x] Products — `products` table (migration: `initial-schema`)
* [x] Inventory batches — `inventory_batches` table with `remaining_quantity`
* [x] Sales — `sales` table with `total_cost` (FIFO-calculated)
* [x] Sale allocations — `sale_allocations` table linking sale → batch
* [x] Foreign keys — `product_id` FK on batches/sales, `sale_id`/`batch_id` FK on allocations
* [x] Constraints — `CHECK` on quantities > 0, remaining_quantity >= 0, unit_price > 0
* [x] Indexes — on `product_id`, `purchased_at`, `remaining_quantity`, `sold_at`, `sale_id`, `batch_id`
* [x] Migrations — `node-pg-migrate` (3 migrations: initial schema, idempotency, event status)
* [x] Seed data — `npm run seed` inserts PRD001, PRD002, PRD003

## FIFO
* [x] Purchase creates batch — `InventoryRepository.createBatch()` inserts into `inventory_batches`
* [x] Oldest batch consumed first — `ORDER BY purchased_at ASC, id ASC` in batch query
* [x] Multi-batch sale — `FifoEngine.processSale()` iterates across multiple batches
* [x] Partial batch consumption — `min(batch.remaining_quantity, remaining_to_sell)` per batch
* [x] Exact cost calculation — `big.js` used for arbitrary-precision arithmetic
* [x] Remaining quantities — `remaining_quantity` decremented and persisted per batch
* [x] Insufficient inventory handling — `InsufficientInventoryError` thrown, transaction rolled back
* [x] Atomic transaction — `BEGIN / COMMIT / ROLLBACK` wraps the entire sale operation
* [x] Concurrency protection — `SELECT ... FOR UPDATE` row-level locks on batches

## Backend
* [x] Express — Express 5 with TypeScript
* [x] REST APIs — auth, inventory, transactions, events, health, simulate, docs
* [x] Validation — Zod for both HTTP request bodies and Kafka message schemas
* [x] Centralized errors — `errorHandler.ts` middleware, custom `ApplicationError` classes
* [x] Authentication — JWT-based (`jsonwebtoken`), `authMiddleware` on all protected routes
* [x] Health check — `GET /api/health` checks PostgreSQL (`SELECT 1`) and Kafka admin connectivity
* [x] Logging — `console.log/error` at key lifecycle points in consumer and controller

## Frontend
* [x] Next.js — Next.js 16 (App Router), React 19, TypeScript
* [x] Login — `LoginForm.tsx`, JWT stored in localStorage, redirect on success
* [x] Protected dashboard — `useAuth` hook checks token, redirects to `/login` if missing
* [x] Product stock overview — `InventoryOverview.tsx` shows all products as cards
* [x] Current quantity — displayed per product card
* [x] Total inventory cost — displayed per product card
* [x] Average cost per unit — displayed per product card
* [x] Transaction ledger — `TransactionLedger.tsx` with pagination, polls every 5s
* [x] FIFO sale cost — `total_cost` column in ledger, FIFO breakdown modal per sale
* [x] Live updates — `usePolling` hook polls inventory and transactions every 5 seconds
* [x] Loading states — `LoadingState.tsx` component used across all data-fetching components
* [x] Empty states — inline empty-state messages when no data is returned
* [x] Error states — `ErrorState.tsx` component with retry button

## Testing
* [x] FIFO unit tests — `tests/unit/fifo.engine.test.ts` (basic FIFO, multi-batch, exact consumption, insufficient stock, precision)
* [x] Backend integration tests — `tests/integration/enhancements.test.ts` (health, breakdown, event status, scenarios)
* [x] API tests — covered in integration test suite (endpoint response codes and payloads)
* [ ] Kafka tests — test folder exists (`tests/kafka/`) but no tests written
* [ ] Authentication tests — not implemented
* [ ] Frontend tests — not implemented
* [x] Failure/rollback tests — insufficient inventory case covered in unit + integration tests
* [x] Duplicate event tests — idempotency covered in integration test suite

## Deployment
* [ ] Frontend deployed
* [ ] Backend deployed
* [ ] Database deployed
* [ ] Kafka deployed/configured
* [ ] Environment variables configured
* [ ] End-to-end verification
* [ ] Public frontend URL
* [ ] Public backend URL
* [x] Credentials — Username: `admin`, Password: `admin123` (documented in README)

## Documentation
* [x] README — comprehensive `README.md` at repo root
* [x] FIFO explanation — Section 4 of README with algorithm walkthrough and example
* [x] Kafka explanation — Section 7 (Kafka Producer) + Architecture diagram in README
* [x] Producer setup — Section 7 of README: exact command `npm run simulator` with step-by-step
* [x] Local setup — Section 9 of README: full 5-step local development guide
* [ ] Deployment information — pending (deployment not done yet)
* [ ] Links — pending (deployment URLs not yet available)

---

# Assignment Compliance Audit

### Assignment Objective
* [x] FIFO inventory management system
* [x] Kafka real-time ingestion
* [x] PostgreSQL persistence
* [x] Frontend dashboard
* [ ] End-to-end deployment — pending

### Required Stack
* [x] Node.js + Express.js
* [x] PostgreSQL
* [x] Kafka — Redpanda (Kafka-compatible, same protocol)
* [x] Next.js/React frontend

### Required Functionality
* [x] `inventory-events` — Kafka topic used by both producer and consumer
* [x] Kafka consumer — running inside Express server, starts on boot
* [x] Purchase event — creates inventory batch with unit price and quantity
* [x] Sale event — applies FIFO algorithm, persists allocations and sale cost
* [x] Products table — `products` with unique `product_id`
* [x] Inventory batches — `inventory_batches` with FIFO ordering
* [x] Sales — `sales` + `sale_allocations` for full cost traceability
* [x] FIFO — strict oldest-first consumption with `big.js` precision
* [x] Exact sale cost — computed and stored as `total_cost` in `sales` table
* [x] Product stock overview — dashboard cards with qty, total cost, avg cost
* [x] Transaction ledger — paginated, live-updating, with CSV export
* [x] Live updates — 5-second polling on inventory and transaction data
* [x] Login page — JWT-secured, credential validation, redirect flow

### Required Deliverables
* [ ] Frontend URL — pending deployment
* [ ] Backend URL — pending deployment
* [x] Credentials — `admin` / `admin123`
* [ ] GitHub repository — push pending
* [x] Kafka simulator — `npm run simulator` (scripts/kafka-simulator/index.ts)
* [x] README — complete and production-quality
* [x] FIFO explanation — in README Section 4
* [x] Producer local instructions — in README Section 7
