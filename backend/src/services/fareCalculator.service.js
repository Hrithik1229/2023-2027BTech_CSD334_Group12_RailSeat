/**
 * fareCalculator.service.js
 *
 * Modular fare calculation service for the Train Booking System.
 *
 * Formula (in order):
 *   1. chargeableDistance = max(distance, fareRule.min_distance)
 *   2. fare = base_fare
 *   3. if chargeableDistance > min_distance → fare += (chargeableDistance - min_distance) * per_km_rate
 *   4. fare += reservation_charge
 *   5. if SUPERFAST → fare += superfast_charge
 *   6. fare *= seatMultiplier  (from SeatTypePricing)
 *   7. fare += (gst_percent / 100) * fare
 *   8. return Math.round(fare)
 */

import FareRule from "../models/fareRule.model.js";
import SeatTypePricing from "../models/seatPreferenceMultiplier.model.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise train_type from the Train model's ENUM to the FareRule ENUM.
 * Train model uses: 'Superfast' | 'Express' | 'Mail' | 'Passenger' | 'Local'
 * FareRule uses:    'SUPERFAST' | 'EXPRESS' | 'LOCAL'
 *
 * Mail and Passenger are treated as EXPRESS for fare purposes.
 */
const normalisedTrainType = (trainType = "") => {
    const t = trainType.toUpperCase();
    if (t === "SUPERFAST") return "SUPERFAST";
    if (t === "LOCAL") return "LOCAL";
    return "EXPRESS"; // Express, Mail, Passenger → EXPRESS
};

/**
 * Normalise seat_type from the DB berth_type codes to the SeatTypePricing ENUM.
 * DB codes: LB, MB, UB, SL, SU, WS, MS, AS
 */
const normalisedSeatType = (berthType = "") => {
    const map = {
        LB: "LOWER",
        MB: "MIDDLE",
        UB: "UPPER",
        SL: "SIDE_LOWER",
        SU: "SIDE_UPPER",
        WS: "WINDOW",
        MS: "AISLE",   // middle-seat treated as aisle for pricing
        AS: "AISLE",
    };
    return map[berthType.toUpperCase()] ?? "LOWER";
};

// ---------------------------------------------------------------------------
// Core calculation (pure function — easy to unit-test)
// ---------------------------------------------------------------------------

/**
 * @param {number} distance          - Actual journey distance in km
 * @param {object} fareRule          - FareRule model instance (plain object or Sequelize instance)
 * @param {number} seatMultiplier    - Price multiplier from SeatTypePricing (default 1.0)
 * @returns {number}                 - Final fare rounded to nearest rupee
 */
export const calculateFare = (distance, fareRule, seatMultiplier = 1.0) => {
    const minDist = Number(fareRule.min_distance) || 0;
    const baseFare = Number(fareRule.base_fare) || 0;
    const perKmRate = Number(fareRule.per_km_rate) || 0;
    const resvCharge = Number(fareRule.reservation_charge) || 0;
    const superfastCharge = Number(fareRule.superfast_charge) || 0;
    const gstPercent = Number(fareRule.gst_percent) || 0;

    // Step 1 — chargeable distance
    const chargeableDistance = Math.max(distance, minDist);

    // Step 2 — base fare
    let fare = baseFare;

    // Step 3 — per-km component beyond min_distance
    if (chargeableDistance > minDist) {
        fare += (chargeableDistance - minDist) * perKmRate;
    }

    // Step 4 — reservation charge
    fare += resvCharge;

    // Step 5 — superfast surcharge
    if (fareRule.train_type === "SUPERFAST") {
        fare += superfastCharge;
    }

    // Step 6 — seat type multiplier
    fare = fare * seatMultiplier;

    // Step 7 — GST
    const gst = (gstPercent / 100) * fare;
    fare = fare + gst;

    // Step 8 — round to nearest rupee
    return Math.round(fare);
};

// ---------------------------------------------------------------------------
// DB-backed service function
// ---------------------------------------------------------------------------

/**
 * Fetch fare rules + seat multiplier from DB and return the final fare.
 *
 * @param {object} options
 * @param {number} options.distance    - Journey distance in km
 * @param {string} options.trainType   - Train type from Train model (e.g. 'Superfast', 'Express')
 * @param {string} options.coachType   - Coach type code (e.g. '1A', '2A', '3A', 'SL', 'CC')
 * @param {string} options.berthType   - Berth/seat type code (e.g. 'LB', 'UB', 'SL')
 *
 * @returns {Promise<{
 *   fare: number,
 *   breakdown: {
 *     chargeableDistance: number,
 *     baseFare: number,
 *     distanceFare: number,
 *     reservationCharge: number,
 *     superfastCharge: number,
 *     subtotal: number,
 *     seatMultiplier: number,
 *     subtotalAfterMultiplier: number,
 *     gstAmount: number,
 *     finalFare: number,
 *   }
 * }>}
 */
