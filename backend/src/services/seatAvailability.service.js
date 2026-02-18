import { Op } from "sequelize";
import Booking from "../models/booking.model.js";
import Passenger from "../models/passenger.model.js";
import Seat from "../models/seat.model.js";
import Station from "../models/station.model.js";
import TrainRun from "../models/trainRun.model.js";
import TrainStop from "../models/trainStop.model.js";

/**
 * Checks if a specific seat is available for a requested journey segment.
 * 
 * Logic:
 * 1. Find the target Seat ID.
 * 2. Get the Train Route (TrainStops) to map Station -> Order.
 * 3. Calculate Request Start/End Order (P, Q).
 * 4. Fetch EXISITNG bookings (confirmed/pending) for this Seat + Date.
 * 5. Convert Existing Booking Start/End strings to Order (X, Y).
 * 6. Check Overlap: (P < Y) && (Q > X).
 * 
 * @param {number} train_id - Train ID
 * @param {number} coach_id - Coach ID
 * @param {number|string} seat_number - Seat Number
 * @param {string} journey_date - YYYY-MM-DD
 * @param {number} from_station_id - Source Station ID
 * @param {number} to_station_id - Dest Station ID
 * @param {object} [transaction] - Transaction
 * @returns {Promise<boolean>} - true (Available), false (Booked)
 */
export const checkSeatAvailability = async (
    train_id,
    coach_id,
    seat_number,
    journey_date,
    from_station_id,
    to_station_id,
    transaction = null
) => {
    // 1. Get Seat ID
    const targetSeat = await Seat.findOne({
        where: { coach_id, seat_number },
        attributes: ['seat_id'],
        transaction
    });

    if (!targetSeat) throw new Error(`Seat ${seat_number} not found in coach ${coach_id}`);

    // 2. Fetch Route (TrainRun + Stops)
    // We need to know the order of stations for THIS train.
    // We assume the train has an 'active' run covering these stations.

    // Optimize: Verify if from/to IDs exist in stops and get their orders directly?
    // We need the FULL map to resolve existing booking strings later.
    const runs = await TrainRun.findAll({
        where: { train_id, status: 'active' },
        include: [
            {
                model: TrainStop,
                as: 'stops',
                required: true,
                include: [{ model: Station, as: 'station', attributes: ['id', 'name', 'code'] }]
            }
        ],
        transaction
    });

    let stationMap = new Map(); // Normalized Name -> Order
    let requestedStart = -1;
    let requestedEnd = -1;
    let routeFound = false;

    // Normalize helper
    const norm = (s) => String(s || "").trim().toUpperCase();

    // Find the run that covers the requested segment
    for (const run of runs) {
        const stops = run.stops || [];
        stops.sort((a, b) => a.stop_order - b.stop_order);

        // Does this run contain requested stations?
        const startNode = stops.find(s => s.station_id === Number(from_station_id));
        const endNode = stops.find(s => s.station_id === Number(to_station_id));

        if (startNode && endNode && startNode.stop_order < endNode.stop_order) {
            requestedStart = startNode.stop_order;
            requestedEnd = endNode.stop_order;
            routeFound = true;

            // Build full map for this route (to resolve Booking Strings)
            stops.forEach(stop => {
                if (stop.station) {
                    stationMap.set(norm(stop.station.name), stop.stop_order);
                    stationMap.set(norm(stop.station.code), stop.stop_order);
                    // Also ID if needed (though existing bookings use name)
                    stationMap.set(`ID:${stop.station.id}`, stop.stop_order);
                }
            });
            break;
        }
    }

    if (!routeFound) {
        throw new Error("Invalid route segment: Stations not found or invalid direction.");
    }

    // 3. Fetch Existing Bookings for this Seat
    const existing = await Passenger.findAll({
        where: { seat_id: targetSeat.seat_id },
        include: [
            {
                model: Booking,
                as: 'booking',
                where: {
                    train_id,
                    travel_date: journey_date,
                    booking_status: { [Op.in]: ['confirmed', 'pending'] }
                },
                required: true,
                attributes: ['booking_id', 'source_station', 'destination_station']
            }
        ],
        transaction
    });

    // 4. Check Overlaps
    const P = requestedStart;
    const Q = requestedEnd;

    for (const record of existing) {
        const bk = record.booking;

        const X = stationMap.get(norm(bk.source_station));
        const Y = stationMap.get(norm(bk.destination_station));

        if (X === undefined || Y === undefined) {
            // CRITICAL: If we can't map the existing booking's stations, 
            // the data is corrupt or the route changed.
            // Safe fallback: ASSUME OVERLAP to prevent double booking.
            console.error(`Data Mismatch: Booking ${bk.booking_id} has stations [${bk.source_station}, ${bk.destination_station}] not in current route.`);
            return false;
        }

        // Overlap Logic: (StartA < EndB) and (EndA > StartB)
        // Requested: P->Q
        // Existing: X->Y
        // Overlap: P < Y && Q > X
        if (P < Y && Q > X) {
            return false; // Collision detected
        }
    }

    return true; // No collisions
};
