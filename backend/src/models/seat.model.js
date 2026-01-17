import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Coach from "./coach.model.js";

const Seat = sequelize.define("Seat", {
    seat_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    seat_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    seat_type: {
        type: DataTypes.ENUM('lower', 'middle', 'upper', 'side-lower', 'side-upper', 'window', 'aisle', 'middle-seat'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('available', 'selected', 'booked', 'locked'),
        defaultValue: 'available'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    coach_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Coach,
            key: 'coach_id'
        }
    },
    row_number: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "seats",
    timestamps: true
});

// Define relationships
Coach.hasMany(Seat, { foreignKey: 'coach_id', as: 'seats' });
Seat.belongsTo(Coach, { foreignKey: 'coach_id', as: 'coach' });

export default Seat;
