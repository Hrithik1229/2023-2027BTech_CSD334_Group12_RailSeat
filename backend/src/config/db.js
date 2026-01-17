import dotenv from "dotenv";
import { dirname, join } from "path";
import { Sequelize } from "sequelize";
import { fileURLToPath } from "url";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to load .env from the backend root (2 levels up from src/config/)
const backendRoot = join(__dirname, "../../");
const envPath = join(backendRoot, ".env");

// Load environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn(`⚠️  Warning: Could not load .env file from ${envPath}`);
    console.warn("   Make sure the .env file exists in the backend directory.");
} else {
    console.log(`✅ Loaded .env file from: ${envPath}`);
}

// Get and validate database configuration
const dbName = process.env.DB_NAME || "train_booking";
const dbUser = process.env.DB_USER || "postgres";
// Explicitly ensure password is a string - handle undefined, null, or empty
let dbPassword = "123qweasdz";
if (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null) {
    dbPassword = String(process.env.DB_PASSWORD);
}
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = parseInt(process.env.DB_PORT || "5432", 10);




// Create Sequelize instance with explicit string password
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    dialectOptions: {
        connectTimeout: 10000,
    },
});

// Test the connection
sequelize
    .authenticate()
    .then(() => {
        console.log("Database connection established successfully.");
    })
    .catch((err) => {
        console.error("Unable to connect to the database:", err);
    });

export default sequelize;