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

// Search trains by source and destination
export const searchTrains = async (req, res) => {
    try {
        const { source, destination, date } = req.query;

        const trains = await Train.findAll({
            where: {
                source_station: source,
                destination_station: destination,
                status: 'active'
            },
            include: [{
                model: Coach,
                as: 'coaches',
                include: [{
                    model: Seat,
                    as: 'seats',
                    where: {
                        status: 'available'
                    },
                    required: false
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
