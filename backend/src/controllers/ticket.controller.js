import { Booking, Coach, Passenger, Seat, Station, Train, TrainRun, TrainStop } from "../models/index.js";
import { generateTicketPDF } from "../services/pdfService.js";

// GET /api/bookings/:id/download-ticket
export const downloadTicket = async (req, res) => {
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
                            include: [
                                {
                                    model: Coach,
                                    as: "coach",
                                    include: [{ model: Seat, as: "seats" }],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }

        const isConfirmed =
            booking.payment_status === "paid" ||
            booking.booking_status === "confirmed";

        if (!isConfirmed) {
            return res.status(403).json({
                error: "Ticket download is only available for confirmed bookings.",
            });
        }

        // ── GEN tickets are digital-only: no PDF allowed ─────────────────────
        const bookingJson = booking.toJSON();
        if (bookingJson.gen_ticket) {
            return res.status(403).json({
                error: "General (Unreserved) tickets are digital-only and cannot be downloaded as PDF. Please view your ticket in the app.",
                gen_ticket: true,
            });
        }

        const bookingData = booking.toJSON();

        // ── Fetch departure time at source and arrival time at destination ──────
        // The booking stores station names as strings. We find the matching
        // TrainStop entries for this train via its runs.
        let departureTime = null;
        let arrivalTime = null;

        try {
            // Get the first active run for this train
            const run = await TrainRun.findOne({
                where: { train_id: bookingData.train_id, status: "active" },
                include: [
                    {
                        model: TrainStop,
                        as: "stops",
                        include: [{ model: Station, as: "station" }],
                    },
                ],
            });

            if (run && run.stops) {
                // Match stops by station name (case-insensitive)
                const srcName = (bookingData.source_station || "").toLowerCase();
                const destName = (bookingData.destination_station || "").toLowerCase();

                const srcStop = run.stops.find(s =>
                    s.station?.name?.toLowerCase() === srcName ||
                    s.station?.code?.toLowerCase() === srcName
                );
                const destStop = run.stops.find(s =>
                    s.station?.name?.toLowerCase() === destName ||
                    s.station?.code?.toLowerCase() === destName
                );

                departureTime = srcStop?.departure_time || run.departure_time || null;
                arrivalTime = destStop?.arrival_time || run.arrival_time || null;
            }
        } catch (e) {
            // Non-fatal — times will just be omitted from the ticket
            console.warn("Could not fetch train stop times:", e.message);
        }

        await generateTicketPDF(
            { ...bookingData, departureTime, arrivalTime },
            res
        );

    } catch (error) {
        console.error("Error generating ticket PDF:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate ticket." });
        }
    }
};
