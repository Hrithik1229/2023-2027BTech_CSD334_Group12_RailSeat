/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  RailSeat — Metrics Collector Middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Captures per-request performance and reliability data points:
 *    • Response time (ms)
 *    • HTTP status codes (for failure-rate calculation)
 *    • Throughput (requests/sec rolling window)
 *    • Booking duration tracking (Search Start → Ticket Confirmation)
 *
 *  Usage:
 *    import { metricsMiddleware, getMetricsSnapshot } from './middleware/metricsCollector.js';
 *    app.use(metricsMiddleware);
 *    app.get('/api/metrics', (req, res) => res.json(getMetricsSnapshot()));
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── In-Memory Metric Stores ────────────────────────────────────────────────

const metrics = {
  // Rolling window for throughput calculation (last 60 seconds)
  requestTimestamps: [],

  // Aggregate counters
  totalRequests: 0,
  totalErrors4xx: 0,
  totalErrors5xx: 0,

  // Response time tracking
  responseTimes: [],            // Last 1000 response times (ms)
  responseTimesByRoute: {},     // { '/api/trains': [ms, ms, ...] }

  // Booking duration tracking (Search Start → Ticket Confirmation)
  bookingSessions: new Map(),   // sessionId → { searchStartedAt, confirmedAt }
  completedBookingDurations: [],// Last 500 completed booking durations (ms)

  // Per-endpoint stats
  endpointStats: {},            // { '/api/trains/search': { count, total_ms, errors } }

  // Start time for uptime calculation
  startedAt: Date.now(),
};

// ─── Configuration ──────────────────────────────────────────────────────────

const CONFIG = {
  ROLLING_WINDOW_SECS: 60,      // Throughput window
  MAX_RESPONSE_TIMES: 1000,     // Keep last N response times
  MAX_BOOKING_DURATIONS: 500,   // Keep last N booking durations
  LOG_FILE: path.join(__dirname, '../../logs/metrics.jsonl'),
  ENABLE_FILE_LOG: process.env.METRICS_LOG_FILE === 'true',
};

// Ensure log directory exists
const logDir = path.dirname(CONFIG.LOG_FILE);
if (CONFIG.ENABLE_FILE_LOG && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export const metricsMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const requestTimestamp = Date.now();

  // Capture the original end method
  const originalEnd = res.end;

  res.end = function (...args) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6; // Convert ns → ms
    const statusCode = res.statusCode;

    // ── Update counters ──────────────────────────────────────────────────
    metrics.totalRequests++;

    if (statusCode >= 400 && statusCode < 500) {
      metrics.totalErrors4xx++;
    } else if (statusCode >= 500) {
      metrics.totalErrors5xx++;
    }

    // ── Response time tracking ───────────────────────────────────────────
    metrics.responseTimes.push(durationMs);
    if (metrics.responseTimes.length > CONFIG.MAX_RESPONSE_TIMES) {
      metrics.responseTimes.shift();
    }

    // ── Per-route tracking ───────────────────────────────────────────────
    const routeKey = normalizeRoute(req.method, req.route?.path || req.path);
    if (!metrics.responseTimesByRoute[routeKey]) {
      metrics.responseTimesByRoute[routeKey] = [];
    }
    metrics.responseTimesByRoute[routeKey].push(durationMs);
    if (metrics.responseTimesByRoute[routeKey].length > 200) {
      metrics.responseTimesByRoute[routeKey].shift();
    }

    // ── Endpoint stats ──────────────────────────────────────────────────
    if (!metrics.endpointStats[routeKey]) {
      metrics.endpointStats[routeKey] = { count: 0, total_ms: 0, errors: 0 };
    }
    metrics.endpointStats[routeKey].count++;
    metrics.endpointStats[routeKey].total_ms += durationMs;
    if (statusCode >= 400) {
      metrics.endpointStats[routeKey].errors++;
    }

    // ── Throughput tracking (rolling window) ─────────────────────────────
    metrics.requestTimestamps.push(requestTimestamp);
    const cutoff = Date.now() - CONFIG.ROLLING_WINDOW_SECS * 1000;
    while (metrics.requestTimestamps.length > 0 && metrics.requestTimestamps[0] < cutoff) {
      metrics.requestTimestamps.shift();
    }

    // ── File logging (JSONL format for ingestion by analysis tools) ──────
    if (CONFIG.ENABLE_FILE_LOG) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        route: routeKey,
        status: statusCode,
        duration_ms: Math.round(durationMs * 100) / 100,
        user_agent: req.headers['user-agent']?.substring(0, 100),
      };
      fs.appendFile(CONFIG.LOG_FILE, JSON.stringify(logEntry) + '\n', () => {});
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

// ─── Booking Duration Tracking ──────────────────────────────────────────────

/**
 * Call when a user initiates a train search (start of booking flow).
 * @param {string} sessionId - Socket ID or user session identifier
 */
