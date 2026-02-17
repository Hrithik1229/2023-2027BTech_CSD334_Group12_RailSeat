import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Station from "./station.model.js";
import Train from "./train.model.js";

const TrainRun = sequelize.define("TrainRun", {
    run_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    train_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    direction: {
        type: DataTypes.ENUM('UP', 'DOWN'),
        allowNull: false
    },

    source_station_id: DataTypes.INTEGER,
    destination_station_id: DataTypes.INTEGER,

    departure_time: DataTypes.TIME,
    arrival_time: DataTypes.TIME,
    duration: DataTypes.STRING,

    // optional but powerful
    days_of_run: DataTypes.STRING,  // "Mon,Tue,Wed"

    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    }
}, {
    tableName: "train_runs"
});

// Define relationships
Train.hasMany(TrainRun, { foreignKey: "train_id", as: "runs" });
TrainRun.belongsTo(Train, { foreignKey: "train_id", as: "train" });

TrainRun.belongsTo(Station, { foreignKey: "source_station_id", as: "sourceStation" });
TrainRun.belongsTo(Station, { foreignKey: "destination_station_id", as: "destinationStation" });


export default TrainRun;
