import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Station = sequelize.define("Station", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
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
