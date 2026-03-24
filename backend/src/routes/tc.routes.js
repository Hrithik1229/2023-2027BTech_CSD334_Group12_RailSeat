import express from "express";
import {
  getCoaches,
  getManifest,
  getVerificationMetrics,
  searchTrains,
  updateSeatAttendance,
} from "../controllers/tc.controller.js";

const router = express.Router();

console.log("TC routes loaded");

// Middleware: TC role check
const isTCOrAdmin = (req, res, next) => {
  // For now, allow all — in production, verify JWT role is 'tc' or 'admin'
  // const userRole = req.user?.role;
  // if (userRole !== 'tc' && userRole !== 'admin') {
  //   return res.status(403).json({ error: 'Access denied. TC role required.' });
  // }
  next();
};

router.use(isTCOrAdmin);

// Search trains by name or number
router.get("/trains/search", searchTrains);

// Get coaches for a train
router.get("/trains/:trainId/coaches", getCoaches);

// Get manifest for a coach on a date
router.get("/manifest", getManifest);

// Verify/unverify a seat
router.patch("/seats/:seatId/verify", updateSeatAttendance);

// Get verification metrics
router.get("/metrics", getVerificationMetrics);

export default router;
