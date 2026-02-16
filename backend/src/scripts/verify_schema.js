
import sequelize from "../config/db.js";
import Seat from "../models/seat.model.js";

const verifySchema = async () => {
    try {
        console.log("Attempting to sync Seat model...");
        // force: false, alter: true to match server behavior
        await Seat.sync({ alter: true });
        console.log("Seat model synced successfully!");

        // Check if columns exist
        const description = await sequelize.getQueryInterface().describeTable('seats');
        if (description.side && description.position_index) {
            console.log("Columns 'side' and 'position_index' exist.");
        } else {
            console.error("Columns missing!");
        }

        process.exit(0);
    } catch (error) {
        console.error("Sync failed:", error);
        process.exit(1);
    }
};

verifySchema();
