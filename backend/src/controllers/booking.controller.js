import { Op } from "sequelize";
import { Booking, Passenger, Seat, Train } from "../models/index.js";

// Generate unique booking number
const generateBookingNumber = () => {
    return `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

// Create a new booking
export const createBooking = async (req, res) => {
    try {
        const { contactName, email, trainId, sourceStation, destinationStation, travelDate, passengers, seats } = req.body;

        // Calculate total amount
        let totalAmount = 0;
        for (const seatData of seats) {
            const seat = await Seat.findByPk(seatData.seatId);
            if (seat) {
                totalAmount += parseFloat(seat.price);
            }
        }

        // Create booking
        const booking = await Booking.create({
            booking_number: generateBookingNumber(),
            contact_name: contactName, // Store contact name
            email: email, // Store email
            train_id: trainId,
            source_station: sourceStation,
            destination_station: destinationStation,
            travel_date: travelDate,
            total_amount: totalAmount,
            booking_status: 'pending',
            payment_status: 'pending'
        });

        // Create passengers and link to seats
        // Updated to match passenger.model.js fields (passenger_name, passenger_gender)
        // And removed age
        const passengerPromises = passengers.map(async (passenger, index) => {
            return await Passenger.create({
                booking_id: booking.booking_id,
                seat_id: seats[index].seatId,
                passenger_name: passenger.name,
                passenger_gender: passenger.gender
            });
        });

        await Promise.all(passengerPromises);

        // Update seat statuses to booked
        const seatIds = seats.map(s => s.seatId);
        await Seat.update(
            { status: 'booked' },
            { where: { seat_id: { [Op.in]: seatIds } } }
        );

        // Fetch complete booking with relations
        const completeBooking = await Booking.findByPk(booking.booking_id, {
            include: [
                { model: Train, as: 'train' },
                {
                    model: Passenger,
                    as: 'passengers',
                    include: [{ model: Seat, as: 'seat' }]
                }
            ]
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
                { model: Train, as: 'train' },
                {
                    model: Passenger,
                    as: 'passengers',
                    include: [{ model: Seat, as: 'seat' }]
                }
            ]
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
                { model: Train, as: 'train' },
                {
                    model: Passenger,
                    as: 'passengers',
                    include: [{ model: Seat, as: 'seat' }]
                }
            ],
            order: [['createdAt', 'DESC']]
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

        // If booking is cancelled, free up the seats
        if (bookingStatus === 'cancelled') {
            const passengers = await Passenger.findAll({
                where: { booking_id: id },
                include: [{ model: Seat, as: 'seat' }]
            });

            const seatIds = passengers.map(p => p.seat_id);
            await Seat.update(
                { status: 'available' },
                { where: { seat_id: { [Op.in]: seatIds } } }
            );
        }

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

        booking.booking_status = 'cancelled';
        await booking.save();

        // Free up seats
        const passengers = await Passenger.findAll({
            where: { booking_id: id }
        });

        const seatIds = passengers.map(p => p.seat_id);
        await Seat.update(
            { status: 'available' },
            { where: { seat_id: { [Op.in]: seatIds } } }
        );

        res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
