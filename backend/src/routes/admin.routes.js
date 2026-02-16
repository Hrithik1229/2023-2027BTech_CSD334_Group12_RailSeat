import express from "express";
import {
    createFareRule,
    createReverseRun,
    createStation,
    deleteFareRule,
    deleteStation,
    getDashboardStats,
    getFareRules,
    getStations,
    getUsers,
    updateFareRule,
    updateRoute,
    updateStation,
    updateUserRole
} from "../controllers/admin.controller.js";

const router = express.Router();

// Middleware: admin check (Todo: Add real auth)
const isAdmin = (req, res, next) => {
    // For now, allow all or check header
    // if (req.headers['x-admin-token'] !== 'secret') return res.status(403).send('Unauthorized');
    next();
};

router.use(isAdmin);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Runs
router.post("/runs/:id/reverse", createReverseRun);
router.put("/runs/:id/route", updateRoute);

// Stations
router.get("/stations", getStations);
router.post("/stations", createStation);
router.patch("/stations/:id", updateStation);
router.delete("/stations/:id", deleteStation);

// Users
router.get("/users", getUsers);
router.patch("/users/:id", updateUserRole);

// Fares
router.get("/fares", getFareRules);
router.post("/fares", createFareRule);
router.patch("/fares/:id", updateFareRule);
router.delete("/fares/:id", deleteFareRule);

export default router;
