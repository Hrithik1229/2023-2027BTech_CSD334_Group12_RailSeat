import express from "express";
import { createOrder, releaseSeats, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router();

// POST /api/payments/create-order
// Creates a Razorpay order before checkout is opened
router.post("/create-order", createOrder);

// POST /api/payments/verify-payment
// Verifies razorpay_signature and confirms booking if valid
router.post("/verify-payment", verifyPayment);

// POST /api/payments/release-seats
// Releases seat locks if payment fails or user cancels
router.post("/release-seats", releaseSeats);

export default router;