const getFareRuleOrDefault = async (trainType, coachType) => {
    const defaults = {
        '1A': { base_fare: 1200, per_km_rate: 3.5, min_distance: 300, reservation_charge: 60, gst_percent: 5, superfast_charge: 75 },
        '2A': { base_fare: 800, per_km_rate: 2.5, min_distance: 300, reservation_charge: 50, gst_percent: 5, superfast_charge: 45 },
        '3A': { base_fare: 500, per_km_rate: 1.8, min_distance: 300, reservation_charge: 40, gst_percent: 5, superfast_charge: 45 },
        'FC': { base_fare: 450, per_km_rate: 1.5, min_distance: 200, reservation_charge: 30, gst_percent: 0, superfast_charge: 30 },
        'CC': { base_fare: 300, per_km_rate: 1.2, min_distance: 100, reservation_charge: 40, gst_percent: 5, superfast_charge: 45 },
        'SL': { base_fare: 150, per_km_rate: 0.6, min_distance: 200, reservation_charge: 20, gst_percent: 0, superfast_charge: 30 },
        '2S': { base_fare: 100, per_km_rate: 0.45, min_distance: 100, reservation_charge: 15, gst_percent: 0, superfast_charge: 15 },
        'GEN': { base_fare: 50, per_km_rate: 0.30, min_distance: 50, reservation_charge: 0, gst_percent: 0, superfast_charge: 10 },
        'UR':  { base_fare: 50, per_km_rate: 0.30, min_distance: 50, reservation_charge: 0, gst_percent: 0, superfast_charge: 10 }, // alias for GEN
        'AC':  { base_fare: 1000, per_km_rate: 3.0, min_distance: 300, reservation_charge: 50, gst_percent: 5, superfast_charge: 55 },
    };

    // GEN, UR (alias) and AC are not stored in the fare_rules DB table.
    // Return hardcoded values directly to avoid a DB ENUM validation error.
    const NON_DB_TYPES = ['GEN', 'UR', 'AC'];
    const lookupType = coachType === 'UR' ? 'GEN' : coachType; // normalise UR → GEN
    if (NON_DB_TYPES.includes(coachType)) {
        const def = defaults[coachType] || defaults['SL'];
        return { train_type: trainType, coach_type: coachType, ...def };
    }

    // Try DB for all other types
    const rule = await FareRule.findOne({
        where: { train_type: trainType, coach_type: coachType },
    });
    if (rule) return rule.toJSON();

    // Fallback for unknown types not in DB
    console.warn(`Missing FareRule for ${trainType} ${coachType}, using fallback.`);
    const def = defaults[coachType] || defaults['SL'];
    return {
        train_type: trainType,
        coach_type: coachType,
        ...def,
        base_fare: Number(def.base_fare),
        per_km_rate: Number(def.per_km_rate),
        min_distance: Number(def.min_distance),
        reservation_charge: Number(def.reservation_charge),
        superfast_charge: Number(def.superfast_charge),
        gst_percent: Number(def.gst_percent),
    };
};


