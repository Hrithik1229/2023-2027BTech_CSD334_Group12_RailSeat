import express from "express";
import { createReverseRun, deleteRoute, updateRoute } from "../controllers/admin.controller.js";
import {
    addTrainStops,
    calculateJourneyFare,
    createCoach,
    createTrain,
    createTrainRun,
    deleteCoach,
    getAllStations,
    getAllTrains,
    getRunById,
    getTrainAvailability,
    getTrainById,
    getTrainStops,
    searchStations,
    searchTrains,
    seedFaresController
} from "../controllers/train.controller.js";

const router = express.Router();

console.log("Train routes loaded");
console.log("updateRoute type:", typeof updateRoute);
console.log("createReverseRun type:", typeof createReverseRun);

if (typeof updateRoute !== 'function') {
    console.error("CRITICAL ERROR: updateRoute is not a function. Check admin.controller.js exports.");
}

router.get("/", getAllTrains);
router.get("/stations", getAllStations);
router.get("/stations/search", searchStations);
router.get("/search", searchTrains);
router.get("/seed-fares", seedFaresController);
router.post("/fare", calculateJourneyFare);
router.get("/runs/:id", getRunById);
router.get("/:id/stops", getTrainStops);
router.get("/:id", getTrainById);
router.get("/:id/availability", getTrainAvailability);
router.post("/", createTrain);
router.post("/:id/runs", createTrainRun);
router.post("/:id/coaches", createCoach);
router.post("/runs/:id/stops", addTrainStops);
router.put("/runs/:id/route", updateRoute);
router.post("/runs/:id/reverse", createReverseRun);
router.delete("/runs/:id", deleteRoute);
router.delete("/coaches/:id", deleteCoach);

export default router;
