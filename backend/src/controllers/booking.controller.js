import { Booking, Coach, Passenger, Seat, Train } from "../models/index.js";

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

    // NOTE: We do NOT update seat status permanently here
    // Seat availability is determined by checking bookings for a specific date
    // The seat.status field is kept as 'available' and getAvailableSeats()
    // checks bookings by date to determine actual availability

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

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    booking.booking_status = "cancelled";
    await booking.save();

    // IMPORTANT: Do NOT update seat status when cancelling
    // Seat availability is date-based and checked dynamically via getAvailableSeats()
    // Cancelled bookings are automatically excluded from availability checks

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
