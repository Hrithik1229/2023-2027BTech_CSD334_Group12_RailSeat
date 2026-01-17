import express from "express";
import {
    createTrain,
    getAllTrains,
    getTrainById,
    getTrainStops,
    searchTrains
} from "../controllers/train.controller.js";

const router = express.Router();

router.get("/", getAllTrains);
router.get("/search", searchTrains);
router.get("/:id/stops", getTrainStops);
router.get("/:id", getTrainById);
router.post("/", createTrain);

export default router;
