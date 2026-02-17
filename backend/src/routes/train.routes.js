import express from "express";
import { createReverseRun, updateRoute } from "../controllers/admin.controller.js";
import {
    addTrainStops,
    createTrain,
    createTrainRun,
    getAllStations,
    getAllTrains,
    getRunById,
    getTrainById,
    getTrainStops,
    searchStations,
    searchTrains
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
router.get("/runs/:id", getRunById);
router.get("/:id/stops", getTrainStops);
router.get("/:id", getTrainById);
router.post("/", createTrain);
router.post("/:id/runs", createTrainRun);
router.post("/runs/:id/stops", addTrainStops);
router.put("/runs/:id/route", updateRoute);
router.post("/runs/:id/reverse", createReverseRun);

export default router;
