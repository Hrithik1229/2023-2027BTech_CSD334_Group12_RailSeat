
import { Coach, FareRule, SeatTypePricing, sequelize, Train } from "../models/index.js";

const debugData = async () => {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        const trains = await Train.findAll({ limit: 2 });
        console.log("\n--- TRAINS ---\n", JSON.stringify(trains, null, 2));

        const coaches = await Coach.findAll({ limit: 5 });
        console.log("\n--- COACHES ---\n", JSON.stringify(coaches.map(c => ({ id: c.coach_id, number: c.coach_number, type: c.coach_type })), null, 2));

        const fareRules = await FareRule.findAll();
        console.log("\n--- FARE RULES ---\n", JSON.stringify(fareRules, null, 2));

        const pricings = await SeatTypePricing.findAll();
        console.log("\n--- SEAT PRICING ---\n", JSON.stringify(pricings, null, 2));

        process.exit(0);

    } catch (error) {
        console.error("Debug failed", error);
        process.exit(1);
    }
};

debugData();
