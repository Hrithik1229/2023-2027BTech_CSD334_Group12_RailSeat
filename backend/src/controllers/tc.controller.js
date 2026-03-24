import { Op } from "sequelize";
import { Booking, Coach, Passenger, Seat, Train, TrainRun, sequelize } from "../models/index.js";

/**
 * Search trains by train_name or train_number
 * GET /api/tc/trains/search?q=<query>
 */
export const searchTrains = async (req, res) => {
  try {
    const { q } = req.query;

    const whereClause = { status: "active" };
    if (q && q.trim().length > 0) {
      whereClause[Op.or] = [
        { train_name: { [Op.iLike]: `%${q}%` } },
        { train_number: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const trains = await Train.findAll({
      where: whereClause,
      include: [
        {
          model: Coach,
          as: "coaches",
          attributes: ["coach_id", "coach_number", "coach_type", "sequence_order", "capacity"],
          separate: true,
          order: [["sequence_order", "ASC"]],
        },
      ],
      order: [["train_name", "ASC"]],
      limit: 20,
    });

    res.json(trains);
  } catch (error) {
    console.error("[TC] searchTrains error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get coaches for a specific train
 * GET /api/tc/trains/:trainId/coaches
 */
export const getCoaches = async (req, res) => {
  try {
    const { trainId } = req.params;
    const coaches = await Coach.findAll({
      where: { train_id: trainId },
      order: [["sequence_order", "ASC"]],
    });
    res.json(coaches);
  } catch (error) {
    console.error("[TC] getCoaches error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get manifest (booked passengers) for a specific coach on a travel date
 * GET /api/tc/manifest?coachId=<id>&travelDate=<YYYY-MM-DD>
 */
export const getManifest = async (req, res) => {
  try {
    const { coachId, travelDate } = req.query;

    if (!coachId || !travelDate) {
      return res.status(400).json({ error: "coachId and travelDate are required" });
    }

    // Get coach info to know the train_id
    const coach = await Coach.findByPk(coachId, {
      include: [{ model: Train, as: "train" }],
    });

    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    // Get all seats in this coach
    const seats = await Seat.findAll({
      where: { coach_id: coachId },
      order: [["seat_number", "ASC"]],
    });

    const seatIds = seats.map((s) => s.seat_id);

    // Find passengers booked on these seats for the travel date
    const passengers = await Passenger.findAll({
      where: { seat_id: { [Op.in]: seatIds } },
      include: [
        {
          model: Booking,
          as: "booking",
          where: {
            train_id: coach.train_id,
            travel_date: travelDate,
            booking_status: { [Op.in]: ["confirmed", "pending"] },
            payment_status: { [Op.in]: ["paid", "pending"] },
          },
          include: [{ model: Train, as: "train" }],
        },
        {
          model: Seat,
          as: "seat",
          include: [{ model: Coach, as: "coach" }],
        },
      ],
      order: [[{ model: Seat, as: "seat" }, "seat_number", "ASC"]],
    });

    // Build manifest entries
    const manifest = passengers.map((p) => ({
      passenger_id: p.id,
      passenger_name: p.passenger_name,
      passenger_gender: p.passenger_gender,
      booking_number: p.booking?.booking_number,
      booking_id: p.booking?.booking_id,
      contact_name: p.booking?.contact_name,
      source_station: p.booking?.source_station,
      destination_station: p.booking?.destination_station,
      seat_id: p.seat?.seat_id,
      seat_number: p.seat?.seat_number,
      berth_type: p.seat?.berth_type,
      seat_status: p.seat?.status, // available/booked/occupied
      coach_number: p.seat?.coach?.coach_number,
      coach_type: p.seat?.coach?.coach_type,
    }));

    // Compute verification metrics
    const totalBookings = manifest.length;
    const verifiedCount = manifest.filter((m) => m.seat_status === "occupied").length;
    const verificationRate = totalBookings > 0 ? ((verifiedCount / totalBookings) * 100).toFixed(1) : "0.0";

    res.json({
      coach: {
        coach_id: coach.coach_id,
        coach_number: coach.coach_number,
        coach_type: coach.coach_type,
        train_name: coach.train?.train_name,
        train_number: coach.train?.train_number,
      },
      travelDate,
      manifest,
      metrics: {
        totalBookings,
        verifiedCount,
        pendingCount: totalBookings - verifiedCount,
        verificationRate: `${verificationRate}%`,
      },
    });
  } catch (error) {
    console.error("[TC] getManifest error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update seat attendance — mark a seat as 'occupied'
 * PATCH /api/tc/seats/:seatId/verify
 */
export const updateSeatAttendance = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { action } = req.body; // 'verify' or 'unverify'

    const seat = await Seat.findByPk(seatId);
    if (!seat) {
      return res.status(404).json({ error: "Seat not found" });
    }

    if (action === "unverify") {
      seat.status = "booked";
    } else {
      seat.status = "occupied";
    }

    await seat.save();

    res.json({
      message: action === "unverify" ? "Seat unverified" : "Seat verified as occupied",
      seat: {
        seat_id: seat.seat_id,
        seat_number: seat.seat_number,
        status: seat.status,
      },
    });
  } catch (error) {
    console.error("[TC] updateSeatAttendance error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get overall verification metrics for a train on a date
 * GET /api/tc/metrics?trainId=<id>&travelDate=<YYYY-MM-DD>
 */
export const getVerificationMetrics = async (req, res) => {
  try {
    const { trainId, travelDate } = req.query;

    if (!trainId || !travelDate) {
      return res.status(400).json({ error: "trainId and travelDate are required" });
    }

    // Get all coaches for this train
    const coaches = await Coach.findAll({
      where: { train_id: trainId },
      order: [["sequence_order", "ASC"]],
    });

    const coachMetrics = [];
    let totalBookings = 0;
    let totalVerified = 0;

    for (const coach of coaches) {
      const seats = await Seat.findAll({
        where: { coach_id: coach.coach_id },
      });

      const seatIds = seats.map((s) => s.seat_id);

      const bookedCount = await Passenger.count({
        where: { seat_id: { [Op.in]: seatIds } },
        include: [
          {
            model: Booking,
            as: "booking",
            where: {
              train_id: trainId,
              travel_date: travelDate,
              booking_status: { [Op.in]: ["confirmed", "pending"] },
              payment_status: { [Op.in]: ["paid", "pending"] },
            },
          },
        ],
      });

      const occupiedSeats = seats.filter((s) => s.status === "occupied").length;

      coachMetrics.push({
        coach_id: coach.coach_id,
        coach_number: coach.coach_number,
        coach_type: coach.coach_type,
        totalBookings: bookedCount,
        verifiedCount: occupiedSeats,
        pendingCount: bookedCount - occupiedSeats,
      });

      totalBookings += bookedCount;
      totalVerified += occupiedSeats;
    }

    const verificationRate = totalBookings > 0 ? ((totalVerified / totalBookings) * 100).toFixed(1) : "0.0";

    res.json({
      trainId: parseInt(trainId),
      travelDate,
      totalBookings,
      totalVerified,
      totalPending: totalBookings - totalVerified,
      verificationRate: `${verificationRate}%`,
      coachBreakdown: coachMetrics,
    });
  } catch (error) {
    console.error("[TC] getVerificationMetrics error:", error);
    res.status(500).json({ error: error.message });
  }
};
