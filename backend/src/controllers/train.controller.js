import { Op } from "sequelize";
import {
  Booking,
  Coach,
  FareRule,
  Passenger,
  Seat,
  SeatTypePricing,
  Station,
  Train,
  TrainRun,
  TrainStop
} from "../models/index.js";
import { getFaresForCoach } from "../services/fareCalculator.service.js";
import { activeLocks } from "../sockets.js";

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
      where: { status: "active" },
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
          attributes: ["coach_id", "coach_number", "coach_type", "capacity", "sequence_order"],
        },
      ],
      order: [["train_name", "ASC"]],
    });

    // Sequelize ignores order inside nested includes — sort in JS
    const sorted = trains.map((train) => {
      const t = train.toJSON();
      t.coaches = (t.coaches || []).sort((a, b) => a.sequence_order - b.sequence_order);
      return t;
    });

    res.json(sorted);
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

    // Sort coaches by sequence_order (Sequelize ignores order in nested includes)
    const result = train.toJSON();
    result.coaches = (result.coaches || []).sort((a, b) => a.sequence_order - b.sequence_order);

    res.json(result);
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

// Helper: compute duration string from two HH:MM:SS time strings
const calcDuration = (depTime, arrTime) => {
  if (!depTime || !arrTime) return "N/A";
  const toMins = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMins(arrTime) - toMins(depTime);
  if (diff < 0) diff += 24 * 60; // overnight journey
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

// Calculate fares for a coach
export const calculateJourneyFare = async (req, res) => {
  try {
    const { distance, trainType, coachType, berthTypes } = req.body;

    if (!distance || !trainType || !coachType || !berthTypes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fares = await getFaresForCoach({
      distance: Number(distance),
      trainType,
      coachType,
      berthTypes,
    });

    res.json(fares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const seedFaresController = async (req, res) => {
  try {
    await FareRule.sync({ force: true });
    await SeatTypePricing.sync({ force: true });

    const fareRules = [
      { train_type: "EXPRESS", coach_type: "3A", base_fare: 500, per_km_rate: 1.80, min_distance: 300, reservation_charge: 40, gst_percent: 5 },
      { train_type: "EXPRESS", coach_type: "2A", base_fare: 800, per_km_rate: 2.50, min_distance: 300, reservation_charge: 50, gst_percent: 5 },
      { train_type: "EXPRESS", coach_type: "1A", base_fare: 1200, per_km_rate: 3.50, min_distance: 300, reservation_charge: 60, gst_percent: 5 },
      { train_type: "EXPRESS", coach_type: "CC", base_fare: 300, per_km_rate: 1.20, min_distance: 100, reservation_charge: 40, gst_percent: 5 },
      { train_type: "EXPRESS", coach_type: "2S", base_fare: 100, per_km_rate: 0.45, min_distance: 100, reservation_charge: 15, gst_percent: 0 },
      { train_type: "EXPRESS", coach_type: "SL", base_fare: 150, per_km_rate: 0.60, min_distance: 200, reservation_charge: 20, gst_percent: 0 },
      // Generic AC Fallback
      { train_type: "EXPRESS", coach_type: "AC", base_fare: 600, per_km_rate: 2.00, min_distance: 300, reservation_charge: 45, gst_percent: 5 },

      // SUPERFAST TRAINS (+surcharge)
      { train_type: "SUPERFAST", coach_type: "SL", base_fare: 180, per_km_rate: 0.65, min_distance: 200, reservation_charge: 20, superfast_charge: 30, gst_percent: 0 },
      { train_type: "SUPERFAST", coach_type: "3A", base_fare: 550, per_km_rate: 1.90, min_distance: 300, reservation_charge: 40, superfast_charge: 45, gst_percent: 5 },
      { train_type: "SUPERFAST", coach_type: "2A", base_fare: 900, per_km_rate: 2.70, min_distance: 300, reservation_charge: 50, superfast_charge: 45, gst_percent: 5 },
      { train_type: "SUPERFAST", coach_type: "1A", base_fare: 1400, per_km_rate: 3.80, min_distance: 300, reservation_charge: 60, superfast_charge: 75, gst_percent: 5 },
      { train_type: "SUPERFAST", coach_type: "CC", base_fare: 350, per_km_rate: 1.30, min_distance: 100, reservation_charge: 40, superfast_charge: 45, gst_percent: 5 },
      { train_type: "SUPERFAST", coach_type: "AC", base_fare: 700, per_km_rate: 2.20, min_distance: 300, reservation_charge: 50, superfast_charge: 55, gst_percent: 5 },

      // LOCAL TRAINS (cheaper)
      { train_type: "LOCAL", coach_type: "2S", base_fare: 10, per_km_rate: 0.30, min_distance: 0, reservation_charge: 0, gst_percent: 0 },
    ];
    await FareRule.bulkCreate(fareRules);

    const seatMultipliers = [
      { coach_type: "SL", seat_type: "LOWER", price_multiplier: 1.10 },
      { coach_type: "SL", seat_type: "SIDE_LOWER", price_multiplier: 1.15 },
      { coach_type: "SL", seat_type: "MIDDLE", price_multiplier: 0.95 },
      { coach_type: "SL", seat_type: "UPPER", price_multiplier: 0.90 },
      { coach_type: "SL", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },

      { coach_type: "3A", seat_type: "LOWER", price_multiplier: 1.10 },
      { coach_type: "3A", seat_type: "SIDE_LOWER", price_multiplier: 1.15 },
      { coach_type: "3A", seat_type: "MIDDLE", price_multiplier: 0.95 },
      { coach_type: "3A", seat_type: "UPPER", price_multiplier: 0.90 },
      { coach_type: "3A", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },

      { coach_type: "AC", seat_type: "LOWER", price_multiplier: 1.10 },
      { coach_type: "AC", seat_type: "SIDE_LOWER", price_multiplier: 1.15 },
      { coach_type: "AC", seat_type: "MIDDLE", price_multiplier: 0.95 },
      { coach_type: "AC", seat_type: "UPPER", price_multiplier: 0.90 },
      { coach_type: "AC", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },

      { coach_type: "CC", seat_type: "WINDOW", price_multiplier: 1.10 },
      { coach_type: "CC", seat_type: "AISLE", price_multiplier: 1.00 },
      { coach_type: "CC", seat_type: "MIDDLE", price_multiplier: 0.90 },
    ];
    await SeatTypePricing.bulkCreate(seatMultipliers);

    res.json({ message: "Seeded fares successfully" });
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

      // Calculate distance between source and destination stops
      const srcDist = parseFloat(match.sourceStop.distance_from_source) || 0;
      const dstDist = parseFloat(match.destStop.distance_from_source) || 0;
      const distance_km = Math.round(Math.abs(dstDist - srcDist));

      // Group coaches by type for a summary
      const coachSummary = {};
      (run.train.coaches || []).forEach((coach) => {
        const type = coach.coach_type || "GEN";
        if (!coachSummary[type]) {
          coachSummary[type] = { coach_type: type, count: 0, total_seats: 0 };
        }
        coachSummary[type].count += 1;
        coachSummary[type].total_seats += coach.capacity || (coach.seats ? coach.seats.length : 0);
      });

      // ── Departure Validation ──────────────────────────────────────────────
      // Compute isExpired: only relevant when the search date is TODAY (in IST).
      // Departure times stored in DB are in IST (Indian Standard Time, UTC+5:30).
      // A train is "expired" if the current IST time > departureTime + GRACE_PERIOD_MINS.
      const GRACE_PERIOD_MINS = 5;
      const IST_OFFSET_MINS = 5 * 60 + 30; // 330 minutes ahead of UTC

      const nowUtc = new Date();
      // Derive the current IST date string (YYYY-MM-DD) regardless of server timezone
      const nowIstMs = nowUtc.getTime() + IST_OFFSET_MINS * 60 * 1000;
      const nowIst = new Date(nowIstMs);
      const todayIstStr = nowIst.toISOString().slice(0, 10); // "YYYY-MM-DD" in IST

      // The search date comes in as "YYYY-MM-DD" (chosen by user in IST)
      const isToday = date === todayIstStr;

      const departureTimeStr = match.sourceStop.departure_time; // "HH:MM:SS" or "HH:MM"
      let isExpired = false;

      if (isToday && departureTimeStr) {
        const [depH, depM] = departureTimeStr.split(":").map(Number);
        const depTotalMins = depH * 60 + depM;
        // Current time in IST as minutes-since-midnight
        const nowIstHours = nowIst.getUTCHours();   // getUTCHours on the shifted Date = IST hours
        const nowIstMins  = nowIst.getUTCMinutes();
        const nowTotalMins = nowIstHours * 60 + nowIstMins;
        // Expired if current IST time has passed the departure + grace window
        isExpired = nowTotalMins > depTotalMins + GRACE_PERIOD_MINS;
      }
      // ──────────────────────────────────────────────────────────────────────

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
        duration: calcDuration(match.sourceStop.departure_time, match.destStop.arrival_time),
        distance_km,
        coaches: run.train.coaches,
        coach_summary: Object.values(coachSummary),
        isExpired,
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

    // Non-passenger coaches (engine, parcel van) have no seats.
    // GEN coaches are bookable but use a single sentinel seat rather than
    // individual physical seat records — see below.
    const NO_SEAT_COACHES = ['ENG', 'PCL'];
    const isNonPassenger = NO_SEAT_COACHES.includes(String(coach_type).toUpperCase());
    const isGen = String(coach_type).toUpperCase() === 'GEN';
    const GEN_DEFAULT_CAPACITY = 100;
    const actualCapacity = isNonPassenger ? 0 : isGen ? (capacity || total_seats || GEN_DEFAULT_CAPACITY) : (capacity || total_seats || 72);

    const coach = await Coach.create({
      coach_number,
      coach_type,
      capacity: actualCapacity,
      sequence_order: nextSequence,
      train_id: id,
    });

    // ENG/PCL coaches have no seats — return immediately
    if (isNonPassenger) {
      return res.status(201).json(coach);
    }

    // GEN coaches: create ONE sentinel seat (seat_number=0) that acts as the
    // FK anchor for all passenger records. No physical berth rows are generated.
    if (isGen) {
      await Seat.create({
        seat_number: 0,
        berth_type: 'LB',
        row_number: 0,
        is_side_berth: false,
        column_index: 0,
        coach_id: coach.coach_id,
      });
      const coachWithSentinel = await Coach.findByPk(coach.coach_id, {
        include: [{ model: Seat, as: 'seats' }],
      });
      return res.status(201).json(coachWithSentinel);
    }

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

// Check availability for entire train (returns booked seat IDs)
export const getTrainAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, source, destination } = req.query;

    if (!date || !source || !destination) {
      return res.status(400).json({ error: "Date, source, and destination required" });
    }

    // 1. Find Run & Route Order
    const runs = await TrainRun.findAll({
      where: { train_id: id, status: 'active' },
      include: [
        {
          model: TrainStop,
          as: 'stops',
          include: [{ model: Station, as: 'station' }]
        }
      ]
    });

    let stationMap = new Map(); // Name -> Order
    let reqStartOrder = -1;
    let reqEndOrder = -1;
    let foundRoute = false;

    const norm = (s) => String(s || "").trim().toUpperCase();
    const sourceNorm = norm(source);
    const destNorm = norm(destination);

    for (const run of runs) {
      const stops = run.stops || [];
      const startNode = stops.find(s => norm(s.station?.name) === sourceNorm || norm(s.station?.code) === sourceNorm);
      const endNode = stops.find(s => norm(s.station?.name) === destNorm || norm(s.station?.code) === destNorm);

      if (startNode && endNode && startNode.stop_order < endNode.stop_order) {
        reqStartOrder = startNode.stop_order;
        reqEndOrder = endNode.stop_order;
        foundRoute = true;

        stops.forEach(s => {
          if (s.station) {
            stationMap.set(norm(s.station.name), s.stop_order);
            stationMap.set(norm(s.station.code), s.stop_order);
          }
        });
        break;
      }
    }

    if (!foundRoute) {
      // If route not found, maybe invalid station names or wrong direction
      // Return empty booked set? Or error? Error implies broken flow.
      return res.status(400).json({ error: "Invalid route segment" });
    }

    // 2. Fetch Confirmed/Pending Bookings
    const bookings = await Booking.findAll({
      where: {
        train_id: id,
        travel_date: date,
        booking_status: { [Op.in]: ['confirmed', 'pending'] }
      },
      include: [{ model: Passenger, as: 'passengers', attributes: ['seat_id'] }]
    });

    // 3. Check Overlap & Collect Seats
    const bookedSeatIds = new Set();
    const P = reqStartOrder;
    const Q = reqEndOrder;

    for (const bk of bookings) {
      const startOrder = stationMap.get(norm(bk.source_station));
      const endOrder = stationMap.get(norm(bk.destination_station));

      // Fallback: if booking stations not in current route, ASSUME OVERLAP for safety
      if (startOrder === undefined || endOrder === undefined) {
        bk.passengers.forEach(p => bookedSeatIds.add(p.seat_id));
        continue;
      }

      // Overlap Logic: P < Y && Q > X
      // Request: P->Q. Existing: X->start, Y->end
      if (P < endOrder && Q > startOrder) {
        bk.passengers.forEach(p => bookedSeatIds.add(p.seat_id));
      }
    }

    // 4. Fetch Active In-Memory Locks for this Date
    const lockedIds = [];
    const now = new Date();
    for (const [key, lock] of activeLocks.entries()) {
      if (lock.trainId === id && lock.date === date && lock.expiresAt > now) {
        const lockStartOrder = stationMap.get(norm(lock.source));
        const lockEndOrder = stationMap.get(norm(lock.destination));

        if (lockStartOrder === undefined || lockEndOrder === undefined) {
          // Fallback: if lock stations not found in current route, ASSUME OVERLAP
          lockedIds.push(lock.seatId);
        } else if (P < lockEndOrder && Q > lockStartOrder) {
          // Overlap Logic: P < Y && Q > X
          lockedIds.push(lock.seatId);
        }
      }
    }

    res.json({ bookedSeatIds: Array.from(bookedSeatIds), lockedSeatIds: lockedIds });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GEN Coach availability (occupancy count) ────────────────────────────────
// GET /api/trains/:id/gen-availability?date=YYYY-MM-DD&passengerCount=N
// Returns how many GEN seats are total vs already booked for this date,
// and performs a pre-flight check against the requested passenger count.
export const getGenAvailability = async (req, res) => {
  try {
    const { id } = req.params;             // train_id
    const { date, passengerCount } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    // 1. Find all GEN coaches for this train and their sentinel seats
    const genCoaches = await Coach.findAll({
      where: { train_id: id, coach_type: 'GEN' },
      include: [{ model: Seat, as: 'seats' }],
    });

    if (genCoaches.length === 0) {
      return res.status(404).json({ error: 'No GEN coaches found for this train.' });
    }

    const totalCapacity = genCoaches.reduce((sum, c) => sum + (c.capacity || 0), 0);

    // Collect all sentinel seat IDs
    const sentinelSeatIds = genCoaches
      .flatMap(c => c.seats || [])
      .map(s => s.seat_id);

    // 2. Count passengers already booked/pending in GEN on this date
    let bookedCount = 0;
    if (sentinelSeatIds.length > 0) {

      const bookings = await Booking.findAll({
        where: {
          train_id: id,
          travel_date: date,
          booking_status: { [Op.in]: ['confirmed', 'pending'] },
        },
        include: [{
          model: Passenger,
          as: 'passengers',
          where: { seat_id: { [Op.in]: sentinelSeatIds } },
          required: true,
        }],
      });
      bookedCount = bookings.reduce((sum, b) => sum + (b.passengers?.length || 0), 0);
    }

    const remaining = Math.max(0, totalCapacity - bookedCount);
    const requested = parseInt(passengerCount) || 1;
    const canBook = remaining >= requested;

    return res.json({
      totalCapacity,
      bookedCount,
      remaining,
      canBook,
      genCoaches: genCoaches.map(c => ({
        coach_id: c.coach_id,
        coach_number: c.coach_number,
        capacity: c.capacity,
        sentinelSeatId: c.seats?.[0]?.seat_id ?? null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
