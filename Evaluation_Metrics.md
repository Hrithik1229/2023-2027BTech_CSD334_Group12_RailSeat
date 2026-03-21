# 📊 RailSeat — Technical Evaluation Metrics Framework

> **Version:** 1.0.0  
> **Last Updated:** 2026-03-21  
> **System:** RailSeat Train Booking System (Express + Sequelize + PostgreSQL)

---

## Table of Contents

1. [Performance Metrics](#1-performance-metrics)
2. [Reliability Metrics](#2-reliability-metrics)
3. [Accuracy Metrics (Core)](#3-accuracy-metrics-core)
4. [Scalability Metrics](#4-scalability-metrics)
5. [User Experience (UX) Metrics](#5-user-experience-ux-metrics)
6. [Security Metrics](#6-security-metrics)
7. [Database Metrics](#7-database-metrics)
8. [Data Consistency Rate](#8-data-consistency-rate)
9. [Running the Scripts](#9-running-the-scripts)
10. [CI/CD Automation Guide](#10-cicd-automation-guide)

---

## 1. Performance Metrics

These metrics evaluate the **speed and throughput** of the RailSeat API under normal operating conditions.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 1.1 | **Average Response Time** | `Sum(response_time_ms) / Total_Requests` | k6, Postman, `metricsCollector.js` | **< 200ms** (avg), **< 500ms** (p95) | `middleware/metricsCollector.js` → `GET /api/metrics` |
| 1.2 | **Throughput** | `Total_Requests / Time_Window_Seconds` | k6, `metricsCollector.js` | **> 50 req/sec** | Rolling 60s window in middleware |
| 1.3 | **P95 Response Time** | 95th percentile of sorted response times | k6, Chrome DevTools → Network Tab | **< 500ms** | k6 summary, `loadTest.k6.js` |
| 1.4 | **P99 Response Time** | 99th percentile of sorted response times | k6 | **< 1000ms** | k6 summary |
| 1.5 | **Time to First Byte (TTFB)** | `(Response Start) - (Request Sent)` | Chrome DevTools, Lighthouse | **< 100ms** (local), **< 300ms** (prod) | Manual via DevTools |

### Key Endpoints Monitored

| Endpoint | Description | Response Time Target |
|----------|-------------|---------------------|
| `GET /api/trains/search` | Train search with station matching | < 300ms |
| `GET /api/trains/:id/availability` | Seat availability with overlap check | < 200ms |
| `POST /api/bookings` | Create booking with seat locking | < 400ms |
| `GET /api/trains/stations/search` | Station typeahead (autocomplete) | < 100ms |
| `GET /api/health` | Health check endpoint | < 50ms |

---

## 2. Reliability Metrics

These metrics track the **stability and error resilience** of the system.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 2.1 | **Failure Rate** | `((HTTP_4xx + HTTP_5xx) / Total_Requests) × 100` | `reliabilityLogger.js`, Postman, k6 | **< 2%** | `middleware/reliabilityLogger.js` → `GET /api/reliability` |
| 2.2 | **Server Error Rate** | `(HTTP_5xx / Total_Requests) × 100` | `reliabilityLogger.js`, server logs | **< 0.5%** | Hourly bucketing in logger |
| 2.3 | **Uptime** | `(Total_Time - Downtime) / Total_Time × 100` | UptimeRobot, `/api/health` polling | **≥ 99.9%** | Health endpoint cron |
| 2.4 | **Mean Time to Recovery (MTTR)** | `Avg(Recovery_Time - Failure_Time)` | Incident logs, alerts | **< 30 min** | Manual tracking |
| 2.5 | **Error Body Capture** | First 500 chars of error response body | `reliabilityLogger.js` | Captured for all 4xx/5xx | Error JSONL log file |

### Alert Thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Failure Rate > 5% in any hour | **ALERT** | Slack notification + investigation |
| 5xx Rate > 1% sustained | **CRITICAL** | Page on-call engineer |
| Health endpoint returns non-200 | **ALERT** | Auto-restart via PM2 |

### Error Log Location

```
backend/logs/errors.jsonl          ← Per-error detailed log
backend/logs/hourly_stats.jsonl    ← Hourly aggregated stats
```

---

## 3. Accuracy Metrics (Core)

These metrics validate the **correctness of seat allocation** — the core business logic of RailSeat.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 3.1 | **Seat Allocation Accuracy** | `(Correct_Allocations / Total_Allocations) × 100` | `validateSeatAccuracy.js`, PostgreSQL | **≥ 99.5%** | `scripts/validateSeatAccuracy.js` |
| 3.2 | **Berth Type Match Rate** | Per coach type: `Correct / Total × 100` | `validateSeatAccuracy.js` | **100%** per type | Breakdown in script output |
| 3.3 | **GEN Sentinel Validity** | GEN bookings reference `seat_number=0` sentinel | `validateSeatAccuracy.js` | **100%** | Automatic in accuracy check |
| 3.4 | **Fare Calculation Accuracy** | `(Correct_Fares / Total_Fares) × 100` | Manual spot-check vs fare rules | **100%** | `fareCalculator.service.js` + manual |

### Validation Logic (Seat Allocation)

The `validateSeatAccuracy.js` script mirrors the seat generation layout from `train.controller.js → createCoach()`:

```
Coach Type    Seats/Row   Layout Pattern
──────────    ─────────   ──────────────────────────────
SL, 3E        8           LB → MB → UB → LB → MB → UB → SL → SU
1A, 2A, 3A    6           LB → UB → LB → UB → SL → SU
CC, 2S        5           WS → MS → AS → MS → WS
GEN           1 sentinel  seat_number=0, berth_type='LB'
ENG, PCL      0           Non-passenger (no seats)
```

For each passenger record, the script:
1. Looks up the `Passenger → Seat → Coach` chain
2. Computes the **expected** `berth_type` from `(coach_type, seat_number)`
3. Compares against the **actual** `berth_type` stored in the `seats` table
4. Reports matches, mismatches, and per-coach-type breakdown

---

## 4. Scalability Metrics

These metrics evaluate how the system handles **increasing load**.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 4.1 | **Load Response Degradation** | `Avg_Response_Time_at_Peak / Avg_Response_Time_at_Normal` | k6 (staged load test) | **< 3.0×** | `loadTest.k6.js` stages |
| 4.2 | **Max Concurrent Users** | VU count where error rate exceeds 5% | k6 stress test | **≥ 50 VUs** | k6 threshold checks |
| 4.3 | **Throughput at Peak** | `Requests/sec during peak stage` | k6 | **> 30 req/sec** | k6 summary |

### Load Test Stages (k6)

| Stage | Duration | Virtual Users | Purpose |
|-------|----------|---------------|---------|
| Warm-up | 30s | 0 → 10 | Baseline measurement |
| Normal Load | 1m | 10 | Normal operation |
| Ramp to Peak | 30s | 10 → 50 | Gradual stress |
| Peak Load | 1m | 50 | Sustained stress test |
| Spike | 15s | 50 → 100 | Spike/burst test |
| Recovery | 30s | 100 → 10 | Recovery behavior |
| Cool Down | 15s | 10 → 0 | Shutdown |

### Degradation Ratio Calculation

```
degradation_ratio = avg_response_time_at_50VU / avg_response_time_at_10VU

Example:
  Normal (10 VU):  avg = 120ms
  Peak (50 VU):    avg = 280ms
  Ratio:           280 / 120 = 2.33× ✅ (target < 3.0×)
```

---

## 5. User Experience (UX) Metrics

These metrics measure the **end-to-end user journey quality**.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 5.1 | **Avg Booking Time** | `Avg(Ticket_Confirmed_At - Search_Started_At)` | `metricsCollector.js` (booking tracking) | **< 120 seconds** | `trackSearchStart()` / `trackBookingConfirmed()` |
| 5.2 | **Search-to-Selection Time** | `Avg(Seat_Selection_At - Search_At)` | Frontend analytics (custom events) | **< 30 seconds** | Client-side instrumentation |
| 5.3 | **Payment Completion Rate** | `(Successful_Payments / Payment_Initiated) × 100` | Razorpay dashboard, booking logs | **> 85%** | Razorpay webhook logs |
| 5.4 | **Booking Abandonment Rate** | `(Started_Bookings - Completed_Bookings) / Started_Bookings × 100` | `metricsCollector.js` session tracking | **< 30%** | Session timeout analysis |
| 5.5 | **First Contentful Paint (FCP)** | Time to render first DOM content | Lighthouse, Chrome DevTools | **< 1.5s** | Lighthouse audit |
| 5.6 | **Largest Contentful Paint (LCP)** | Time to render largest visible element | Lighthouse, Web Vitals | **< 2.5s** | Lighthouse audit |

### Booking Duration Tracking

The middleware tracks the full booking flow:

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌───────────────┐
│ Search Start │───▶│ Train Results │───▶│ Seat Select  │───▶│ Confirmation  │
│ (trackStart) │    │               │    │              │    │ (trackConfirm)│
└──────────────┘    └───────────────┘    └──────────────┘    └───────────────┘
       │                                                            │
       └────────────── Duration (ms) ──────────────────────────────┘
```

---

## 6. Security Metrics

These metrics evaluate the **security posture** of the system.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 6.1 | **SQL Injection Vulnerability Count** | Count of unparameterized queries | Snyk, `npm audit`, manual review | **0** | `sequelize` parameterized by default |
| 6.2 | **XSS Vulnerability Count** | Count of unescaped user input rendered in HTML | OWASP ZAP, Snyk | **0** | React auto-escapes JSX |
| 6.3 | **Dependency Vulnerabilities** | `npm audit --production` severity counts | `npm audit`, Dependabot, Snyk | **0 critical, 0 high** | CI pipeline |
| 6.4 | **Authentication Coverage** | `(Protected_Endpoints / Total_Endpoints) × 100` | Manual audit, Postman | **≥ 80%** (admin routes: 100%) | Route review |
| 6.5 | **CORS Configuration** | Valid origin whitelist configured | Manual review | No wildcard `*` in prod | `app.js` cors config |
| 6.6 | **Rate Limiting** | Max requests/IP/minute | `express-rate-limit`, nginx config | **≤ 100 req/min/IP** | Middleware config |
| 6.7 | **Password Hashing** | bcrypt rounds ≥ 10 | Code review of `auth.controller.js` | **bcrypt with ≥ 10 rounds** | `bcryptjs` in use |

### Security Audit Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Sequelize parameterized queries | ✅ | ORM prevents raw SQL injection |
| Bcrypt password hashing | ✅ | Via `bcryptjs` |
| React XSS protection | ✅ | JSX auto-escapes |
| CORS configured | ⚠️ | Currently using `cors()` with defaults — restrict in prod |
| Rate limiting | ❌ | Not yet implemented — add `express-rate-limit` |
| HTTPS enforcement | ❌ | Depends on deployment (nginx/load balancer) |
| JWT token expiry | ⚠️ | Review token lifetimes |

---

## 7. Database Metrics

These metrics evaluate **database query performance and efficiency**.

| # | Metric | Formula | Tools Used | Target Benchmark | Script/Location |
|:-:|--------|---------|------------|-----------------|-----------------|
| 7.1 | **Avg Query Execution Time** | `EXPLAIN ANALYZE → Execution Time` avg across runs | `analyzeQueryPerformance.js`, pgAdmin | See per-query targets below | `scripts/analyzeQueryPerformance.js` |
| 7.2 | **Avg Planning Time** | `EXPLAIN ANALYZE → Planning Time` avg | `analyzeQueryPerformance.js` | **< 5ms** | Same script |
| 7.3 | **Slow Query Count** | Count of queries > 100ms in pg_stat_statements | PostgreSQL `pg_stat_statements` | **0 per hour** | PostgreSQL config |
| 7.4 | **Index Hit Rate** | `idx_scan / (idx_scan + seq_scan) × 100` | `pg_stat_user_tables` | **> 95%** | Manual query |
| 7.5 | **Connection Pool Utilization** | `Active_Connections / Pool_Size × 100` | Sequelize pool stats, pgAdmin | **< 80%** | Sequelize config |

### Per-Query Execution Targets

| Query | Description | Target (Execution Time) |
|-------|-------------|------------------------|
| Train Search | Station match → stop → run → train join | **< 50ms** |
| Seat Availability | Overlap-based booking check for a train + date | **< 30ms** |
| Booking Lookup | Full booking with passengers, seats, coaches | **< 20ms** |
| Fare Rule Lookup | Fare rule + seat type pricing join | **< 10ms** |
| User Booking History | All bookings for a user email (with relations) | **< 25ms** |
| Station Typeahead | ILIKE search on station name/code | **< 15ms** |
| Coach + Seat Join | Full seat map data for a train | **< 40ms** |

### Recommended Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_train_date     ON bookings(train_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_passengers_booking      ON passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_passengers_seat         ON passengers(seat_id);
CREATE INDEX IF NOT EXISTS idx_seats_coach             ON seats(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaches_train           ON coaches(train_id);
CREATE INDEX IF NOT EXISTS idx_train_stops_run         ON train_stops(run_id);
CREATE INDEX IF NOT EXISTS idx_train_stops_station     ON train_stops(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email          ON bookings(email);
-- For trigram-based ILIKE searches (requires pg_trgm extension):
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_stations_name_trgm ON stations USING gin (name gin_trgm_ops);
```

---

## 8. Data Consistency Rate

### Overview

The **Data Consistency Rate** measures the percentage of database records that pass structural and logical validation checks. This is critical for a railway booking system where inconsistent data can lead to **double-booking, incorrect fare charges, or invalid seat assignments**.

### Formula

```
Data Consistency Rate (%) = (Records Passing Validation / Total Records Checked) × 100
```

### Validation Checks Performed

| # | Check | What It Validates | Why It Matters |
|:-:|-------|-------------------|----------------|
| 1 | **Time Format Consistency** | All `departure_time` and `arrival_time` values match `HH:MM` or `HH:MM:SS` format | The train search logic (`calcDuration`) splits on `:` — inconsistent formats cause `NaN` duration display |
| 2 | **Station Order Integrity** | `stop_order` within each run is strictly increasing with no duplicates | The availability check uses `stop_order < endStop.stop_order` for route direction — gaps or duplicates break overlap detection |
| 3 | **Route Distance Monotonicity** | `distance_from_source` increases along each route | Distance is used for fare calculation (`dstDist - srcDist`) — non-monotonic values produce negative or incorrect fares |
| 4 | **Booking-Passenger-Seat Integrity** | Referential integrity across `bookings ↔ passengers ↔ seats` | Orphaned passengers cause PDF generation crashes; missing seat references break the seat map |
| 5 | **Coach Capacity vs Seat Count** | `coaches.capacity` matches the actual count of `seats` records | Mismatches cause the frontend to show wrong availability counts |
| 6 | **GEN Ticket Validity Windows** | `gen_validity_end - gen_validity_start ≈ 3 hours` for all GEN bookings | Incorrect validity windows let expired tickets appear valid, or expire tickets prematurely |

### How Time Format Consistency Is Maintained

RailSeat stores departure and arrival times as `HH:MM:SS` strings in the `train_stops` table. The system enforces consistency through:

1. **Seed Script Validation**: The `seed.js` script always writes times in `HH:MM:SS` format
2. **Admin Route Builder**: The frontend route builder UI uses time picker inputs that output `HH:MM` format, which the backend normalizes
3. **Duration Calculator**: The `calcDuration()` function in `train.controller.js` splits on `:` and extracts hours and minutes — it tolerates both `HH:MM` and `HH:MM:SS` formats
4. **Validation Script**: `validateDataConsistency.js` checks every time value against the regex `/^\d{2}:\d{2}(:\d{2})?$/` and reports any deviations

### How Station Order Is Maintained

Station ordering uses the `stop_order` integer field in `train_stops`:

1. **Route Builder**: When admin creates a route via the Route Builder UI, stops are assigned sequential `stop_order` values starting from 1
2. **Search Logic**: The `searchTrains()` function validates `sourceStop.stop_order < destStop.stop_order` to ensure forward-direction travel
3. **Overlap Detection**: Seat availability uses `P < endOrder && Q > startOrder` (segment overlap formula) — this depends on correct stop ordering
4. **Validation Script**: `validateDataConsistency.js` verifies that stop_order values within each run are strictly increasing with no gaps or duplicates

### Target

| Metric | Target | CI Fail Threshold |
|--------|--------|-------------------|
| Data Consistency Rate | **≥ 99%** | Below **98%** |

---

## 9. Running the Scripts

### Prerequisites

```bash
# Ensure PostgreSQL is running and .env is configured
# Backend directory: seat-master/backend/

# For load testing, install k6:
# Windows: choco install k6
# macOS: brew install k6
# Linux: https://k6.io/docs/get-started/installation/
```

### Individual Scripts

```bash
# From the backend/ directory:

# 1. Seat Allocation Accuracy
npm run eval:accuracy
npm run eval:accuracy -- --verbose             # Detailed output
npm run eval:accuracy -- --date 2026-03-20     # Filter by date

# 2. Data Consistency
npm run eval:consistency

# 3. Database Query Performance
npm run eval:queries
npm run eval:queries -- --iterations 10        # More iterations

# 4. Load Test (requires k6)
npm run eval:load
k6 run --out json=results.json src/scripts/loadTest.k6.js  # With JSON output

# 5. Full Evaluation Suite
npm run eval

# 6. Live Metrics (while server is running)
curl http://localhost:3000/api/metrics
curl http://localhost:3000/api/reliability
```

### Enabling File-Based Metrics Logging

Set the environment variable to enable JSONL logging:

```bash
# In backend/.env
METRICS_LOG_FILE=true
```

This creates `backend/logs/metrics.jsonl` with per-request entries.

---

## 10. CI/CD Automation Guide

### GitHub Actions Workflow

Create `.github/workflows/evaluation.yml`:

```yaml
name: RailSeat Evaluation Framework

on:
  # Run on every push to main
  push:
    branches: [main]
  # Run on PRs
  pull_request:
    branches: [main]
  # Scheduled: every Sunday at 2:00 AM UTC
  schedule:
    - cron: '0 2 * * 0'
  # Manual trigger
  workflow_dispatch:

jobs:
  evaluation:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: train_booking
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: seat-master/backend/package-lock.json

      - name: Install backend dependencies
        working-directory: seat-master/backend
        run: npm ci

      - name: Configure environment
        working-directory: seat-master/backend
        run: |
          cat > .env << EOF
          DB_NAME=train_booking
          DB_USER=postgres
          DB_PASSWORD=postgres
          DB_HOST=localhost
          DB_PORT=5432
          PORT=3000
          NODE_ENV=test
          EOF

      - name: Initialize database & seed data
        working-directory: seat-master/backend
        run: |
          node src/scripts/seed.js
          echo "Database seeded successfully"

      # ── Accuracy Check ────────────────────────────────────────────────
      - name: "📊 Seat Allocation Accuracy"
        working-directory: seat-master/backend
        run: npm run eval:accuracy

      # ── Data Consistency ──────────────────────────────────────────────
      - name: "🔍 Data Consistency Validation"
        working-directory: seat-master/backend
        run: npm run eval:consistency

      # ── Query Performance ─────────────────────────────────────────────
      - name: "⚡ Database Query Performance"
        working-directory: seat-master/backend
        run: npm run eval:queries -- --iterations 5

      # ── Load Test (optional — requires k6) ────────────────────────────
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

      - name: Start server for load test
        working-directory: seat-master/backend
        run: |
          node src/server.js &
          sleep 5
          curl -f http://localhost:3000/api/health || exit 1

      - name: "🚀 Load Test"
        working-directory: seat-master/backend
        run: k6 run src/scripts/loadTest.k6.js --out json=results/k6_output.json
        continue-on-error: true

      # ── Security Audit ────────────────────────────────────────────────
      - name: "🔒 Security Audit"
        working-directory: seat-master/backend
        run: npm audit --production --audit-level=high
        continue-on-error: true

      # ── Upload Results ────────────────────────────────────────────────
      - name: Upload evaluation results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: evaluation-results
          path: |
            seat-master/backend/results/
            seat-master/backend/logs/
          retention-days: 30
```

### Weekly Cron Job (Self-Hosted)

For a self-hosted server, use a cron job:

```bash
# Edit crontab
crontab -e

# Add: Run evaluation every Sunday at 2:00 AM
0 2 * * 0 cd /path/to/seat-master/backend && npm run eval >> /var/log/railseat-eval.log 2>&1
```

### Windows Task Scheduler

For development on Windows, create a scheduled task:

```batch
:: Save as run_evaluation.bat in backend/
@echo off
cd /d "%~dp0"
node src/scripts/runEvaluation.js >> results\eval_log.txt 2>&1
```

Then schedule via Task Scheduler to run weekly.

### PM2 Integration (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Run evaluation as a scheduled job
pm2 start src/scripts/runEvaluation.js --cron "0 2 * * 0" --no-autorestart --name railseat-eval
```

### Slack/Discord Notifications

Add a post-evaluation notification step:

```bash
#!/bin/bash
# notify_results.sh — Run after evaluation
RESULT=$(cat results/latest_evaluation.json | jq -r '.overall_status')
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

if [ "$RESULT" = "FAIL" ]; then
  curl -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"🚨 RailSeat Evaluation FAILED — check results at: <your-ci-url>\"}"
else
  curl -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"✅ RailSeat Evaluation PASSED — all metrics healthy\"}"
fi
```

---

## Quick Reference: All Metrics at a Glance

| Category | Key Metric | Target | How to Check |
|----------|-----------|--------|--------------|
| **Performance** | Avg Response Time | < 200ms | `GET /api/metrics` |
| **Performance** | Throughput | > 50 req/sec | k6 load test |
| **Reliability** | Failure Rate | < 2% | `GET /api/reliability` |
| **Reliability** | Server Error Rate | < 0.5% | `GET /api/reliability` |
| **Accuracy** | Seat Allocation | ≥ 99.5% | `npm run eval:accuracy` |
| **Scalability** | Load Degradation | < 3.0× | k6 staged test |
| **UX** | Avg Booking Time | < 120s | Metrics middleware |
| **Security** | Critical Vulns | 0 | `npm audit` |
| **Database** | Avg Query Time | See per-query | `npm run eval:queries` |
| **Data** | Consistency Rate | ≥ 98% | `npm run eval:consistency` |

---

## File Structure

```
backend/
├── src/
│   ├── middleware/
│   │   ├── metricsCollector.js       ← Performance + UX tracking
│   │   └── reliabilityLogger.js      ← Failure rate + error logging
│   ├── scripts/
│   │   ├── validateSeatAccuracy.js   ← Seat allocation accuracy
│   │   ├── validateDataConsistency.js← Data consistency rate
│   │   ├── analyzeQueryPerformance.js← EXPLAIN ANALYZE benchmarks
│   │   ├── loadTest.k6.js           ← k6 load/scalability test
│   │   └── runEvaluation.js         ← Orchestrator (runs all checks)
│   └── app.js                        ← Middleware + endpoints wired in
├── logs/                              ← Generated at runtime
│   ├── metrics.jsonl                 ← Per-request metrics log
│   ├── errors.jsonl                  ← Error detail log
│   └── hourly_stats.jsonl            ← Hourly aggregation
├── results/                           ← Generated by runEvaluation.js
│   └── latest_evaluation.json        ← Most recent evaluation results
└── package.json                       ← npm run eval:* scripts
```
