/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  RailSeat — Reliability Logger (Failure Rate Tracker)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Standalone Express middleware that specifically tracks HTTP error rates
 *  and writes structured failure logs for post-incident analysis.
 *
 *  Formula:
 *    Failure Rate (%) = ((4xx + 5xx Responses) / Total Responses) × 100
 *
 *  Features:
 *    • Per-endpoint failure rate tracking
 *    • Error body capture (first 500 chars) for debugging
 *    • Hourly aggregation for trend analysis
 *    • Alert threshold detection (configurable)
 *
 *  Usage:
 *    import { reliabilityLogger, getReliabilityReport } from './middleware/reliabilityLogger.js';
 *    app.use(reliabilityLogger);
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ──────────────────────────────────────────────────────────

const CONFIG = {
  ALERT_THRESHOLD_PERCENT: 5,         // Alert if failure rate exceeds this
  LOG_DIR: path.join(__dirname, '../../logs'),
  ERROR_LOG_FILE: 'errors.jsonl',
  HOURLY_STATS_FILE: 'hourly_stats.jsonl',
  MAX_ERROR_BODY_LENGTH: 500,
  RETENTION_HOURS: 168,               // Keep hourly stats for 7 days
};

// Ensure log directory exists
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const stats = {
  // Current hour bucket
  currentHour: getCurrentHourKey(),
  hourlyBuckets: {},     // { 'YYYY-MM-DD-HH': { total, errors_4xx, errors_5xx, endpoints: {} } }

  // Global counters (since process start)
  globalTotal: 0,
  global4xx: 0,
  global5xx: 0,

  // Recent errors ring buffer
  recentErrors: [],       // Last 100 error entries
};

function getCurrentHourKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}`;
}

function getOrCreateBucket(hourKey) {
  if (!stats.hourlyBuckets[hourKey]) {
    stats.hourlyBuckets[hourKey] = {
      hour: hourKey,
      total: 0,
      errors_4xx: 0,
      errors_5xx: 0,
      endpoints: {},
    };
  }
  return stats.hourlyBuckets[hourKey];
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export const reliabilityLogger = (req, res, next) => {
  // Capture response body for error logging
  const originalJson = res.json;
  let responseBody = null;

  res.json = function (body) {
    responseBody = body;
    return originalJson.apply(res, arguments);
  };

  const originalEnd = res.end;
  res.end = function (...args) {
    const statusCode = res.statusCode;
    const hourKey = getCurrentHourKey();
    const bucket = getOrCreateBucket(hourKey);
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // ── Global counters ──────────────────────────────────────────────────
    stats.globalTotal++;
    bucket.total++;

    if (!bucket.endpoints[endpoint]) {
      bucket.endpoints[endpoint] = { total: 0, errors: 0 };
    }
    bucket.endpoints[endpoint].total++;

    // ── Error tracking ───────────────────────────────────────────────────
    if (statusCode >= 400 && statusCode < 500) {
      stats.global4xx++;
      bucket.errors_4xx++;
      bucket.endpoints[endpoint].errors++;
    } else if (statusCode >= 500) {
      stats.global5xx++;
      bucket.errors_5xx++;
      bucket.endpoints[endpoint].errors++;
    }

    if (statusCode >= 400) {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: statusCode,
        error_body: responseBody
          ? JSON.stringify(responseBody).substring(0, CONFIG.MAX_ERROR_BODY_LENGTH)
          : null,
        user_agent: req.headers['user-agent']?.substring(0, 100),
        ip: req.ip,
      };

      // Ring buffer
      stats.recentErrors.push(errorEntry);
      if (stats.recentErrors.length > 100) {
        stats.recentErrors.shift();
      }

      // File log
      const logPath = path.join(CONFIG.LOG_DIR, CONFIG.ERROR_LOG_FILE);
      fs.appendFile(logPath, JSON.stringify(errorEntry) + '\n', () => {});
    }

    // ── Flush hourly stats periodically ──────────────────────────────────
    if (stats.currentHour !== hourKey) {
      flushHourlyStats(stats.currentHour);
      stats.currentHour = hourKey;
    }

    originalEnd.apply(res, args);
  };

  next();
};

// ─── Hourly Stats Flush ─────────────────────────────────────────────────────

function flushHourlyStats(hourKey) {
  const bucket = stats.hourlyBuckets[hourKey];
  if (!bucket) return;

  const logPath = path.join(CONFIG.LOG_DIR, CONFIG.HOURLY_STATS_FILE);
  const entry = {
    ...bucket,
    failure_rate_percent: bucket.total > 0
      ? Math.round(((bucket.errors_4xx + bucket.errors_5xx) / bucket.total) * 10000) / 100
      : 0,
  };

  fs.appendFile(logPath, JSON.stringify(entry) + '\n', () => {});

  // Cleanup old buckets (keep last RETENTION_HOURS)
  const keys = Object.keys(stats.hourlyBuckets).sort();
  while (keys.length > CONFIG.RETENTION_HOURS) {
    delete stats.hourlyBuckets[keys.shift()];
  }
}

// ─── Reporting ──────────────────────────────────────────────────────────────

/**
 * Returns a structured reliability report.
 */
export const getReliabilityReport = () => {
  const failureRate = stats.globalTotal > 0
    ? ((stats.global4xx + stats.global5xx) / stats.globalTotal) * 100
    : 0;

  const serverErrorRate = stats.globalTotal > 0
    ? (stats.global5xx / stats.globalTotal) * 100
    : 0;

  // Top error endpoints
  const errorEndpoints = [];
  for (const [hourKey, bucket] of Object.entries(stats.hourlyBuckets)) {
    for (const [endpoint, epStats] of Object.entries(bucket.endpoints)) {
      if (epStats.errors > 0) {
        errorEndpoints.push({
          hour: hourKey,
          endpoint,
          total: epStats.total,
          errors: epStats.errors,
          error_rate: Math.round((epStats.errors / epStats.total) * 10000) / 100,
        });
      }
    }
  }

  // Alert status
  const alert = failureRate > CONFIG.ALERT_THRESHOLD_PERCENT;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total_requests: stats.globalTotal,
      client_errors_4xx: stats.global4xx,
      server_errors_5xx: stats.global5xx,
      failure_rate_percent: Math.round(failureRate * 100) / 100,
      server_error_rate_percent: Math.round(serverErrorRate * 100) / 100,
    },
    alert: {
      triggered: alert,
      threshold_percent: CONFIG.ALERT_THRESHOLD_PERCENT,
      message: alert
        ? `⚠️ Failure rate ${failureRate.toFixed(2)}% exceeds threshold ${CONFIG.ALERT_THRESHOLD_PERCENT}%`
        : '✅ Failure rate within acceptable limits',
    },
    hourly_trend: Object.values(stats.hourlyBuckets)
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .map(b => ({
        hour: b.hour,
        total: b.total,
        errors: b.errors_4xx + b.errors_5xx,
        failure_rate: b.total > 0
          ? Math.round(((b.errors_4xx + b.errors_5xx) / b.total) * 10000) / 100
          : 0,
      })),
    top_error_endpoints: errorEndpoints
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10),
    recent_errors: stats.recentErrors.slice(-20),
  };
};

export default { reliabilityLogger, getReliabilityReport };
