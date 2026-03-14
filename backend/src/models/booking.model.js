import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Train from "./train.model.js";

const Booking = sequelize.define("Booking", {
    booking_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "users",
            key: "user_id"
        }
    },
    booking_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    contact_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    train_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Train,
            key: 'train_id'
        }
    },
    source_station: {
        type: DataTypes.STRING,
        allowNull: false
    },
    destination_station: {
        type: DataTypes.STRING,
        allowNull: false
    },
    travel_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    booking_status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
        defaultValue: 'pending'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    // ── GEN (Unreserved) Ticket Fields ──────────────────────────────────────
    // Only populated for bookings where coach_type = 'GEN'.
    // gen_validity_start = payment success timestamp
    // gen_validity_end   = gen_validity_start + 3 hours
    gen_ticket: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    gen_validity_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    gen_validity_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // GEN tickets are digital-only; PDF download/print is disabled.
    is_downloadable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    tableName: "bookings",
    timestamps: true
});

// NOTE: Train ↔ Booking and User ↔ Booking associations are
// defined centrally in models/index.js to avoid circular imports
// and duplicate association registrations.

export default Booking;
