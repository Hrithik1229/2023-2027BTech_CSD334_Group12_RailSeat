import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Station from "./station.model.js";
import TrainRun from "./trainRun.model.js";

const TrainStop = sequelize.define("TrainStop", {
    stop_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    run_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TrainRun,
            key: 'run_id'
        }
    },
    station_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Station,
            key: 'id'
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
    },
    distance_from_source: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: "train_stops",
    timestamps: false
});

// Define relationships
TrainRun.hasMany(TrainStop, { foreignKey: 'run_id', as: 'stops' });
TrainStop.belongsTo(TrainRun, { foreignKey: 'run_id', as: 'run' });

Station.hasMany(TrainStop, { foreignKey: 'station_id', as: 'trainStops' });
TrainStop.belongsTo(Station, { foreignKey: 'station_id', as: 'station' });

export default TrainStop;
