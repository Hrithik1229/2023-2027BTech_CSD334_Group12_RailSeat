import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Station from "./station.model.js";
import Train from "./train.model.js";

const TrainStop = sequelize.define("TrainStop", {
    stop_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    train_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Train,
            key: 'train_id'
        }
    },
    station_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Station,
            key: 'station_id'
        }
    },
    stop_order: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    arrival_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    departure_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    halt_duration: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: true
    }
}, {
    tableName: "train_stops",
    timestamps: false // Disable timestamps since table already exists with data
});

// Define relationships
Train.hasMany(TrainStop, { foreignKey: 'train_id', as: 'stops' });
TrainStop.belongsTo(Train, { foreignKey: 'train_id', as: 'train' });

Station.hasMany(TrainStop, { foreignKey: 'station_id', as: 'trainStops' });
TrainStop.belongsTo(Station, { foreignKey: 'station_id', as: 'station' });

export default TrainStop;
