import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Station = sequelize.define("Station", {
    station_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    station_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    station_code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "stations",
    timestamps: true
});

export default Station;
