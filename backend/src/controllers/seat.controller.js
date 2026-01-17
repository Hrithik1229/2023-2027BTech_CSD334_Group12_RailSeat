import { Seat, Coach, Booking, Passenger } from "../models/index.js";
import { Op } from "sequelize";

// Get seats by coach ID
export const getSeatsByCoach = async (req, res) => {
    try {
        const { coachId } = req.params;
        const seats = await Seat.findAll({
            where: { coach_id: coachId },
            order: [['row_number', 'ASC'], ['seat_number', 'ASC']]
        });
        res.json(seats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update seat status
export const updateSeatStatus = async (req, res) => {
    try {
        const { seatId } = req.params;
        const { status } = req.body;
        
        const seat = await Seat.findByPk(seatId);
        if (!seat) {
            return res.status(404).json({ error: "Seat not found" });
        }
        
        seat.status = status;
        await seat.save();
        
        res.json(seat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get available seats for a coach on a specific date
export const getAvailableSeats = async (req, res) => {
    try {
        const { coachId, date } = req.query;
        
        // Get all booked seat IDs for this date
        const bookings = await Booking.findAll({
            where: {
                travel_date: date,
                booking_status: { [Op.ne]: 'cancelled' }
            },
            include: [{
                model: Passenger,
                as: 'passengers',
                include: [{
                    model: Seat,
                    as: 'seat',
                    where: { coach_id: coachId }
                }]
            }]
        });
        
        const bookedSeatIds = [];
        bookings.forEach(booking => {
            booking.passengers.forEach(passenger => {
                if (passenger.seat) {
                    bookedSeatIds.push(passenger.seat.seat_id);
                }
            });
        });
        
        // Get all seats for the coach
        const allSeats = await Seat.findAll({
            where: { coach_id: coachId }
        });
        
        // Mark seats as booked if they're in the booked list
        const seats = allSeats.map(seat => {
            const seatData = seat.toJSON();
            if (bookedSeatIds.includes(seat.seat_id)) {
                seatData.status = 'booked';
            }
            return seatData;
        });
        
        res.json(seats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bulk update seat statuses
export const bulkUpdateSeatStatus = async (req, res) => {
    try {
        const { seatIds, status } = req.body;
        
        await Seat.update(
            { status },
            { where: { seat_id: { [Op.in]: seatIds } } }
        );
        
        const updatedSeats = await Seat.findAll({
            where: { seat_id: { [Op.in]: seatIds } }
        });
        
        res.json(updatedSeats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
