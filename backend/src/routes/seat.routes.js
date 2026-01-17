import express from "express";
import {
    getSeatsByCoach,
    updateSeatStatus,
    getAvailableSeats,
    bulkUpdateSeatStatus
} from "../controllers/seat.controller.js";

const router = express.Router();

router.get("/coach/:coachId", getSeatsByCoach);
router.get("/available", getAvailableSeats);
router.put("/:seatId", updateSeatStatus);
router.put("/bulk/update", bulkUpdateSeatStatus);

export default router;
