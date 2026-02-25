import dotenv from "dotenv";
import app from "./app.js";
import "./config/db.js";
import { initDatabase } from "./config/initDb.js";

dotenv.config();

const PORT = process.env.PORT || 5003;

import http from 'http';
import { initSockets } from './sockets.js';

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database
        await initDatabase();

        const server = http.createServer(app);
        initSockets(server);

        // Start server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
// restart