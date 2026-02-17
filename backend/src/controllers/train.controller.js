import { Coach, Seat, Station, Train, TrainRun, TrainStop, sequelize } from "../models/index.js";

// Get train stops (via Runs)
export const getTrainStops = async (req, res) => {
    try {
        const { id } = req.params;
        const runs = await TrainRun.findAll({
            where: { train_id: id },
            include: [{
                model: TrainStop,
                as: 'stops',
                include: [{ model: Station, as: 'station' }],
                order: [['stop_order', 'ASC']]
            }]
        });
        res.json(runs);
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
                model: TrainRun,
                as: 'runs',
                include: [{
                    model: Station, as: 'sourceStation'
                }, {
                    model: Station, as: 'destinationStation'
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
                model: TrainRun,
                as: 'runs',
                include: [{ model: Station, as: 'sourceStation' }, { model: Station, as: 'destinationStation' }]
            }, {
                model: Coach,
                as: 'coaches',
                include: [{ model: Seat, as: 'seats' }]
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
            order: [['name', 'ASC']]
        });
        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search stations (type-ahead)
export const searchStations = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const { Op } = (await import("sequelize"));
        const stations = await Station.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${q}%` } },
                    { code: { [Op.iLike]: `%${q}%` } }
                ]
            },
            limit: 20,
            order: [['name', 'ASC']]
        });

        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search trains (Refactored for Runs)
export const searchTrains = async (req, res) => {
    try {
        const { source, destination, date } = req.query;
        console.log(`[searchTrains] Searching for trains from "${source}" to "${destination}"`);

        const { Op } = (await import("sequelize"));

        if (!source || !destination) {
            console.log('[searchTrains] Missing source or destination');
            return res.json([]);
        }

        // Find stations - using LOWER for case-insensitive search (works with all DBs)
        const sourceStation = await Station.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                sequelize.fn('LOWER', source)
            )
        });

        const destStation = await Station.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                sequelize.fn('LOWER', destination)
            )
        });

        console.log(`[searchTrains] Source station found:`, sourceStation ? `${sourceStation.name} (ID: ${sourceStation.id})` : 'NOT FOUND');
        console.log(`[searchTrains] Destination station found:`, destStation ? `${destStation.name} (ID: ${destStation.id})` : 'NOT FOUND');

        if (!sourceStation || !destStation) {
            console.log('[searchTrains] One or both stations not found in database');
            return res.json([]);
        }

        if (sourceStation.id === destStation.id) {
            console.log('[searchTrains] Source and destination are the same station');
            return res.json([]);
        }

        // Find stops at both stations
        const sourceStops = await TrainStop.findAll({
            where: { station_id: sourceStation.id },
            order: [['stop_order', 'ASC']]
        });
        const destStops = await TrainStop.findAll({
            where: { station_id: destStation.id },
            order: [['stop_order', 'ASC']]
        });

        console.log(`[searchTrains] Found ${sourceStops.length} stops at source station`);
        console.log(`[searchTrains] Found ${destStops.length} stops at destination station`);

        // Match runs where source comes before destination
        const validRuns = [];
        sourceStops.forEach(sStop => {
            const dStop = destStops.find(ds => ds.run_id === sStop.run_id);
            if (dStop && sStop.stop_order < dStop.stop_order) {
                validRuns.push({
                    run_id: sStop.run_id,
                    sourceStop: sStop,
                    destStop: dStop
                });
                console.log(`[searchTrains] Valid run found: run_id=${sStop.run_id}, stops ${sStop.stop_order} → ${dStop.stop_order}`);
            }
        });

        console.log(`[searchTrains] Total valid runs found: ${validRuns.length}`);

        if (validRuns.length === 0) {
            console.log('[searchTrains] No valid runs found between these stations');
            return res.json([]);
        }

        // Fetch Runs with train and coach details
        const runsData = await TrainRun.findAll({
            where: { run_id: validRuns.map(r => r.run_id) },
            include: [
                {
                    model: Train,
                    as: 'train',
                    include: [{
                        model: Coach,
                        as: 'coaches',
                        // Use actual Coach model fields; there is no "total_seats" column
                        attributes: ['coach_id', 'coach_number', 'coach_type', 'capacity']
                    }]
                },
                { model: Station, as: 'sourceStation', attributes: ['id', 'name', 'code'] },
                { model: Station, as: 'destinationStation', attributes: ['id', 'name', 'code'] }
            ]
        });

        console.log(`[searchTrains] Fetched ${runsData.length} train runs from database`);

        // Map results
        const results = runsData.map(run => {
            const match = validRuns.find(r => r.run_id === run.run_id);

            // Calculate duration
            let duration = "N/A";
            if (match.sourceStop.departure_time && match.destStop.arrival_time) {
                try {
                    const parseTime = (timeStr) => {
                        const parts = timeStr.split(':');
                        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    };

                    const depMinutes = parseTime(match.sourceStop.departure_time);
                    const arrMinutes = parseTime(match.destStop.arrival_time);
                    let durationMinutes = arrMinutes - depMinutes;

                    if (durationMinutes < 0) {
                        durationMinutes += 24 * 60; // Handle overnight journeys
                    }

                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    duration = `${hours}h ${minutes}m`;
                } catch (error) {
                    console.warn(`[searchTrains] Failed to calculate duration for run ${run.run_id}:`, error.message);
                }
            }

            return {
                run_id: run.run_id,
                train_id: run.train_id,
                train_number: run.train.train_number,
                train_name: run.train.train_name,
                direction: run.direction,
                source: sourceStation.name,
                destination: destStation.name,
                departure_time: match.sourceStop.departure_time,
                arrival_time: match.destStop.arrival_time,
                duration: duration,
                coaches: run.train.coaches.map(c => ({
                    coach_id: c.coach_id,
                    coach_number: c.coach_number,
                    coach_type: c.coach_type,
                    // Map capacity from the Coach model; caller can decide how to interpret
                    total_seats: c.capacity
                }))
            };
        });

        console.log(`[searchTrains] Returning ${results.length} results`);
        res.json(results);
    } catch (error) {
        console.error('[searchTrains] Error:', error.message);
        console.error('[searchTrains] Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
};

export const createTrain = async (req, res) => {
    try {
        const train = await Train.create(req.body);
        res.status(201).json(train);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createTrainRun = async (req, res) => {
    try {
        const { id } = req.params; // train_id
        const runData = { ...req.body, train_id: id };
        const run = await TrainRun.create(runData);
        res.status(201).json(run);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createCoach = async (req, res) => {
    try {
        const { id } = req.params; // train_id
        const { coach_number, coach_type, total_seats, capacity } = req.body;

        console.log(`[createCoach] Creating coach for train ${id}:`, { coach_number, coach_type, total_seats, capacity });

        // Validate required fields
        if (!coach_number) {
            return res.status(400).json({ error: 'Coach number is required' });
        }

        if (!coach_type) {
            return res.status(400).json({ error: 'Coach type is required' });
        }

        // Validate train exists
        const train = await Train.findByPk(id);
        if (!train) {
            return res.status(404).json({ error: 'Train not found' });
        }

        // Get the next sequence order
        const existingCoaches = await Coach.findAll({
            where: { train_id: id },
            order: [['sequence_order', 'DESC']],
            limit: 1
        });
        const nextSequence = existingCoaches.length > 0 ? existingCoaches[0].sequence_order + 1 : 1;

        console.log(`[createCoach] Next sequence order: ${nextSequence}`);

        // Determine the actual capacity
        const actualCapacity = capacity || total_seats || 72;

        // Create the coach
        const coach = await Coach.create({
            coach_number,
            coach_type,
            capacity: actualCapacity,
            sequence_order: nextSequence,
            train_id: id
        });

        console.log(`[createCoach] Coach created with ID: ${coach.coach_id}`);

        // Generate Seats based on coach type
        const seats = [];
        const seatCount = actualCapacity;

        for (let j = 1; j <= seatCount; j++) {
            let berthType = 'MB'; // Default to Middle Berth
            let row = 0;
            let isSideBerth = false;
            let columnIndex = 0;

            // Determine layout based on coach type
            if (coach_type === 'SL' || coach_type === 'sleeper') {
                // Sleeper: 8 seats per row (3 lower + 3 middle + 3 upper + 2 side)
                row = Math.ceil(j / 8);
                const mod = ((j - 1) % 8) + 1;

                if (mod === 1 || mod === 4) {
                    berthType = 'LB'; // Lower Berth
                    isSideBerth = false;
                    columnIndex = mod === 1 ? 0 : 1;
                } else if (mod === 2 || mod === 5) {
                    berthType = 'MB'; // Middle Berth
                    isSideBerth = false;
                    columnIndex = mod === 2 ? 0 : 1;
                } else if (mod === 3 || mod === 6) {
                    berthType = 'UB'; // Upper Berth
                    isSideBerth = false;
                    columnIndex = mod === 3 ? 0 : 1;
                } else if (mod === 7) {
                    berthType = 'SL'; // Side Lower
                    isSideBerth = true;
                    columnIndex = 0;
                } else if (mod === 8) {
                    berthType = 'SU'; // Side Upper
                    isSideBerth = true;
                    columnIndex = 1;
                }
            } else if (coach_type === '1A' || coach_type === '2A' || coach_type === '3A' || coach_type === 'ac') {
                // AC: 6 seats per row (2 lower + 2 upper + 2 side)
                row = Math.ceil(j / 6);
                const mod = ((j - 1) % 6) + 1;

                if (mod === 1 || mod === 3) {
                    berthType = 'LB'; // Lower Berth
                    isSideBerth = false;
                    columnIndex = mod === 1 ? 0 : 1;
                } else if (mod === 2 || mod === 4) {
                    berthType = 'UB'; // Upper Berth
                    isSideBerth = false;
                    columnIndex = mod === 2 ? 0 : 1;
                } else if (mod === 5) {
                    berthType = 'SL'; // Side Lower
                    isSideBerth = true;
                    columnIndex = 0;
                } else if (mod === 6) {
                    berthType = 'SU'; // Side Upper
                    isSideBerth = true;
                    columnIndex = 1;
                }
            } else if (coach_type === 'CC' || coach_type === '2S' || coach_type === 'chair') {
                // Chair Car: 5 seats per row (2 + 3 or 2 + 2 + 1)
                row = Math.ceil(j / 5);
                const mod = ((j - 1) % 5) + 1;

                if (mod === 1 || mod === 5) {
                    berthType = 'WS'; // Window Seat
                    isSideBerth = false;
                    columnIndex = mod === 1 ? 0 : 4;
                } else if (mod === 3) {
                    berthType = 'AS'; // Aisle Seat
                    isSideBerth = false;
                    columnIndex = 2;
                } else {
                    berthType = 'MS'; // Middle Seat
                    isSideBerth = false;
                    columnIndex = mod === 2 ? 1 : 3;
                }
            } else {
                // Default layout for other types (similar to AC)
                row = Math.ceil(j / 6);
                const mod = ((j - 1) % 6) + 1;

                if (mod <= 2) {
                    berthType = 'LB';
                    columnIndex = mod - 1;
                } else if (mod <= 4) {
                    berthType = 'MB';
                    columnIndex = mod - 3;
                } else {
                    berthType = 'UB';
                    columnIndex = mod - 5;
                }
                isSideBerth = false;
            }

            seats.push({
                seat_number: j,
                berth_type: berthType,
                row_number: row,
                is_side_berth: isSideBerth,
                column_index: columnIndex,
                coach_id: coach.coach_id
            });
        }

        await Seat.bulkCreate(seats);
        console.log(`[createCoach] Generated ${seats.length} seats for coach ${coach.coach_id}`);

        // Fetch the coach with seats for response
        const coachWithSeats = await Coach.findByPk(coach.coach_id, {
            include: [{
                model: Seat,
                as: 'seats',
                attributes: ['seat_id', 'seat_number', 'berth_type', 'row_number', 'column_index', 'is_side_berth']
            }]
        });

        res.status(201).json(coachWithSeats);
    } catch (error) {
        console.error('[createCoach] Error:', error.message);
        console.error('[createCoach] Stack:', error.stack);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'A coach with this number already exists for this train' });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
        }

        res.status(500).json({ error: error.message });
    }
};

export const addTrainStops = async (req, res) => {
    try {
        const { id } = req.params; // run_id
        const stopsData = req.body.map(stop => ({ ...stop, run_id: id }));
        const stops = await TrainStop.bulkCreate(stopsData);
        res.json(stops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getRunById = async (req, res) => {
    try {
        const { id } = req.params;
        const run = await TrainRun.findByPk(id, {
            include: [
                {
                    model: TrainStop,
                    as: 'stops',
                    include: [{ model: Station, as: 'station' }]
                },
                { model: Train, as: 'train' }
            ],
            order: [[{ model: TrainStop, as: 'stops' }, 'stop_order', 'ASC']]
        });
        if (!run) return res.status(404).json({ error: "Run not found" });
        res.json(run);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCoach = async (req, res) => {
    try {
        const { id } = req.params; // coach_id

        console.log(`[deleteCoach] Deleting coach ID: ${id}`);

        // Find the coach
        const coach = await Coach.findByPk(id, {
            include: [{
                model: Seat,
                as: 'seats'
            }]
        });

        if (!coach) {
            console.log(`[deleteCoach] Coach ${id} not found`);
            return res.status(404).json({ error: 'Coach not found' });
        }

        const seatCount = coach.seats?.length || 0;
        console.log(`[deleteCoach] Coach ${coach.coach_number} has ${seatCount} seats`);

        // Delete all seats first
        const deletedSeats = await Seat.destroy({
            where: { coach_id: id }
        });

        console.log(`[deleteCoach] Deleted ${deletedSeats} seats`);

        // Delete the coach
        await coach.destroy();

        console.log(`[deleteCoach] Successfully deleted coach ${coach.coach_number}`);

        res.json({
            message: 'Coach deleted successfully',
            coach_number: coach.coach_number,
            seats_deleted: deletedSeats
        });
    } catch (error) {
        console.error('[deleteCoach] Error:', error.message);
        console.error('[deleteCoach] Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
};
