import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Train from "./train.model.js";

const Booking = sequelize.define("Booking", {
    booking_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    }
}, {
    tableName: "bookings",
    timestamps: true
});

// Define relationships
// User relationship removed

Train.hasMany(Booking, { foreignKey: 'train_id', as: 'bookings' });
Booking.belongsTo(Train, { foreignKey: 'train_id', as: 'train' });

export default Booking;
