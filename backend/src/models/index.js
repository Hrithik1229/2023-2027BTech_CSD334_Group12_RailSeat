import sequelize from "../config/db.js";
import Booking from "./booking.model.js";
import Coach from "./coach.model.js";
import Passenger from "./passenger.model.js";
import Seat from "./seat.model.js";
import Station from "./station.model.js";
import Train from "./train.model.js";
import TrainStop from "./trainStop.model.js";

// Export all models
export {
    Booking, Coach, Passenger, Seat, Station, Train, TrainStop, sequelize
};