export const trackSearchStart = (sessionId) => {
  metrics.bookingSessions.set(sessionId, {
    searchStartedAt: Date.now(),
    confirmedAt: null,
  });
};

/**
 * Call when a booking is confirmed (end of booking flow).
 * @param {string} sessionId - Socket ID or user session identifier
 * @returns {number|null} Duration in ms, or null if no search was tracked
 */
export const trackBookingConfirmed = (sessionId) => {
  const session = metrics.bookingSessions.get(sessionId);
  if (!session) return null;

  session.confirmedAt = Date.now();
  const durationMs = session.confirmedAt - session.searchStartedAt;

  metrics.completedBookingDurations.push(durationMs);
  if (metrics.completedBookingDurations.length > CONFIG.MAX_BOOKING_DURATIONS) {
    metrics.completedBookingDurations.shift();
  }

  metrics.bookingSessions.delete(sessionId);
  return durationMs;
};

// ─── Snapshot / Reporting ───────────────────────────────────────────────────

/**
 * Returns a full metrics snapshot for dashboard or CI checks.
 */
export const getMetricsSnapshot = () => {
  const now = Date.now();
  const uptimeSeconds = Math.round((now - metrics.startedAt) / 1000);

  // ── Performance ────────────────────────────────────────────────────────
  const avgResponseTime = average(metrics.responseTimes);
  const p95ResponseTime = percentile(metrics.responseTimes, 95);
  const p99ResponseTime = percentile(metrics.responseTimes, 99);
  const throughput = metrics.requestTimestamps.length / CONFIG.ROLLING_WINDOW_SECS;

  // ── Reliability ────────────────────────────────────────────────────────
  const failureRate = metrics.totalRequests > 0
    ? ((metrics.totalErrors4xx + metrics.totalErrors5xx) / metrics.totalRequests) * 100
    : 0;
  const errorRate5xx = metrics.totalRequests > 0
    ? (metrics.totalErrors5xx / metrics.totalRequests) * 100
    : 0;

  // ── User Experience ────────────────────────────────────────────────────
  const avgBookingDuration = average(metrics.completedBookingDurations);

  // ── Per-Route Performance ──────────────────────────────────────────────
  const routePerformance = {};
  for (const [route, times] of Object.entries(metrics.responseTimesByRoute)) {
    routePerformance[route] = {
      avg_ms: Math.round(average(times) * 100) / 100,
      p95_ms: Math.round(percentile(times, 95) * 100) / 100,
      count: times.length,
    };
  }

  // ── Endpoint Health ────────────────────────────────────────────────────
  const endpointHealth = {};
  for (const [route, stats] of Object.entries(metrics.endpointStats)) {
    endpointHealth[route] = {
      avg_response_ms: Math.round((stats.total_ms / stats.count) * 100) / 100,
      total_requests: stats.count,
      error_rate: Math.round((stats.errors / stats.count) * 10000) / 100,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    performance: {
      avg_response_time_ms: Math.round(avgResponseTime * 100) / 100,
      p95_response_time_ms: Math.round(p95ResponseTime * 100) / 100,
      p99_response_time_ms: Math.round(p99ResponseTime * 100) / 100,
      throughput_rps: Math.round(throughput * 100) / 100,
    },
    reliability: {
      total_requests: metrics.totalRequests,
      total_4xx_errors: metrics.totalErrors4xx,
      total_5xx_errors: metrics.totalErrors5xx,
      failure_rate_percent: Math.round(failureRate * 100) / 100,
      server_error_rate_percent: Math.round(errorRate5xx * 100) / 100,
    },
    user_experience: {
      avg_booking_duration_ms: avgBookingDuration ? Math.round(avgBookingDuration) : null,
      avg_booking_duration_seconds: avgBookingDuration ? Math.round(avgBookingDuration / 1000 * 10) / 10 : null,
      completed_booking_samples: metrics.completedBookingDurations.length,
    },
    route_performance: routePerformance,
    endpoint_health: endpointHealth,
  };
};

/**
 * Resets all metric counters. Useful for scheduled metric flushes.
 */
export const resetMetrics = () => {
  metrics.totalRequests = 0;
  metrics.totalErrors4xx = 0;
  metrics.totalErrors5xx = 0;
  metrics.responseTimes = [];
  metrics.responseTimesByRoute = {};
  metrics.endpointStats = {};
  metrics.requestTimestamps = [];
  metrics.completedBookingDurations = [];
  metrics.bookingSessions.clear();
  metrics.startedAt = Date.now();
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeRoute(method, routePath) {
  // Replace dynamic segments like :id with {id}
  const normalized = routePath.replace(/\/\d+/g, '/{id}').replace(/\/$/, '');
  return `${method} ${normalized || '/'}`;
}

function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export default {
  metricsMiddleware,
  getMetricsSnapshot,
  resetMetrics,
  trackSearchStart,
  trackBookingConfirmed,
};
