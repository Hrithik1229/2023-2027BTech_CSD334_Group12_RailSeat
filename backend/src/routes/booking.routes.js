import express from "express";
import {
    cancelBooking,
    createBooking,
    getBookingById,
    getBookingsByEmail,
    updateBookingStatus
} from "../controllers/booking.controller.js";
import { downloadTicket } from "../controllers/ticket.controller.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/search", getBookingsByEmail);
router.get("/:id/download-ticket", downloadTicket);   // ← PDF ticket download
router.get("/:id", getBookingById);
router.put("/:id/status", updateBookingStatus);
router.put("/:id/cancel", cancelBooking);

export default router;
