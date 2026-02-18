
import { FareRule, SeatTypePricing, sequelize } from "../models/index.js";

const checkFares = async () => {
    try {
        await sequelize.authenticate();
        const ruleCount = await FareRule.count();
        const multiplierCount = await SeatTypePricing.count();
        console.log(`FareRule count: ${ruleCount}`);
        console.log(`SeatTypePricing count: ${multiplierCount}`);

        if (ruleCount > 0) {
            const rules = await FareRule.findAll();
            console.log("Sample Fare Rules:", JSON.stringify(rules.slice(0, 3), null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error("Check failed:", error);
        process.exit(1);
    }
};

checkFares();
