import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Booking from "./booking.model.js";
import Seat from "./seat.model.js";

const Passenger = sequelize.define("Passenger", {
    booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Booking,
            key: 'booking_id'
        }
    },
    seat_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Seat,
            key: 'seat_id'
        }
    },
    passenger_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    passenger_gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
    }
}, {
    tableName: "passengers",
    timestamps: true
});

// Define relationships
Booking.hasMany(Passenger, { foreignKey: 'booking_id', as: 'passengers' });
Passenger.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Seat.hasMany(Passenger, { foreignKey: 'seat_id', as: 'passengers' });
Passenger.belongsTo(Seat, { foreignKey: 'seat_id', as: 'seat' });

export default Passenger;
