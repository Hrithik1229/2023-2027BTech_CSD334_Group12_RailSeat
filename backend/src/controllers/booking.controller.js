import { Booking, Coach, Passenger, Seat, Train } from "../models/index.js";
import { activeLocks, getIO } from "../sockets.js";

// Generate unique booking number
// Generate unique 10-digit booking number
const generateBookingNumber = async () => {
  let pnr;
  let isUnique = false;
  while (!isUnique) {
    pnr = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const existing = await Booking.findOne({ where: { booking_number: pnr } });
    if (!existing) isUnique = true;
  }
  return pnr;
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const {
      contactName,
      email,
      trainId,
      sourceStation,
      destinationStation,
      travelDate,
      passengers,
      seats, // Expects [{ seatId, price }, ...]
      userId,
      socketId, // For seat locking validation
      totalAmount: requestTotalAmount // Optional direct total
    } = req.body;

    // Calculate total amount from payload if not provided directly
    // (We trust frontend price here as we don't have distance/fare-rules readily available to re-calc)
    let totalAmount = requestTotalAmount ? Number(requestTotalAmount) : 0;

    if (!totalAmount && seats && seats.length > 0) {
      for (const seatData of seats) {
        if (seatData.price) {
          totalAmount += Number(seatData.price);
        }
      }
    }

    if (!socketId) {
      return res.status(400).json({ error: "Socket ID is required to confirm booking." });
    }

    const seatIds = seats.map(s => s.seatId);
    if (seatIds.length > 0) {
      let notLockedByMe = false;
      const now = new Date();
      const travelDateStr = typeof travelDate === 'string' ? travelDate : new Date(travelDate).toISOString().split('T')[0];

      for (const seatId of seatIds) {
        const key = `${seatId}_${travelDateStr}`;
        const lock = activeLocks.get(key);
        if (!lock || lock.expiresAt < now || lock.socketId !== socketId) {
          notLockedByMe = true;
          break;
        }
      }

      if (notLockedByMe) {
        return res.status(400).json({ error: "One or more seats are not locked by your session, or your lock has expired." });
      }
    }

    const bookingNumber = await generateBookingNumber();

    // Create booking (user_id optional - set when user is logged in)
    const booking = await Booking.create({
      booking_number: bookingNumber,
      contact_name: contactName,
      email: email,
      user_id: userId || null,
      train_id: trainId,
      source_station: sourceStation,
      destination_station: destinationStation,
      travel_date: travelDate,
      total_amount: totalAmount || 0,
      booking_status: "pending",
      payment_status: "pending",
    });

    // Create passengers and link to seats
    // Updated to match passenger.model.js fields (passenger_name, passenger_gender)
    // And removed age
    const passengerPromises = passengers.map(async (passenger, index) => {
      return await Passenger.create({
        booking_id: booking.booking_id,
        seat_id: seats[index].seatId,
        passenger_name: passenger.name,
        passenger_gender: passenger.gender,
      });
    });

    await Promise.all(passengerPromises);

    // Remove locks and emit booked event
    if (seatIds.length > 0) {
      const travelDateStr = typeof travelDate === 'string' ? travelDate : new Date(travelDate).toISOString().split('T')[0];
      for (const seatId of seatIds) {
        const key = `${seatId}_${travelDateStr}`;
        activeLocks.delete(key);
      }

      try {
        const io = getIO();
        io.emit("seats-booked", { seatIds, date: travelDateStr, trainId: trainId });
      } catch (e) {
        console.error("Failed to emit seats-booked overlay", e);
      }
    }

    // Fetch complete booking with relations
    const completeBooking = await Booking.findByPk(booking.booking_id, {
      include: [
        { model: Train, as: "train" },
        {
          model: Passenger,
          as: "passengers",
          include: [
            {
              model: Seat,
              as: "seat",
              include: [{ model: Coach, as: "coach" }]
            }
          ],
        },
      ],
    });

    res.status(201).json(completeBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Train, as: "train" },
        {
          model: Passenger,
          as: "passengers",
          include: [
            {
              model: Seat,
              as: "seat",
              include: [{ model: Coach, as: "coach" }]
            }
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bookings by Email
export const getBookingsByEmail = async (req, res) => {
  try {
    const { email } = req.query; // Use query param for email
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const bookings = await Booking.findAll({
      where: { email: email },
      include: [
        { model: Train, as: "train" },
        {
          model: Passenger,
          as: "passengers",
          include: [
            {
              model: Seat,
              as: "seat",
              include: [{ model: Coach, as: "coach" }]
            }
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingStatus, paymentStatus } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (bookingStatus) booking.booking_status = bookingStatus;
    if (paymentStatus) booking.payment_status = paymentStatus;

    await booking.save();

    // IMPORTANT: Do NOT update seat status when cancelling
    // Seat availability is date-based and checked dynamically
    // Cancelled bookings are automatically excluded from availability checks

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Indian Railways cancellation refund calculator ───────────────────────
// Returns { refundAmount, cancellationCharge, hoursBeforeDeparture, policy }
const calculateRefund = (booking, coachType = "SL") => {
  const travelDate = new Date(booking.travel_date + "T00:00:00");
  const now = new Date();
  const hoursBeforeDeparture = (travelDate - now) / (1000 * 60 * 60);
  const totalAmount = Number(booking.total_amount) || 0;

  // GEN tickets are non-refundable
  if (booking.gen_ticket) {
    return { refundAmount: 0, cancellationCharge: totalAmount, hoursBeforeDeparture, policy: "no_refund", reason: "GEN (unreserved) tickets are non-refundable." };
  }

  // Past departure — no refund
  if (hoursBeforeDeparture <= 0) {
    return { refundAmount: 0, cancellationCharge: totalAmount, hoursBeforeDeparture, policy: "no_refund", reason: "Cancellation after departure — no refund." };
  }

  // < 4 hours before departure — no refund
  if (hoursBeforeDeparture < 4) {
    return { refundAmount: 0, cancellationCharge: totalAmount, hoursBeforeDeparture, policy: "no_refund", reason: "Cancellation within 4 hours of departure — no refund." };
  }

  // Flat charge per IR rules (per ticket, not per passenger)
  const flatCharge = coachType.startsWith("1A") ? 240
    : coachType.startsWith("2A") ? 200
    : coachType.startsWith("3A") ? 180
    : coachType === "CC" || coachType === "2S" ? 60
    : 120; // SL default

  // 4–12 hours: 50% of fare (min flat charge)
  if (hoursBeforeDeparture < 12) {
    const charge = Math.max(flatCharge, Math.round(totalAmount * 0.50));
    return { refundAmount: Math.max(0, totalAmount - charge), cancellationCharge: charge, hoursBeforeDeparture, policy: "50_percent", reason: "50% cancellation charge (4–12 hrs before departure)." };
  }

  // 12–48 hours: 25% of fare (min flat charge)
  if (hoursBeforeDeparture < 48) {
    const charge = Math.max(flatCharge, Math.round(totalAmount * 0.25));
    return { refundAmount: Math.max(0, totalAmount - charge), cancellationCharge: charge, hoursBeforeDeparture, policy: "25_percent", reason: "25% cancellation charge (12–48 hrs before departure)." };
  }

  // > 48 hours: flat charge only
  const charge = flatCharge;
  return { refundAmount: Math.max(0, totalAmount - charge), cancellationCharge: charge, hoursBeforeDeparture, policy: "flat_charge", reason: `Flat cancellation charge of ₹${charge} (> 48 hrs before departure).` };
};

// GET /api/bookings/:id/cancel-preview  — returns refund estimate without cancelling
export const cancelPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Passenger,
          as: "passengers",
          include: [{ model: Seat, as: "seat", include: [{ model: Coach, as: "coach" }] }],
        },
      ],
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled." });
    }

    const coachType = booking.passengers?.[0]?.seat?.coach?.coach_type || "SL";
    const refundInfo = calculateRefund(booking, coachType);
    return res.json({ ...refundInfo, totalAmount: Number(booking.total_amount) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/bookings/:id/cancel  — actually cancels with refund info stored
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Passenger,
          as: "passengers",
          include: [{ model: Seat, as: "seat", include: [{ model: Coach, as: "coach" }] }],
        },
      ],
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled." });
    }

    const coachType = booking.passengers?.[0]?.seat?.coach?.coach_type || "SL";
    const refundInfo = calculateRefund(booking, coachType);

    booking.booking_status = "cancelled";
    booking.payment_status = "refunded"; // "refunded" covers both full & ₹0 refund cases
    await booking.save();

    // Emit seats-unlocked so real-time seat maps update for other users
    try {
      const { getIO } = await import("../sockets.js");
      const io = getIO();
      const travelDateStr = typeof booking.travel_date === "string"
        ? booking.travel_date
        : new Date(booking.travel_date).toISOString().split("T")[0];
      const seatIds = booking.passengers?.map(p => p.seat_id).filter(Boolean) || [];
      if (seatIds.length) {
        io.emit("seats-unlocked", { seatIds, date: travelDateStr, trainId: booking.train_id });
      }
    } catch (e) {
      console.error("Failed to emit seats-unlocked after cancel:", e);
    }

    res.json({
      message: "Booking cancelled successfully",
      booking,
      ...refundInfo,
      totalAmount: Number(booking.total_amount),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
