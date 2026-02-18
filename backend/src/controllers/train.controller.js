import {
  Coach,
  Seat,
  Station,
  Train,
  TrainRun,
  TrainStop,
} from "../models/index.js";

// Get train stops (via Runs)
export const getTrainStops = async (req, res) => {
  try {
    const { id } = req.params;
    const runs = await TrainRun.findAll({
      where: { train_id: id },
      include: [
        {
          model: TrainStop,
          as: "stops",
          include: [{ model: Station, as: "station" }],
          order: [["stop_order", "ASC"]],
        },
      ],
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
        status: "active",
      },
      include: [
        {
          model: TrainRun,
          as: "runs",
          include: [
            {
              model: Station,
              as: "sourceStation",
            },
            {
              model: Station,
              as: "destinationStation",
            },
          ],
        },
      ],
      order: [["train_name", "ASC"]],
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
      include: [
        {
          model: TrainRun,
          as: "runs",
          include: [
            { model: Station, as: "sourceStation" },
            { model: Station, as: "destinationStation" },
          ],
        },
        {
          model: Coach,
          as: "coaches",
          include: [{ model: Seat, as: "seats" }],
        },
      ],
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
      order: [["name", "ASC"]],
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

    const { Op } = await import("sequelize");
    const stations = await Station.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { code: { [Op.iLike]: `%${q}%` } },
        ],
      },
      limit: 20,
      order: [["name", "ASC"]],
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
    const { Op } = await import("sequelize");

    // Find stations
    const sourceWait = await Station.findOne({
      where: {
        [Op.or]: [
          { name: source },
          { code: source },
          { name: { [Op.iLike]: `%${source}%` } },
          { code: { [Op.iLike]: `%${source}%` } },
        ],
      },
    });
    const destWait = await Station.findOne({
      where: {
        [Op.or]: [
          { name: destination },
          { code: destination },
          { name: { [Op.iLike]: `%${destination}%` } },
          { code: { [Op.iLike]: `%${destination}%` } },
        ],
      },
    });

    if (!sourceWait || !destWait) return res.json([]);

    // Find stops
    const sourceStops = await TrainStop.findAll({
      where: { station_id: sourceWait.id },
    });
    const destStops = await TrainStop.findAll({
      where: { station_id: destWait.id },
    });

    // Match runs
    const validRuns = [];
    sourceStops.forEach((sStop) => {
      const dStop = destStops.find((ds) => ds.run_id === sStop.run_id);
      if (dStop && sStop.stop_order < dStop.stop_order) {
        validRuns.push({
          run_id: sStop.run_id,
          sourceStop: sStop,
          destStop: dStop,
        });
      }
    });

    if (validRuns.length === 0) return res.json([]);

    // Fetch Runs
    const runsData = await TrainRun.findAll({
      where: { run_id: validRuns.map((r) => r.run_id) },
      include: [
        {
          model: Train,
          as: "train",
          include: [
            {
              model: Coach,
              as: "coaches",
              include: [
                {
                  model: Seat,
                  as: "seats",
                  required: false,
                  // Note: Seat availability is determined by checking bookings,
                  // not by a status column. The frontend/seat selection page
                  // will check availability for the specific travel date.
                },
              ],
            },
          ],
        },
        { model: Station, as: "sourceStation" },
        { model: Station, as: "destinationStation" },
      ],
    });

    const results = runsData.map((run) => {
      const match = validRuns.find((r) => r.run_id === run.run_id);
      // Calculate duration simply
      const start = match.sourceStop.departure_time; // HH:MM:SS
      const end = match.destStop.arrival_time;
      // We can do better duration calc if we parse times, but for now just pass strings
      return {
        run_id: run.run_id,
        train_id: run.train_id,
        train_number: run.train.train_number,
        train_name: run.train.train_name,
        direction: run.direction,
        source: sourceWait.name,
        destination: destWait.name,
        departure_time: match.sourceStop.departure_time,
        arrival_time: match.destStop.arrival_time,
        duration: "Check Schedule", // match.stop_order diff?
        coaches: run.train.coaches,
      };
    });

    res.json(results);
  } catch (error) {
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

export const addTrainStops = async (req, res) => {
  try {
    const { id } = req.params; // run_id
    const stopsData = req.body.map((stop) => ({ ...stop, run_id: id }));
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
          as: "stops",
          include: [{ model: Station, as: "station" }],
        },
        { model: Train, as: "train" },
      ],
      order: [[{ model: TrainStop, as: "stops" }, "stop_order", "ASC"]],
    });
    if (!run) return res.status(404).json({ error: "Run not found" });
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoach = async (req, res) => {
  try {
    const { id } = req.params;
    const { coach_number, coach_type, total_seats, capacity } = req.body;

    if (!coach_number) {
      return res.status(400).json({ error: "Coach number is required" });
    }

    if (!coach_type) {
      return res.status(400).json({ error: "Coach type is required" });
    }

    const train = await Train.findByPk(id);
    if (!train) {
      return res.status(404).json({ error: "Train not found" });
    }

    const existingCoaches = await Coach.findAll({
      where: { train_id: id },
      order: [["sequence_order", "DESC"]],
      limit: 1,
    });
    const nextSequence =
      existingCoaches.length > 0 ? existingCoaches[0].sequence_order + 1 : 1;

    const actualCapacity = capacity || total_seats || 72;

    const coach = await Coach.create({
      coach_number,
      coach_type,
      capacity: actualCapacity,
      sequence_order: nextSequence,
      train_id: id,
    });

    const seatsToCreate = [];
    const type = String(coach_type).toUpperCase();

    let seatsPerRow;
    if (type === "SL" || type === "3E") {
      seatsPerRow = 8;
    } else if (["1A", "2A", "3A", "AC", "EC", "EA"].includes(type)) {
      seatsPerRow = 6;
    } else if (["CC", "2S"].includes(type)) {
      seatsPerRow = 5;
    } else {
      seatsPerRow = 8;
    }

    for (let i = 1; i <= actualCapacity; i++) {
      const posInRow = ((i - 1) % seatsPerRow) + 1;
      const row = Math.floor((i - 1) / seatsPerRow) + 1;

      let berth_type = "LB";
      let is_side_berth = false;
      let column_index = posInRow - 1;

      if (type === "SL" || type === "3E") {
        switch (posInRow) {
          case 1:
            berth_type = "LB";
            column_index = 0;
            break;
          case 2:
            berth_type = "MB";
            column_index = 1;
            break;
          case 3:
            berth_type = "UB";
            column_index = 2;
            break;
          case 4:
            berth_type = "LB";
            column_index = 3;
            break;
          case 5:
            berth_type = "MB";
            column_index = 4;
            break;
          case 6:
            berth_type = "UB";
            column_index = 5;
            break;
          case 7:
            berth_type = "SL";
            is_side_berth = true;
            column_index = 6;
            break;
          case 8:
            berth_type = "SU";
            is_side_berth = true;
            column_index = 7;
            break;
        }
      } else if (["1A", "2A", "3A", "AC", "EC", "EA"].includes(type)) {
        switch (posInRow) {
          case 1:
            berth_type = "LB";
            column_index = 0;
            break;
          case 2:
            berth_type = "UB";
            column_index = 1;
            break;
          case 3:
            berth_type = "LB";
            column_index = 2;
            break;
          case 4:
            berth_type = "UB";
            column_index = 3;
            break;
          case 5:
            berth_type = "SL";
            is_side_berth = true;
            column_index = 4;
            break;
          case 6:
            berth_type = "SU";
            is_side_berth = true;
            column_index = 5;
            break;
        }
      } else if (["CC", "2S"].includes(type)) {
        switch (posInRow) {
          case 1:
            berth_type = "WS";
            column_index = 0;
            break;
          case 2:
            berth_type = "MS";
            column_index = 1;
            break;
          case 3:
            berth_type = "AS";
            column_index = 2;
            break;
          case 4:
            berth_type = "MS";
            column_index = 3;
            break;
          case 5:
            berth_type = "WS";
            column_index = 4;
            break;
        }
      }

      seatsToCreate.push({
        seat_number: i,
        berth_type,
        row_number: row,
        is_side_berth,
        column_index,
        coach_id: coach.coach_id,
      });
    }

    await Seat.bulkCreate(seatsToCreate);

    const coachWithSeats = await Coach.findByPk(coach.coach_id, {
      include: [{ model: Seat, as: "seats" }],
    });

    res.status(201).json(coachWithSeats);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        error: "A coach with this number already exists for this train",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: error.errors.map((e) => e.message).join(", "),
      });
    }

    res.status(500).json({ error: error.message });
  }
};

export const deleteCoach = async (req, res) => {
  try {
    const { id } = req.params;

    const coach = await Coach.findByPk(id, {
      include: [
        {
          model: Seat,
          as: "seats",
        },
      ],
    });

    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const seatCount = coach.seats?.length || 0;

    await Seat.destroy({
      where: { coach_id: id },
    });

    await coach.destroy();

    res.json({
      message: "Coach deleted successfully",
      coach_number: coach.coach_number,
      seats_deleted: seatCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
