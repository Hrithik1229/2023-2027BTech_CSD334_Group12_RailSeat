import cors from "cors";
import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import seatRoutes from "./routes/seat.routes.js";
import trainRoutes from "./routes/train.routes.js";
import userRoutes from "./routes/user.routes.js";
import tcRoutes from "./routes/tc.routes.js";

// ── Evaluation Framework Middleware ──────────────────────────────────────────
import { metricsMiddleware, getMetricsSnapshot } from "./middleware/metricsCollector.js";
import { reliabilityLogger, getReliabilityReport } from "./middleware/reliabilityLogger.js";

const app = express();

app.use(cors());
app.use(express.json());

// ── Attach evaluation middleware (before routes) ─────────────────────────────
app.use(metricsMiddleware);
app.use(reliabilityLogger);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tc", tcRoutes);

app.get("/api/test", (req, res) => {
  res.send("API is working");
});

// ── Evaluation Framework Endpoints ───────────────────────────────────────────
app.get("/api/metrics", (req, res) => {
  res.json(getMetricsSnapshot());
});

app.get("/api/reliability", (req, res) => {
  res.json(getReliabilityReport());
});

// Health-check endpoint for the frontend server-detection ping
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

console.log("Routes mounted");
console.log("Admin routes available at /api/admin");

app.get("/", (req, res) => { });

export default app;
