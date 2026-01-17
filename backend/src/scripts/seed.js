import sequelize from "../config/db.js";
import { Coach, Seat, Station, Train, TrainStop } from "../models/index.js";

const stations = [
    { name: "New Delhi", code: "NDLS", city: "New Delhi", state: "Delhi" },
    // ... (rest of stations array is fine, not replacing it all if I can help it, but replace_file_content works on blocks)
    // actually I'll just replace the import and insert the user seeding block.

    // Let's do the import first.

    { name: "Kanpur Central", code: "CNB", city: "Kanpur", state: "Uttar Pradesh" },
    { name: "Prayagraj Junction", code: "PRYJ", city: "Prayagraj", state: "Uttar Pradesh" },
    { name: "Varanasi Junction", code: "BSB", city: "Varanasi", state: "Uttar Pradesh" },
    { name: "Mumbai Central", code: "MMCT", city: "Mumbai", state: "Maharashtra" },
    { name: "Vadodara Junction", code: "BRC", city: "Vadodara", state: "Gujarat" },
    { name: "Surat", code: "ST", city: "Surat", state: "Gujarat" }
];

const trains = [
    {
        number: "12301",
        name: "Rajdhani Express",
        source: "New Delhi",
        destination: "Howrah Junction",
        departure: "16:55:00",
        arrival: "10:00:00", // Next day
        duration: "17h 05m",
        stops: [
            { station: "New Delhi", arrival: null, departure: "16:55:00", halt: 0 },
            { station: "Kanpur Central", arrival: "21:35:00", departure: "21:40:00", halt: 5 },
            { station: "Prayagraj Junction", arrival: "23:43:00", departure: "23:45:00", halt: 2 },
            { station: "Varanasi Junction", arrival: "02:00:00", departure: null, halt: 0 } // Just as an example endpoint
        ],
        coaches: [
            { type: 'ac', count: 2, prefix: 'A' },
            { type: 'sleeper', count: 2, prefix: 'S' },
            { type: 'chair', count: 1, prefix: 'C' }
        ]
    },
    {
        number: "12952",
        name: "Mumbai Rajdhani",
        source: "New Delhi",
        destination: "Mumbai Central",
        departure: "16:25:00",
        arrival: "08:15:00",
        duration: "15h 50m",
        stops: [
            { station: "New Delhi", arrival: null, departure: "16:25:00", halt: 0 },
            { station: "Vadodara Junction", arrival: "03:00:00", departure: "03:10:00", halt: 10 },
            { station: "Surat", arrival: "05:50:00", departure: "05:55:00", halt: 5 },
            { station: "Mumbai Central", arrival: "08:15:00", departure: null, halt: 0 }
        ],
        coaches: [
            { type: 'ac', count: 3, prefix: 'A' },
            { type: 'sleeper', count: 3, prefix: 'S' }
        ]
    }
];

const seedDatabase = async () => {
    try {
        await sequelize.sync({ force: true }); // WARNING: This clears the DB
        console.log("Database synced (cleared).");

        // 1. Create Stations
        const stationMap = new Map();
        for (const s of stations) {
            const station = await Station.create({
                station_name: s.name,
                station_code: s.code,
                city: s.city,
                state: s.state
            });
            stationMap.set(s.name, station.station_id);
        }
        console.log("Stations seeded.");

        // 2. Create Trains & Stops & Coaches
        for (const t of trains) {
            const train = await Train.create({
                train_number: t.number,
                train_name: t.name,
                source_station: t.source,
                destination_station: t.destination,
                departure_time: t.departure,
                arrival_time: t.arrival,
                duration: t.duration,
                status: 'active'
            });

            // Stops
            let order = 1;
            for (const stop of t.stops) {
                const stationId = stationMap.get(stop.station);
                if (stationId) {
                    await TrainStop.create({
                        train_id: train.train_id,
                        station_id: stationId,
                        stop_order: order++,
                        arrival_time: stop.arrival,
                        departure_time: stop.departure,
                        halt_duration: stop.halt
                    });
                }
            }

            // Coaches & Seats
            for (const c of t.coaches) {
                for (let i = 1; i <= c.count; i++) {
                    const coachNumber = `${c.prefix}${i}`;
                    let totalSeats = 60; // Default
                    if (c.type === 'ac') totalSeats = 46; // Example for 2AC
                    if (c.type === 'sleeper') totalSeats = 72; // Standard Sleeper
                    if (c.type === 'chair') totalSeats = 70;

                    const coach = await Coach.create({
                        coach_number: coachNumber,
                        coach_type: c.type,
                        total_seats: totalSeats,
                        train_id: train.train_id
                    });

                    // Generate Seats
                    const seats = [];
                    // Simple logic to generate seats based on type
                    for (let j = 1; j <= totalSeats; j++) {
                        let seatType = 'middle';
                        let price = 500;
                        let row = Math.ceil(j / (c.type === 'sleeper' ? 8 : c.type === 'ac' ? 6 : 5));

                        if (c.type === 'sleeper') {
                            const mod = j % 8;
                            if (mod === 1 || mod === 4) seatType = 'lower';
                            else if (mod === 2 || mod === 5) seatType = 'middle';
                            else if (mod === 3 || mod === 6) seatType = 'upper';
                            else if (mod === 7) seatType = 'side-lower';
                            else if (mod === 0) seatType = 'side-upper';
                            price = 450;
                        } else if (c.type === 'ac') {
                            const mod = j % 6;
                            if (mod === 1 || mod === 3) seatType = 'lower';
                            else if (mod === 2 || mod === 4) seatType = 'upper';
                            else if (mod === 5) seatType = 'side-lower';
                            else if (mod === 0) seatType = 'side-upper';
                            price = 1200;
                        } else {
                            // Chair car logic (simplified)
                            const mod = j % 5;
                            if (mod === 1 || mod === 0) seatType = 'window';
                            else if (mod === 3) seatType = 'aisle';
                            else seatType = 'middle';
                            price = 600;
                        }

                        // Adjust row calculation for side berths sometimes sharing same visual row
                        // Actually row_number just helps group them. Frontend handles layout.

                        seats.push({
                            seat_number: j.toString(),
                            seat_type: seatType,
                            status: 'available',
                            price: price,
                            coach_id: coach.coach_id,
                            row_number: row
                        });
                    }
                    await Seat.bulkCreate(seats);
                }
            }
        }
        console.log("Trains, Stops, Coaches, and Seats seeded successfully!");

    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        process.exit();
    }
};

seedDatabase();