export const getFare = async ({ distance, trainType, coachType, berthType }) => {
    if (!distance || distance <= 0) {
        throw new Error("Distance must be a positive number.");
    }
    if (!coachType) {
        throw new Error("coachType is required.");
    }

    const normTrainType = normalisedTrainType(trainType);
    const normSeatType = normalisedSeatType(berthType);

    // --- Fetch FareRule ---
    let fareRule = await FareRule.findOne({
        where: { train_type: normTrainType, coach_type: coachType },
    });

    if (fareRule) {
        fareRule = fareRule.toJSON();
    } else {
        // Fallback to internal helper if not found
        // Use getFareRuleOrDefault but it's defined later/below? No, define it before.
        // Actually, just duplicate the fallback logic for getFare or hoist the helper.
        // I will rely on importing the helper or defining it top level.
        // I defined `getFareRuleOrDefault` at top level scope in the replacement chunk above.
        // But `getFare` is ABOVE `getFaresForCoach`.
        // I should move `getFareRuleOrDefault` to top of file or use hoisting.
        // `const` is not hoisted.
        // I'll assume I can redefine `getFare` implementation to use `getFareRuleOrDefault` which I'll hoist.

        // Wait, I can only replace valid blocks.
        // I'll just hardcode fallback here too, or refactor.
        // Better: I'll use the same logical fallback.
        fareRule = await getFareRuleOrDefault(normTrainType, coachType);
    }

    // --- Fetch SeatTypePricing ---
    let seatMultiplier = 1.0;
    const seatPricing = await SeatTypePricing.findOne({
        where: { coach_type: coachType, seat_type: normSeatType },
    });
    if (seatPricing) {
        seatMultiplier = Number(seatPricing.price_multiplier) || 1.0;
    } else {
        // Fallback multiplier
        const defaults = { 'LOWER': 1.1, 'SIDE_LOWER': 1.15, 'UPPER': 0.9, 'SIDE_UPPER': 0.9, 'MIDDLE': 0.95, 'WINDOW': 1.1 };
        seatMultiplier = defaults[normSeatType] || 1.0;
    }

    // --- Calculate ---
    const minDist = Number(fareRule.min_distance) || 0;
    const baseFare = Number(fareRule.base_fare) || 0;
    const perKmRate = Number(fareRule.per_km_rate) || 0;
    const resvCharge = Number(fareRule.reservation_charge) || 0;
    const superfastCharge = Number(fareRule.superfast_charge) || 0;
    const gstPercent = Number(fareRule.gst_percent) || 0;

    const chargeableDistance = Math.max(distance, minDist);
    const distanceFare = chargeableDistance > minDist
        ? (chargeableDistance - minDist) * perKmRate
        : 0;

    let subtotal = baseFare + distanceFare + resvCharge;
    if (normTrainType === "SUPERFAST") subtotal += superfastCharge;

    const subtotalAfterMultiplier = subtotal * seatMultiplier;
    const gstAmount = (gstPercent / 100) * subtotalAfterMultiplier;
    const finalFare = Math.round(subtotalAfterMultiplier + gstAmount);

    return {
        fare: finalFare,
        breakdown: {
            chargeableDistance,
            baseFare,
            distanceFare,
            reservationCharge: resvCharge,
            superfastCharge: normTrainType === "SUPERFAST" ? superfastCharge : 0,
            subtotal,
            seatMultiplier,
            subtotalAfterMultiplier,
            gstAmount: Math.round(gstAmount * 100) / 100,
            finalFare,
        },
    };
};

// ---------------------------------------------------------------------------
// Batch helper — calculate fares for all seats in a coach at once
// ---------------------------------------------------------------------------

/**
 * Calculate fares for multiple berth types in a single coach.
 * Useful for displaying fare breakdown on the seat selection screen.
 *
 * @param {object} options
 * @param {number}   options.distance
 * @param {string}   options.trainType
 * @param {string}   options.coachType
 * @param {string[]} options.berthTypes  - Array of berth type codes, e.g. ['LB','MB','UB','SL','SU']
 *
 * @returns {Promise<Record<string, number>>}  - Map of berthType → fare
 */
export const getFaresForCoach = async ({ distance, trainType, coachType, berthTypes }) => {
    const normTrainType = normalisedTrainType(trainType);

    // 1. Get Rule (DB or Fallback)
    const fareRule = await getFareRuleOrDefault(normTrainType, coachType);

    // 2. Get Allocations aka Seat Multipliers
    // Try DB first
    const allPricing = await SeatTypePricing.findAll({
        where: { coach_type: coachType },
    });

    const pricingMap = {};
    if (allPricing && allPricing.length > 0) {
        allPricing.forEach((p) => {
            pricingMap[p.seat_type] = Number(p.price_multiplier) || 1.0;
        });
    } else {
        // Fallback multipliers
        pricingMap['LOWER'] = 1.1;
        pricingMap['SIDE_LOWER'] = 1.15;
        pricingMap['UPPER'] = 0.9; // Discourage
        pricingMap['SIDE_UPPER'] = 0.9;
        pricingMap['MIDDLE'] = 0.95;
        pricingMap['WINDOW'] = 1.1;
        pricingMap['AISLE'] = 1.0;
    }

    const result = {};
    for (const berthType of berthTypes) {
        const normSeatType = normalisedSeatType(berthType);
        const multiplier = pricingMap[normSeatType] ?? 1.0;
        result[berthType] = calculateFare(distance, fareRule, multiplier);
    }

    return result;
};
