import sequelize from "../config/db.js";
import { Coach, Seat, Train } from "../models/index.js";

const checkData = async () => {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        const trainCount = await Train.count();
        const coachCount = await Coach.count();
        const seatCount = await Seat.count();

        console.log(`Trains: ${trainCount}`);
        console.log(`Coaches: ${coachCount}`);
        console.log(`Seats: ${seatCount}`);

        if (trainCount > 0) {
            const firstTrain = await Train.findOne({
                include: [{
                    model: Coach,
                    as: 'coaches',
                    include: [{ model: Seat, as: 'seats', limit: 5 }]
                }]
            });
            console.log("First Train:", JSON.stringify(firstTrain, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkData();
