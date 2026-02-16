import express from "express";
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

export default router;
