import crypto from "crypto";
import Razorpay from "razorpay";
import { Booking, Coach, Passenger, Seat, Train } from "../models/index.js";
import { activeLocks, getIO } from "../sockets.js";

// Initialize Razorpay instance using test mode keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ──────────────────────────────────────────────
// POST /api/payments/create-order
// Called BEFORE Razorpay checkout is opened.
// Validates seat locks, creates a Razorpay order
// and returns the order_id + key_id to the client.
// ──────────────────────────────────────────────
export const createOrder = async (req, res) => {
    try {
        const {
            totalAmount,   // in ₹ (frontend calculated, including any discounts)
            seats,         // [{ seatId, price }, ...]
            socketId,
            travelDate,
            trainId,
        } = req.body;

        if (!socketId) {
            return res.status(400).json({ error: "Socket ID is required to create order." });
        }

        if (!seats || seats.length === 0) {
            return res.status(400).json({ error: "No seats provided." });
        }

        // Validate that all seats are still locked by this socket session
        const seatIds = seats.map(s => s.seatId);
        const travelDateStr =
            typeof travelDate === "string"
                ? travelDate
                : new Date(travelDate).toISOString().split("T")[0];

        const now = new Date();
        for (const seatId of seatIds) {
            const key = `${seatId}_${travelDateStr}_${socketId}`;
            const lock = activeLocks.get(key);
            if (!lock || lock.expiresAt < now) {
                return res.status(400).json({
                    error: `Seat ${seatId} is not locked by your session, or the lock has expired. Please re-select your seats.`,
                });
            }
        }

        // Amount in paise (Razorpay requires integer paise)
        const amountInPaise = Math.round(Number(totalAmount) * 100);

        if (amountInPaise <= 0) {
            return res.status(400).json({ error: "Invalid booking amount." });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: {
                trainId: String(trainId),
                seatIds: seatIds.join(","),
                travelDate: travelDateStr,
            },
        });

        return res.status(200).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return res.status(500).json({ error: error.message || "Failed to create payment order." });
    }
};

// ──────────────────────────────────────────────
// POST /api/payments/verify-payment
// Called AFTER Razorpay checkout completes.
// 1. Verifies razorpay_signature using HMAC-SHA256
// 2. If valid → creates booking record, emits socket event
// 3. If invalid → releases seat locks, returns 400
// ──────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            // Booking details forwarded from frontend
            contactName,
            email,
            userId,
            trainId,
            sourceStation,
            destinationStation,
            travelDate,
            seats,          // [{ seatId, price }, ...]
            passengers,     // [{ name, gender }, ...]
            totalAmount,
            socketId,
            quota,
            disabilityType,
        } = req.body;

        // ── 1. Signature Verification ─────────────────────
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            // Signature mismatch → release locks and reject
            if (socketId && seats && travelDate) {
                const travelDateStr =
                    typeof travelDate === "string"
                        ? travelDate
                        : new Date(travelDate).toISOString().split("T")[0];

                for (const { seatId } of seats) {
                    const key = `${seatId}_${travelDateStr}_${socketId}`;
                    activeLocks.delete(key);
                }

                try {
                    const io = getIO();
                    io.emit("seats-unlocked", {
                        seatIds: seats.map(s => s.seatId),
                        date: travelDateStr,
                        trainId,
                    });
                } catch (e) {
                    console.error("Failed to emit seats-unlocked after bad signature:", e);
                }
            }

            return res.status(400).json({
                error: "Payment verification failed. Invalid signature.",
                verified: false,
            });
        }

        // ── 2. Signature is valid → Create Booking ────────
        const travelDateStr =
            typeof travelDate === "string"
                ? travelDate
                : new Date(travelDate).toISOString().split("T")[0];

        // Generate unique 10-digit PNR
        let bookingNumber;
        let isUnique = false;
        while (!isUnique) {
            bookingNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            const existing = await Booking.findOne({ where: { booking_number: bookingNumber } });
            if (!existing) isUnique = true;
        }

        const seatIds = seats.map(s => s.seatId);

        // Create booking record with confirmed + paid status
        const booking = await Booking.create({
            booking_number: bookingNumber,
            contact_name: contactName,
            email: email,
            user_id: userId || null,
            train_id: trainId,
            source_station: sourceStation,
            destination_station: destinationStation,
            travel_date: travelDateStr,
            total_amount: Number(totalAmount) || 0,
            booking_status: "confirmed",
            payment_status: "paid",
        });

        // Create passenger records
        const passengerPromises = passengers.map(async (passenger, index) => {
            return Passenger.create({
                booking_id: booking.booking_id,
                seat_id: seats[index].seatId,
                passenger_name: passenger.name,
                passenger_gender: passenger.gender,
            });
        });
        await Promise.all(passengerPromises);

        // ── 3. Release locks & emit sockets ──────────────
        if (socketId) {
            for (const seatId of seatIds) {
                const key = `${seatId}_${travelDateStr}_${socketId}`;
                activeLocks.delete(key);
            }
        }

        try {
            const io = getIO();
            io.emit("seats-booked", { seatIds, date: travelDateStr, trainId });
        } catch (e) {
            console.error("Failed to emit seats-booked:", e);
        }

        // ── 4. Fetch full booking with relations ─────────
        const completeBooking = await Booking.findByPk(booking.booking_id, {
            include: [
                { model: Train, as: "train" },
                {
                    model: Passenger,
                    as: "passengers",
                    include: [
                        {
                            model: Seat,
                            as: "seat",
                            include: [{ model: Coach, as: "coach" }],
                        },
                    ],
                },
            ],
        });

        return res.status(200).json({
            verified: true,
            booking: completeBooking,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ error: error.message || "Payment verification failed." });
    }
};

// ──────────────────────────────────────────────
// POST /api/payments/release-seats
// Called when payment fails or user cancels checkout.
// Releases locks so other users can book the seats.
// ──────────────────────────────────────────────
export const releaseSeats = async (req, res) => {
    try {
        const { socketId, seats, travelDate, trainId } = req.body;

        if (!socketId || !seats || !travelDate) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const travelDateStr =
            typeof travelDate === "string"
                ? travelDate
                : new Date(travelDate).toISOString().split("T")[0];

        const seatIds = seats.map(s => s.seatId);

        for (const seatId of seatIds) {
            const key = `${seatId}_${travelDateStr}_${socketId}`;
            activeLocks.delete(key);
        }

        try {
            const io = getIO();
            io.emit("seats-unlocked", { seatIds, date: travelDateStr, trainId });
        } catch (e) {
            console.error("Failed to emit seats-unlocked:", e);
        }

        return res.status(200).json({ released: true });
    } catch (error) {
        console.error("Error releasing seats:", error);
        return res.status(500).json({ error: error.message });
    }
};
