import sequelize from "../config/db.js";

const testDb = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connection successful!");
        process.exit(0);
    } catch (e) {
        console.error("Connection failed:", e);
        process.exit(1);
    }
};

testDb();
