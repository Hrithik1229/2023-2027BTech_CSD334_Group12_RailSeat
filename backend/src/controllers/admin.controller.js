import { FareRule, sequelize, Station, Train, TrainRun, TrainStop, User } from "../models/index.js";

// ... (existing functions)

// Update Route (Full Replacement)
export const updateRoute = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // run_id
    const stops = req.body.stops; // Array of stop objects
    console.log(
      `[updateRoute] - Received request for run_id: ${id}, stops:`,
      JSON.stringify(stops, null, 2)
    );

    // Validate basic rules
    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      console.log("[updateRoute] - Validation failed: Less than 2 stops.");
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Route must have at least 2 stops." });
    }

    // Verify the run exists
    const run = await TrainRun.findByPk(id, { transaction: t });
    if (!run) {
      console.log(`[updateRoute] - Run not found: ${id}`);
      await t.rollback();
      return res.status(404).json({ error: "Train run not found." });
    }

    // Validate each stop
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      // Validate station_id
      if (!stop.station_id || isNaN(parseInt(stop.station_id))) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid station_id at stop ${i + 1}. Must be a valid number.`
        });
      }

      // Verify station exists
      const station = await Station.findByPk(stop.station_id, { transaction: t });
      if (!station) {
        await t.rollback();
        return res.status(400).json({
          error: `Station with ID ${stop.station_id} not found at stop ${i + 1}.`
        });
      }

      // Validate distance_from_source
      const distance = parseFloat(stop.distance_from_source);
      if (isNaN(distance) || distance < 0) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid distance_from_source at stop ${i + 1}. Must be a non-negative number.`
        });
      }

      // Validate halt_duration
      const haltDuration = parseInt(stop.halt_duration);
      if (isNaN(haltDuration) || haltDuration < 0) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid halt_duration at stop ${i + 1}. Must be a non-negative integer.`
        });
      }

      // Validate time formats (HH:MM:SS or HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (stop.arrival_time && !timeRegex.test(stop.arrival_time)) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid arrival_time format at stop ${i + 1}. Use HH:MM or HH:MM:SS.`
        });
      }
      if (stop.departure_time && !timeRegex.test(stop.departure_time)) {
        await t.rollback();
        return res.status(400).json({
          error: `Invalid departure_time format at stop ${i + 1}. Use HH:MM or HH:MM:SS.`
        });
      }

      // First stop should have departure time
      if (i === 0 && !stop.departure_time) {
        console.warn(`[updateRoute] - Warning: First stop missing departure_time`);
      }

      // Last stop should have arrival time
      if (i === stops.length - 1 && !stop.arrival_time) {
        console.warn(`[updateRoute] - Warning: Last stop missing arrival_time`);
      }

      // Middle stops should have both times
      if (i > 0 && i < stops.length - 1) {
        if (!stop.arrival_time || !stop.departure_time) {
          console.warn(`[updateRoute] - Warning: Intermediate stop ${i + 1} missing arrival or departure time`);
        }
      }
    }

    // 1. Delete existing stops
    console.log(`[updateRoute] - Deleting existing stops for run_id: ${id}`);
    const deletedCount = await TrainStop.destroy({
      where: { run_id: id },
      transaction: t,
    });
    console.log(`[updateRoute] - Deleted ${deletedCount} existing stops for run_id: ${id}`);

    // 2. Prepare new stops data with proper type conversion
    const stopsData = stops.map((stop, index) => ({
      run_id: parseInt(id),
      station_id: parseInt(stop.station_id),
      stop_order: index + 1,
      arrival_time: stop.arrival_time || null,
      departure_time: stop.departure_time || null,
      halt_duration: parseInt(stop.halt_duration) || 0,
      distance_from_source: parseFloat(stop.distance_from_source) || 0,
    }));
    console.log(
      "[updateRoute] - Prepared new stops data:",
      JSON.stringify(stopsData, null, 2)
    );

    const createdStops = await TrainStop.bulkCreate(stopsData, {
      transaction: t,
      validate: true,
    });
    console.log(`[updateRoute] - Created ${createdStops.length} new stops.`);

    // 3. Update Run source/dest and times based on new stops
    const sourceStop = stopsData[0];
    const destStop = stopsData[stopsData.length - 1];

    // Calculate departure time (from first stop)
    const departureTime = sourceStop.departure_time;

    // Calculate arrival time (from last stop)
    const arrivalTime = destStop.arrival_time;

    // Calculate duration if both times are available
    let duration = null;
    if (departureTime && arrivalTime) {
      try {
        // Parse times (format: HH:MM or HH:MM:SS)
        const parseTime = (timeStr) => {
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          return hours * 60 + minutes; // Convert to minutes
        };

        const depMinutes = parseTime(departureTime);
        const arrMinutes = parseTime(arrivalTime);

        // Calculate duration in minutes (handle overnight journeys)
        let durationMinutes = arrMinutes - depMinutes;
        if (durationMinutes < 0) {
          durationMinutes += 24 * 60; // Add 24 hours if overnight
        }

        // Convert to HH:MM format
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        duration = `${hours}h ${minutes}m`;

        console.log(`[updateRoute] - Calculated duration: ${duration} (${durationMinutes} minutes)`);
      } catch (error) {
        console.warn(`[updateRoute] - Failed to calculate duration:`, error.message);
      }
    }

    console.log(
      `[updateRoute] - Updating TrainRun ${id}:`,
      `\n  source_station_id: ${sourceStop.station_id}`,
      `\n  destination_station_id: ${destStop.station_id}`,
      `\n  departure_time: ${departureTime || 'NULL'}`,
      `\n  arrival_time: ${arrivalTime || 'NULL'}`,
      `\n  duration: ${duration || 'NULL'}`
    );

    const updateData = {
      source_station_id: sourceStop.station_id,
      destination_station_id: destStop.station_id,
      departure_time: departureTime,
      arrival_time: arrivalTime,
    };

    // Only add duration if it was calculated
    if (duration) {
      updateData.duration = duration;
    }

    const [updateCount] = await TrainRun.update(
      updateData,
      {
        where: { run_id: id },
        transaction: t,
      }
    );
    console.log(`[updateRoute] - TrainRun ${id} updated successfully. Rows affected: ${updateCount}`);

    console.log("[updateRoute] - Committing transaction.");
    await t.commit();
    console.log("[updateRoute] - Transaction committed successfully.");
    res.json({
      message: "Route updated successfully",
      count: createdStops.length,
      stops: createdStops,
    });
  } catch (error) {
    if (t) {
      console.error(
        "[updateRoute] - Transaction rolling back due to error:",
        error.message,
        error.stack
      );
      await t.rollback();
    }
    console.error("[updateRoute] - Full error details:", error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalTrains = await Train.count();
    const totalRuns = await TrainRun.count();

    console.log("TrainRun associations:", Object.keys(TrainRun.associations));

    const activeRuns = await TrainRun.count({
      // Logic for "today active" would require checking days_of_run against current day
      // Simplified: just return total active trains
      include: [{ model: Train, as: "train", where: { status: "active" } }],
    });

    // Routes with missing timetable (runs with < 2 stops)
    const runsWithStops = await TrainRun.findAll({
      include: [{ model: TrainStop, as: "stops" }],
    });
    const missingTimetable = runsWithStops.filter(
      (r) => r.stops.length < 2
    ).length;

    res.json({
      totalTrains,
      totalRuns,
      activeRuns,
      missingTimetable,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create Reverse Run Logic
export const createReverseRun = async (req, res) => {
  const t = await sequelize.transaction(); // Added Transaction
  try {
    const { id } = req.params;
    const { startTime } = req.body;

    const originalRun = await TrainRun.findByPk(id, {
      include: [{ model: TrainStop, as: "stops", order: [['stop_order', 'ASC']] }],
      transaction: t
    });

    if (!originalRun) throw new Error("Run not found");

    const totalDistance = Math.max(...originalRun.stops.map(s => s.distance_from_source));

    const newRun = await TrainRun.create({
      train_id: originalRun.train_id,
      direction: originalRun.direction === "UP" ? "DOWN" : "UP",
      source_station_id: originalRun.destination_station_id,
      destination_station_id: originalRun.source_station_id,
      days_of_run: originalRun.days_of_run,
      status: "active",
    }, { transaction: t });

    // ... (Your segment calculation logic is generally sound)

    const reversedStopsData = originalRun.stops.reverse().map((stop, i) => {
      // Calculate reverse distance:
      const revDistance = totalDistance - stop.distance_from_source;

      return {
        run_id: newRun.run_id,
        station_id: stop.station_id,
        stop_order: i + 1,
        // ... (Insert calculated times here)
        distance_from_source: revDistance
      };
    });

    await TrainStop.bulkCreate(reversedStopsData, { transaction: t });
    await t.commit();

    res.json({ message: "Reverse route created successfully" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// --- Stations ---
export const getStations = async (req, res) => {
  try {
    const stations = await Station.findAll({ order: [["name", "ASC"]] });
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
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
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
