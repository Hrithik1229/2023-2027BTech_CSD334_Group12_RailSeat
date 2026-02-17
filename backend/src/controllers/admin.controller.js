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

    // 1. Delete existing stops
    console.log(`[updateRoute] - Deleting existing stops for run_id: ${id}`);
    await TrainStop.destroy({
      where: { run_id: id },
      transaction: t,
    });
    console.log(`[updateRoute] - Existing stops deleted for run_id: ${id}`);

    // 2. Prepare new stops data
    const stopsData = stops.map((stop, index) => ({
      run_id: id,
      station_id: stop.station_id,
      stop_order: index + 1,
      arrival_time: stop.arrival_time || null,
      departure_time: stop.departure_time || null,
      halt_duration: stop.halt_duration || 0,
      distance_from_source: stop.distance_from_source || 0,
    }));
    console.log(
      "[updateRoute] - Prepared new stops data:",
      JSON.stringify(stopsData, null, 2)
    );

    const createdStops = await TrainStop.bulkCreate(stopsData, {
      transaction: t,
    });
    console.log(`[updateRoute] - Created ${createdStops.length} new stops.`);

    // 3. Update Run source/dest if changed based on new stops
    const sourceStop = stopsData[0];
    const destStop = stopsData[stopsData.length - 1];
    console.log(
      `[updateRoute] - Updating TrainRun ${id} with source_station_id: ${sourceStop.station_id}, destination_station_id: ${destStop.station_id}`
    );

    // This assumes sourceStop.station_id is correct.
    // Ideally user passes correct data.
    await TrainRun.update(
      {
        source_station_id: sourceStop.station_id,
        destination_station_id: destStop.station_id,
      },
      {
        where: { run_id: id },
        transaction: t,
      }
    );
    console.log(`[updateRoute] - TrainRun ${id} updated successfully.`);

    console.log("[updateRoute] - Committing transaction.");
    await t.commit();
    console.log("[updateRoute] - Transaction committed successfully.");
    res.json({
      message: "Route updated successfully",
      count: createdStops.length,
    });
  } catch (error) {
    if (t) {
      console.error(
        "[updateRoute] - Transaction rolling back due to error:",
        error.message
      );
      await t.rollback();
    }
    res.status(500).json({ error: error.message });
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
