import sequelize from "../config/db.js";
import { Seat, Train } from "../models/index.js";

const checkSeats = async () => {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        const bookedSeats = await Seat.findAll({
            where: { status: 'booked' },
            include: [{ model: Train, as: 'train', attributes: ['train_name'] }]
        });

        console.log(`\nTotal Booked Seats: ${bookedSeats.length}`);
        if (bookedSeats.length > 0) {
            console.log("\nSample Booked Seats:");
            bookedSeats.slice(0, 5).forEach(s => {
                const trainName = s.train ? s.train.train_name : 'Unknown Train';
                console.log(`- ${trainName}: Seat ${s.seat_number} (${s.seat_type})`);
            });
        } else {
            console.log("\nNo seats are currently booked in the database.");
            console.log("Try making a booking in the app now that the constraints are fixed!");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkSeats();
