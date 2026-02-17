import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Seat = sequelize.define("Seat", {
    seat_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    seat_number: {
        type: DataTypes.INTEGER, // Changed to Integer for easier sorting
        allowNull: false
    },
    // Logical grouping for UI: Lower, Upper, Middle, Side-Lower, Side-Upper
    berth_type: {
        type: DataTypes.ENUM('LB', 'MB', 'UB', 'SL', 'SU', 'WS', 'MS', 'AS'),
        allowNull: false
    },
    // Row tracking (1, 2, 3...)
    row_number: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Helps frontend know if it's the main cabin or the side-aisle berths
    is_side_berth: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Column index within the row (e.g., 0, 1, 2 for 3-seater; 0, 1 for 2-seater)
    column_index: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    coach_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'coaches', // Use table name string to avoid circular imports
            key: 'coach_id'
        }
    }
}, {
    tableName: "seats",
    timestamps: false // Static data rarely needs timestamps
});

export default Seat;