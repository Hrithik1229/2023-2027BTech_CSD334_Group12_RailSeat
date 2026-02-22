import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "../config/db.js";
import { Seat } from "../models/index.js";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv
const backendRoot = join(__dirname, "../../");
dotenv.config({ path: join(backendRoot, ".env") });

// Reset all seat statuses to 'available'
// This is needed because seats should not have permanent 'booked' status
// Availability is determined by checking bookings for a specific date
const resetSeatStatuses = async () => {
    try {
        console.log('Resetting all seat statuses to "available"...');

        const [updatedCount] = await Seat.update(
            { status: 'available', locked_by: null, lock_expires_at: null },
            { where: {} }
        );

        console.log(`✅ Reset ${updatedCount} seats to 'available' status.`);
        console.log('Seat availability will now be determined by date-specific bookings.');

        process.exit(0);
    } catch (error) {
        console.error('Error resetting seat statuses:', error);
        process.exit(1);
    }
};

resetSeatStatuses();
