import express from "express";
import { createGenOrder, createOrder, releaseSeats, verifyGenPayment, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router();

// POST /api/payments/create-order
router.post("/create-order", createOrder);

// POST /api/payments/verify-payment
router.post("/verify-payment", verifyPayment);

// POST /api/payments/release-seats
router.post("/release-seats", releaseSeats);

// ── General (GEN) coach booking (no seat locks needed) ──
router.post("/create-gen-order", createGenOrder);
router.post("/verify-gen-payment", verifyGenPayment);

export default router;
