import { Coach, Seat, Station, Train, TrainStop } from "../models/index.js";

// Get train stops
export const getTrainStops = async (req, res) => {
    try {
        const { id } = req.params;
        const stops = await TrainStop.findAll({
            where: { train_id: id },
            include: [{
                model: Station,
                as: 'station'
            }],
            order: [['stop_order', 'ASC']]
        });
        res.json(stops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all trains
export const getAllTrains = async (req, res) => {
    try {
        const trains = await Train.findAll({
            where: {
                status: 'active'
            },
            include: [{
                model: Coach,
                as: 'coaches',
                include: [{
                    model: Seat,
                    as: 'seats'
                }]
            }],
            order: [['train_name', 'ASC']]
        });
        res.json(trains);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get train by ID
export const getTrainById = async (req, res) => {
    try {
        const { id } = req.params;
        const train = await Train.findByPk(id, {
            include: [{
                model: Coach,
                as: 'coaches',
                include: [{
                    model: Seat,
                    as: 'seats'
                }]
            }]
        });

        if (!train) {
            return res.status(404).json({ error: "Train not found" });
        }

        res.json(train);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all stations
export const getAllStations = async (req, res) => {
    try {
        const stations = await Station.findAll({
            order: [['station_name', 'ASC']]
        });
        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search trains by source and destination (including intermediate stops)
export const searchTrains = async (req, res) => {
    try {
        const { source, destination, date } = req.query; // date can be used later for availability

        // Find source station (by name)
        const sourceWait = await Station.findOne({ where: { station_name: source } });
        const destWait = await Station.findOne({ where: { station_name: destination } });

        if (!sourceWait || !destWait) {
            return res.json([]); // Station not found
        }

        // Find stops for these stations
        const sourceStops = await TrainStop.findAll({ where: { station_id: sourceWait.station_id } });
        const destStops = await TrainStop.findAll({ where: { station_id: destWait.station_id } });

        // Find common train IDs where source stop order < dest stop order
        const validTrainIds = [];

        sourceStops.forEach(sStop => {
            const dStop = destStops.find(ds => ds.train_id === sStop.train_id);
            if (dStop && sStop.stop_order < dStop.stop_order) {
                validTrainIds.push(sStop.train_id);
            }
        });

        if (validTrainIds.length === 0) {
            return res.json([]);
        }

        const trains = await Train.findAll({
            where: {
                train_id: validTrainIds,
                status: 'active'
            },
            include: [{
                model: Coach,
                as: 'coaches',
                include: [{
                    model: Seat,
                    as: 'seats',
                    required: false, // Include seats even if status is not 'available' to count availability later
                    where: { status: 'available' }
                }]
            }]
        });

        res.json(trains);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new train
export const createTrain = async (req, res) => {
    try {
        const train = await Train.create(req.body);
        res.status(201).json(train);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
