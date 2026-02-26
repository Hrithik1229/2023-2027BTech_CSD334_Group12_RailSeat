import cors from "cors";
import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import seatRoutes from "./routes/seat.routes.js";
import trainRoutes from "./routes/train.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/test", (req, res) => {
  res.send("API is working");
});

console.log("Routes mounted");
console.log("Admin routes available at /api/admin");

app.get("/", (req, res) => { });

export default app;
