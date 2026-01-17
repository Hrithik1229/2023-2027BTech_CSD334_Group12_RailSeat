import { Train } from "../models/index.js";
import sequelize from "./db.js";

// Initialize database - sync all models
export const initDatabase = async () => {
    try {
        // Sync all models with database
        // force: false - won't drop existing tables
        // alter: true - will alter tables to match models
        await sequelize.sync({ alter: true });
        console.log("Database models synchronized successfully.");

        // Check if we need to seed initial data
        const trainCount = await Train.count();
        if (trainCount === 0) {
            console.log("No trains found. You may want to seed initial data.");
        }
    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};

// Seed initial data (optional - for development)
export const seedDatabase = async () => {
    try {
        // Example: Create a sample train
        const sampleTrain = await Train.create({
            train_number: "12301",
            train_name: "Rajdhani Express",
            source_station: "New Delhi",
            destination_station: "Mumbai Central",
            departure_time: "16:55:00",
            arrival_time: "10:00:00",
            duration: "17h 5m",
            status: "active"
        });

        console.log("Sample train created:", sampleTrain.train_name);
    } catch (error) {
        console.error("Error seeding database:", error);
    }
};
