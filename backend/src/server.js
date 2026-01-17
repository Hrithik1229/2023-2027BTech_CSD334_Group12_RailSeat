import dotenv from "dotenv";
import app from "./app.js";
import "./config/db.js";
import { initDatabase } from "./config/initDb.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database
        await initDatabase();

        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API endpoints available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();