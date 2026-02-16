import { sequelize, Train, TrainRun, TrainStop } from "../models/index.js";

// ... (existing functions)

// Update Route (Full Replacement)
export const updateRoute = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // run_id
        const stops = req.body.stops; // Array of stop objects

        // Validate basic rules
        if (!stops || !Array.isArray(stops) || stops.length < 2) {
            await t.rollback();
            return res.status(400).json({ error: "Route must have at least 2 stops." });
        }

        // 1. Delete existing stops
        await TrainStop.destroy({
            where: { run_id: id },
            transaction: t
        });

        // 2. Prepare new stops data
        const stopsData = stops.map((stop, index) => ({
            run_id: id,
            station_id: stop.station_id,
            stop_order: index + 1,
            arrival_time: stop.arrival_time || null,
            departure_time: stop.departure_time || null,
            halt_duration: stop.halt_duration || 0,
            distance_from_source: stop.distance_from_source || 0
        }));

        const createdStops = await TrainStop.bulkCreate(stopsData, { transaction: t });

        // 3. Update Run source/dest if changed based on new stops
        const sourceStop = stopsData[0];
        const destStop = stopsData[stopsData.length - 1];

        // This assumes sourceStop.station_id is correct. 
        // Ideally user passes correct data.
        await TrainRun.update({
            source_station_id: sourceStop.station_id,
            destination_station_id: destStop.station_id
        }, {
            where: { run_id: id },
            transaction: t
        });

        await t.commit();
        res.json({ message: "Route updated successfully", count: createdStops.length });

    } catch (error) {
        if (t) await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

// Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        const totalTrains = await Train.count();
        const totalRuns = await TrainRun.count();
        const activeRuns = await TrainRun.count({
            // Logic for "today active" would require checking days_of_run against current day
            // Simplified: just return total active trains
            include: [{ model: Train, where: { status: 'active' } }]
        });

        // Routes with missing timetable (runs with < 2 stops)
        const runsWithStops = await TrainRun.findAll({
            include: [{ model: TrainStop, as: 'stops' }]
        });
        const missingTimetable = runsWithStops.filter(r => r.stops.length < 2).length;

        res.json({
            totalTrains,
            totalRuns,
            activeRuns,
            missingTimetable
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create Reverse Run Logic
export const createReverseRun = async (req, res) => {
    try {
        const { id } = req.params; // The run ID to clone
        const { startTime } = req.body; // Optional new start time for return journey (HH:MM:SS)

        const originalRun = await TrainRun.findByPk(id, {
            include: [{ model: TrainStop, as: 'stops' }]
        });

        if (!originalRun) return res.status(404).json({ error: "Run not found" });

        // Clone Run
        const newDirection = originalRun.direction === 'UP' ? 'DOWN' : 'UP';
        const newRun = await TrainRun.create({
            train_id: originalRun.train_id,
            direction: newDirection,
            source_station_id: originalRun.destination_station_id,
            destination_station_id: originalRun.source_station_id,
            days_of_run: originalRun.days_of_run, // Keep same days for now
            status: 'active' // Default active
        });

        // Calculate Reverse Schedule
        // 1. Get ordered stops
        const stops = originalRun.stops.sort((a, b) => a.stop_order - b.stop_order);

        // 2. Calculate segments (Time taken between stops)
        // We need to parse times. Helper function needed.
        const parseTime = (t) => {
            const [h, m, s] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const formatTime = (m) => {
            const h = Math.floor(m / 60) % 24;
            const min = m % 60;
            return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
        };

        const segments = [];
        for (let i = 0; i < stops.length - 1; i++) {
            const current = stops[i];
            const next = stops[i + 1];
            // duration = next.arrival - current.departure
            const dur = parseTime(next.arrival_time) - parseTime(current.departure_time);
            segments.push(dur);
        }

        // 3. Create reverse stops
        // Reverse stops array for station mapping
        const reversedStops = [...stops].reverse();

        let newstopsData = [];
        let currentTime = parseTime(startTime || "06:00:00"); // Default 6 AM start if not provided

        for (let i = 0; i < reversedStops.length; i++) {
            const originalStop = reversedStops[i];

            // Calc Arrival
            let arrivalTime = i === 0 ? null : formatTime(currentTime); // First station has no arrival

            // Calc Departure
            let departureTime = null;
            if (i < reversedStops.length - 1) {
                // If not last station, we have a departure
                // Add halt time if exists, else 0 (source has no halt usually, but intermediate do)
                // For the "new" source (old dest), departure is start time.
                // For intermediate: arrival + halt.

                const halt = originalStop.halt_duration || 0; // Use original halt at this station?
                // Actually, original destination (item 0 in reversed) had no halt usually.
                // original intermediate (item 1..N-1) had halt.

                if (i === 0) {
                    departureTime = formatTime(currentTime);
                } else {
                    currentTime += halt;
                    departureTime = formatTime(currentTime);
                }

                // Add travel time to next station
                // Segment i corresponds to travel from reversedStops[i] to reversedStops[i+1]
                // The segments array was A->B, B->C. 
                // Reversed: C->B (segment 1), B->A (segment 0).
                // So index in segments array is (segments.length - 1 - i)
                const travelTime = segments[segments.length - 1 - i];
                currentTime += travelTime;
            }

            newstopsData.push({
                run_id: newRun.run_id,
                station_id: originalStop.station_id,
                stop_order: i + 1,
                arrival_time: arrivalTime,
                departure_time: departureTime,
                halt_duration: originalStop.halt_duration,
                distance_from_source: 0 // Todo: calc reverse distance logic
            });
        }

        const createdStops = await TrainStop.bulkCreate(newstopsData);

        res.json({ run: newRun, stops: createdStops });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Stations ---
export const getStations = async (req, res) => {
    try {
        const stations = await Station.findAll({ order: [['name', 'ASC']] });
        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createStation = async (req, res) => {
    try {
        const station = await Station.create(req.body);
        res.status(201).json(station);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateStation = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Station.update(req.body, { where: { id } });
        if (updated) {
            const updatedStation = await Station.findByPk(id);
            res.json(updatedStation);
        } else {
            res.status(404).json({ error: "Station not found" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteStation = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Station.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: "Station not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Users ---
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const [updated] = await User.update({ role }, { where: { user_id: id } });
        if (updated) {
            res.json({ message: "Role updated" });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// --- Fares ---
export const getFareRules = async (req, res) => {
    try {
        const rules = await FareRule.findAll();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createFareRule = async (req, res) => {
    try {
        const rule = await FareRule.create(req.body);
        res.status(201).json(rule);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateFareRule = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await FareRule.update(req.body, { where: { id } });
        if (updated) {
            const updatedRule = await FareRule.findByPk(id);
            res.json(updatedRule);
        } else {
            res.status(404).json({ error: "Rule not found" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteFareRule = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await FareRule.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: "Rule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
