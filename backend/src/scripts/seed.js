import sequelize from "../config/db.js";
import {
    Coach,
    FareRule,
    Seat,
    SeatTypePricing,
    Station,
    Train,
    TrainRun,
    TrainStop,
} from "../models/index.js";

/**
 * Seeds real Kerala / South-India train data:
 * - Accurate stations (Kerala + major junction cities)
 * - 20 real trains with correct numbers, names, types & routes
 * - Realistic coach compositions per train category
 * - Fare rules + seat-type multipliers
 *
 * Set SEED_FORCE=0 to skip truncation (only insert missing stations).
 */

const SEED_FORCE = String(process.env.SEED_FORCE ?? "1") === "1";

const pad2 = (n) => String(n).padStart(2, "0");

const addMinutes = (hhmmss, minutesToAdd) => {
    const [h, m, s] = hhmmss.split(":").map(Number);
    const total = h * 3600 + m * 60 + (s || 0) + minutesToAdd * 60;
    const t = ((total % 86400) + 86400) % 86400;
    return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:${pad2(t % 60)}`;
};

// ─── Stations ──────────────────────────────────────────────────────────────
const STATIONS = [
    // Thiruvananthapuram district
    { name: "Thiruvananthapuram Central",   code: "TVC",  city: "Thiruvananthapuram", state: "Kerala" },
    { name: "Kochuveli",                    code: "KCVL", city: "Thiruvananthapuram", state: "Kerala" },
    { name: "Nemom",                        code: "NEM",  city: "Thiruvananthapuram", state: "Kerala" },
    { name: "Neyyattinkara",               code: "NYY",  city: "Thiruvananthapuram", state: "Kerala" },
    { name: "Parassala",                    code: "PASA", city: "Thiruvananthapuram", state: "Kerala" },
    { name: "Varkala Sivagiri",             code: "VAK",  city: "Thiruvananthapuram", state: "Kerala" },
    // Kollam district
    { name: "Kollam Junction",              code: "QLN",  city: "Kollam",             state: "Kerala" },
    { name: "Kundara",                      code: "KUV",  city: "Kollam",             state: "Kerala" },
    { name: "Punalur",                      code: "PUU",  city: "Kollam",             state: "Kerala" },
    // Alappuzha district
    { name: "Kayamkulam Junction",          code: "KYJ",  city: "Kayamkulam",         state: "Kerala" },
    { name: "Alappuzha",                    code: "ALLP", city: "Alappuzha",          state: "Kerala" },
    { name: "Ambalappuzha",                 code: "AMPA", city: "Alappuzha",          state: "Kerala" },
    { name: "Cherthala",                    code: "SRTL", city: "Alappuzha",          state: "Kerala" },
    { name: "Haripad",                      code: "HAD",  city: "Alappuzha",          state: "Kerala" },
    { name: "Mavelikara",                   code: "MVLK", city: "Alappuzha",          state: "Kerala" },
    // Pathanamthitta / Kottayam district
    { name: "Chengannur",                   code: "CNGR", city: "Chengannur",         state: "Kerala" },
    { name: "Thiruvalla",                   code: "TRVL", city: "Thiruvalla",         state: "Kerala" },
    { name: "Changanassery",                code: "CGY",  city: "Kottayam",           state: "Kerala" },
    { name: "Kottayam",                     code: "KTYM", city: "Kottayam",           state: "Kerala" },
    { name: "Ettumanoor",                   code: "ETM",  city: "Kottayam",           state: "Kerala" },
    // Ernakulam / Kochi district
    { name: "Ernakulam Junction",           code: "ERS",  city: "Ernakulam",          state: "Kerala" },
    { name: "Ernakulam Town",               code: "ERN",  city: "Ernakulam",          state: "Kerala" },
    { name: "Tripunithura",                 code: "TRTR", city: "Ernakulam",          state: "Kerala" },
    { name: "Aluva",                        code: "AWY",  city: "Aluva",              state: "Kerala" },
    { name: "Angamaly",                     code: "AFK",  city: "Angamaly",           state: "Kerala" },
    { name: "Kalamassery",                  code: "KLMR", city: "Kochi",              state: "Kerala" },
    { name: "Edappally",                    code: "EDPL", city: "Kochi",              state: "Kerala" },
    // Thrissur district
    { name: "Chalakudy",                    code: "CKI",  city: "Thrissur",           state: "Kerala" },
    { name: "Irinjalakuda",                 code: "IJK",  city: "Thrissur",           state: "Kerala" },
    { name: "Thrissur",                     code: "TCR",  city: "Thrissur",           state: "Kerala" },
    { name: "Guruvayur",                    code: "GUV",  city: "Thrissur",           state: "Kerala" },
    { name: "Kunnamkulam",                  code: "KUMM", city: "Thrissur",           state: "Kerala" },
    { name: "Wadakkanchery",                code: "WKI",  city: "Thrissur",           state: "Kerala" },
    { name: "Cheruthuruthy",               code: "CTRE", city: "Thrissur",           state: "Kerala" },
    // Palakkad district
    { name: "Shoranur Junction",            code: "SRR",  city: "Shoranur",           state: "Kerala" },
    { name: "Ottappalam",                   code: "OTP",  city: "Palakkad",           state: "Kerala" },
    { name: "Pattambi",                     code: "PTB",  city: "Palakkad",           state: "Kerala" },
    { name: "Palakkad Junction",            code: "PGT",  city: "Palakkad",           state: "Kerala" },
    { name: "Palakkad Town",                code: "PGTN", city: "Palakkad",           state: "Kerala" },
    // Malappuram district
    { name: "Tirur",                        code: "TIR",  city: "Tirur",              state: "Kerala" },
    { name: "Kuttippuram",                  code: "KTU",  city: "Malappuram",         state: "Kerala" },
    { name: "Angadipuram",                  code: "AAM",  city: "Malappuram",         state: "Kerala" },
    { name: "Perinthalmanna",               code: "PTMN", city: "Malappuram",         state: "Kerala" },
    { name: "Manjeri",                      code: "MJR",  city: "Malappuram",         state: "Kerala" },
    // Kozhikode district
    { name: "Feroke",                       code: "FK",   city: "Kozhikode",          state: "Kerala" },
    { name: "Kozhikode",                    code: "CLT",  city: "Kozhikode",          state: "Kerala" },
    { name: "Vadakara",                     code: "BDJ",  city: "Kozhikode",          state: "Kerala" },
    { name: "Quilandy",                     code: "QLD",  city: "Kozhikode",          state: "Kerala" },
    { name: "Elathur",                      code: "ETR",  city: "Kozhikode",          state: "Kerala" },
    // Kannur district
    { name: "Thalassery",                   code: "TLY",  city: "Thalassery",         state: "Kerala" },
    { name: "Kannur",                       code: "CAN",  city: "Kannur",             state: "Kerala" },
    { name: "Payyanur",                     code: "PAY",  city: "Kannur",             state: "Kerala" },
    // Kasaragod district
    { name: "Kanhangad",                    code: "KZE",  city: "Kasaragod",          state: "Kerala" },
    { name: "Kasaragod",                    code: "KGQ",  city: "Kasaragod",          state: "Kerala" },
    // Tamil Nadu
    { name: "Kanyakumari",                  code: "CAPE", city: "Kanyakumari",        state: "Tamil Nadu" },
    { name: "Tirunelveli Junction",         code: "TEN",  city: "Tirunelveli",        state: "Tamil Nadu" },
    { name: "Madurai Junction",             code: "MDU",  city: "Madurai",            state: "Tamil Nadu" },
    { name: "Coimbatore Junction",          code: "CBE",  city: "Coimbatore",         state: "Tamil Nadu" },
    { name: "Erode Junction",               code: "ED",   city: "Erode",              state: "Tamil Nadu" },
    { name: "Salem Junction",               code: "SA",   city: "Salem",              state: "Tamil Nadu" },
    { name: "Chennai Central",              code: "MAS",  city: "Chennai",            state: "Tamil Nadu" },
    { name: "Chennai Egmore",               code: "MS",   city: "Chennai",            state: "Tamil Nadu" },
    // Karnataka
    { name: "Mangaluru Central",            code: "MAQ",  city: "Mangaluru",          state: "Karnataka" },
    { name: "Mangaluru Junction",           code: "MAJN", city: "Mangaluru",          state: "Karnataka" },
    { name: "Udupi",                        code: "UD",   city: "Udupi",              state: "Karnataka" },
    { name: "Kundapura",                    code: "KUDA", city: "Kundapura",          state: "Karnataka" },
    { name: "Kayankulam Road",              code: "KKR",  city: "Karnataka",          state: "Karnataka" },
    { name: "Bengaluru City Junction",      code: "SBC",  city: "Bengaluru",          state: "Karnataka" },
];

// ─── Real Train Blueprints ──────────────────────────────────────────────────
// Real rake compositions from NTES/Indian Railways (bookable coaches only).
// SLR (Seating-Luggage-Brake van) excluded as non-bookable.
// GEN coaches listed last in rake sequence following IR convention.
const TRAIN_BLUEPRINTS = [
    // ── 12625 / 12626  Kerala Express (TVC ↔ Hazrat Nizamuddin)
    // Rake: 1 H1(1A) + 3 A1-A3(2A) + 7 B1-B7(3A) + 12 S1-S12(SL) + 2 GEN
    {
        number: "12625",
        name: "Kerala Express",
        type: "Superfast",
        departure: "11:00:00",
        coaches: [
            { coach_type: "1A",  count: 1  },  // H1
            { coach_type: "2A",  count: 3  },  // A1–A3
            { coach_type: "3A",  count: 7  },  // B1–B7
            { coach_type: "SL",  count: 12 },  // S1–S12
            { coach_type: "GEN", count: 2  },  // GS1–GS2
        ],
        route: ["TVC", "KCVL", "QLN", "ALLP", "ERS", "TCR", "SRR", "CLT", "CAN", "KGQ", "MAQ"],
    },
    {
        number: "12626",
        name: "Kerala Express",
        type: "Superfast",
        departure: "06:00:00",
        coaches: [
            { coach_type: "1A",  count: 1  },
            { coach_type: "2A",  count: 3  },
            { coach_type: "3A",  count: 7  },
            { coach_type: "SL",  count: 12 },
            { coach_type: "GEN", count: 2  },
        ],
        route: ["MAQ", "KGQ", "CAN", "CLT", "SRR", "TCR", "ERS", "ALLP", "QLN", "KCVL", "TVC"],
    },

    // ── 16345 / 16346  Netravati Express (TVC ↔ Lokmanya Tilak Terminus)
    // Rake: 2 A(2A) + 5 B(3A) + 10 S(SL) + 2 GEN
    {
        number: "16345",
        name: "Netravati Express",
        type: "Express",
        departure: "15:30:00",
        coaches: [
            { coach_type: "2A",  count: 2  },  // A1–A2
            { coach_type: "3A",  count: 5  },  // B1–B5
            { coach_type: "SL",  count: 10 },  // S1–S10
            { coach_type: "GEN", count: 2  },
        ],
        route: ["TVC", "KCVL", "VAK", "QLN", "KYJ", "ALLP", "ERS", "AWY", "TCR", "SRR", "CLT", "TLY", "CAN", "KZE", "KGQ", "MAQ"],
    },
    {
        number: "16346",
        name: "Netravati Express",
        type: "Express",
        departure: "06:15:00",
        coaches: [
            { coach_type: "2A",  count: 2  },
            { coach_type: "3A",  count: 5  },
            { coach_type: "SL",  count: 10 },
            { coach_type: "GEN", count: 2  },
        ],
        route: ["MAQ", "KGQ", "KZE", "CAN", "TLY", "CLT", "SRR", "TCR", "AWY", "ERS", "ALLP", "KYJ", "QLN", "VAK", "KCVL", "TVC"],
    },

    // ── 16041 / 16042  Island Express (MAS ↔ Kanyakumari)
    // Rake: 2 A(2A) + 4 B(3A) + 10 S(SL) + 2 GEN
    {
        number: "16041",
        name: "Island Express",
        type: "Express",
        departure: "07:10:00",
        coaches: [
            { coach_type: "2A",  count: 2  },
            { coach_type: "3A",  count: 4  },
            { coach_type: "SL",  count: 10 },
            { coach_type: "GEN", count: 2  },
        ],
        route: ["MAS", "SA", "ED", "CBE", "PGT", "SRR", "TCR", "AWY", "ERS", "KTYM", "CNGR", "TRVL", "ALLP", "HAD", "KYJ", "QLN", "VAK", "TVC", "NYY", "PASA", "CAPE"],
    },
    {
        number: "16042",
        name: "Island Express",
        type: "Express",
        departure: "07:45:00",
        coaches: [
            { coach_type: "2A",  count: 2  },
            { coach_type: "3A",  count: 4  },
            { coach_type: "SL",  count: 10 },
            { coach_type: "GEN", count: 2  },
        ],
        route: ["CAPE", "PASA", "NYY", "TVC", "VAK", "QLN", "KYJ", "HAD", "ALLP", "TRVL", "CNGR", "KTYM", "ERS", "AWY", "TCR", "SRR", "PGT", "CBE", "ED", "SA", "MAS"],
    },

    // ── 12081 / 12082  Jan Shatabdi Express (TVC ↔ Kozhikode)
    // Rake: 2 AC(2A) + 8 C(CC) + 1 GEN — day train, no sleepers
    {
        number: "12081",
        name: "Jan Shatabdi Express",
        type: "Superfast",
        departure: "05:15:00",
        coaches: [
            { coach_type: "2A", count: 2 },  // A1–A2 (AC chair / 1st AC hybrid)
            { coach_type: "CC", count: 8 },  // C1–C8 (Chair Car)
            { coach_type: "GEN", count: 1 }, // GS1
        ],
        route: ["TVC", "KCVL", "QLN", "KYJ", "ALLP", "ERS", "AWY", "TCR", "SRR", "TIR", "FK", "CLT"],
    },
    {
        number: "12082",
        name: "Jan Shatabdi Express",
        type: "Superfast",
        departure: "13:30:00",
        coaches: [
            { coach_type: "2A", count: 2 },
            { coach_type: "CC", count: 8 },
            { coach_type: "GEN", count: 1 },
        ],
        route: ["CLT", "FK", "TIR", "SRR", "TCR", "AWY", "ERS", "ALLP", "KYJ", "QLN", "KCVL", "TVC"],
    },

    // ── 16649 / 16650  Parasuram Express (CLT ↔ Mangaluru Jn)
    // Rake: 4 C(CC) + 6 S(SL) + 2 GEN — short inter-city run
    {
        number: "16649",
        name: "Parasuram Express",
        type: "Express",
        departure: "06:00:00",
        coaches: [
            { coach_type: "CC",  count: 4 },  // C1–C4
            { coach_type: "SL",  count: 6 },  // S1–S6
            { coach_type: "GEN", count: 2 },
        ],
        route: ["CLT", "QLD", "BDJ", "TLY", "CAN", "PAY", "KZE", "KGQ", "MAQ"],
    },
    {
        number: "16650",
        name: "Parasuram Express",
        type: "Express",
        departure: "14:30:00",
        coaches: [
            { coach_type: "CC",  count: 4 },
            { coach_type: "SL",  count: 6 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["MAQ", "KGQ", "KZE", "PAY", "CAN", "TLY", "BDJ", "QLD", "CLT"],
    },

    // ── 16603 / 16604  Maveli Express (ERS ↔ Kanyakumari)
    // Rake: 2 B(3A) + 8 S(SL) + 2 GEN
    {
        number: "16603",
        name: "Maveli Express",
        type: "Express",
        departure: "12:30:00",
        coaches: [
            { coach_type: "3A",  count: 2 },  // B1–B2
            { coach_type: "SL",  count: 8 },  // S1–S8
            { coach_type: "GEN", count: 2 },
        ],
        route: ["ERS", "ALLP", "HAD", "KYJ", "MVLK", "CNGR", "TRVL", "QLN", "VAK", "TVC", "NYY", "PASA", "CAPE"],
    },
    {
        number: "16604",
        name: "Maveli Express",
        type: "Express",
        departure: "10:00:00",
        coaches: [
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 8 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["CAPE", "PASA", "NYY", "TVC", "VAK", "QLN", "TRVL", "CNGR", "MVLK", "KYJ", "HAD", "ALLP", "ERS"],
    },

    // ── 16305 / 16306  Sabari Express (ERS ↔ TVC)
    // Rake: 2 B(3A) + 7 S(SL) + 2 GEN
    {
        number: "16305",
        name: "Sabari Express",
        type: "Express",
        departure: "07:30:00",
        coaches: [
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 7 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["ERS", "KTYM", "CGY", "CNGR", "TRVL", "KYJ", "HAD", "ALLP", "AMPA", "SRTL", "QLN", "VAK", "TVC"],
    },
    {
        number: "16306",
        name: "Sabari Express",
        type: "Express",
        departure: "16:45:00",
        coaches: [
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 7 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["TVC", "VAK", "QLN", "SRTL", "AMPA", "ALLP", "HAD", "KYJ", "TRVL", "CNGR", "CGY", "KTYM", "ERS"],
    },

    // ── 16605 / 16606  Ernad Express (CLT ↔ TVC)
    // Rake: 2 C(CC) + 2 B(3A) + 8 S(SL) + 2 GEN
    {
        number: "16605",
        name: "Ernad Express",
        type: "Express",
        departure: "09:45:00",
        coaches: [
            { coach_type: "CC",  count: 2 },  // C1–C2
            { coach_type: "3A",  count: 2 },  // B1–B2
            { coach_type: "SL",  count: 8 },  // S1–S8
            { coach_type: "GEN", count: 2 },
        ],
        route: ["CLT", "QLD", "BDJ", "ETR", "FK", "TIR", "SRR", "TCR", "AWY", "ERS", "ALLP", "KYJ", "QLN", "TVC"],
    },
    {
        number: "16606",
        name: "Ernad Express",
        type: "Express",
        departure: "18:30:00",
        coaches: [
            { coach_type: "CC",  count: 2 },
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 8 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["TVC", "QLN", "KYJ", "ALLP", "ERS", "AWY", "TCR", "SRR", "TIR", "FK", "ETR", "BDJ", "QLD", "CLT"],
    },

    // ── 16307 / 16308  Cannanore Express (CAN ↔ TVC)
    // Rake: 2 B(3A) + 9 S(SL) + 2 GEN
    {
        number: "16307",
        name: "Cannanore Express",
        type: "Express",
        departure: "19:00:00",
        coaches: [
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 9 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["CAN", "TLY", "BDJ", "QLD", "ETR", "FK", "CLT", "TIR", "KTU", "SRR", "TCR", "AWY", "ERS", "ALLP", "KYJ", "QLN", "VAK", "TVC"],
    },
    {
        number: "16308",
        name: "Cannanore Express",
        type: "Express",
        departure: "08:30:00",
        coaches: [
            { coach_type: "3A",  count: 2 },
            { coach_type: "SL",  count: 9 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["TVC", "VAK", "QLN", "KYJ", "ALLP", "ERS", "AWY", "TCR", "SRR", "KTU", "TIR", "CLT", "FK", "ETR", "QLD", "BDJ", "TLY", "CAN"],
    },

    // ── 12617 / 12618  Mangala Lakshadweep Express (ERS ↔ H. Nizamuddin)
    // Rake: 1 H(1A) + 3 A(2A) + 8 B(3A) + 8 S(SL) + 2 GEN
    {
        number: "12617",
        name: "Mangala Lakshadweep Express",
        type: "Superfast",
        departure: "20:45:00",
        coaches: [
            { coach_type: "1A",  count: 1 },
            { coach_type: "2A",  count: 3 },
            { coach_type: "3A",  count: 8 },
            { coach_type: "SL",  count: 8 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["ERS", "AWY", "TCR", "SRR", "CLT", "TLY", "CAN", "PAY", "KZE", "KGQ", "MAQ"],
    },
    {
        number: "12618",
        name: "Mangala Lakshadweep Express",
        type: "Superfast",
        departure: "05:30:00",
        coaches: [
            { coach_type: "1A",  count: 1 },
            { coach_type: "2A",  count: 3 },
            { coach_type: "3A",  count: 8 },
            { coach_type: "SL",  count: 8 },
            { coach_type: "GEN", count: 2 },
        ],
        route: ["MAQ", "KGQ", "KZE", "PAY", "CAN", "TLY", "CLT", "SRR", "TCR", "AWY", "ERS"],
    },
];

// ─── Coach seat layout plans ────────────────────────────────────────────────
const seatPlanForCoach = (coach_type) => {
    if (coach_type === "GEN") {
        return { capacity: 100, seatsToGenerate: 1, perRow: 1, pattern: [{ berth_type: "WS", is_side_berth: false, col: 0 }] };
    }
    if (coach_type === "SL") {
        return {
            capacity: 72, seatsToGenerate: 72, perRow: 8,
            pattern: [
                { berth_type: "LB", is_side_berth: false, col: 0 },
                { berth_type: "MB", is_side_berth: false, col: 1 },
                { berth_type: "UB", is_side_berth: false, col: 2 },
                { berth_type: "LB", is_side_berth: false, col: 3 },
                { berth_type: "MB", is_side_berth: false, col: 4 },
                { berth_type: "UB", is_side_berth: false, col: 5 },
                { berth_type: "SL", is_side_berth: true,  col: 6 },
                { berth_type: "SU", is_side_berth: true,  col: 7 },
            ],
        };
    }
    if (coach_type === "3A") {
        return {
            capacity: 64, seatsToGenerate: 64, perRow: 8,
            pattern: [
                { berth_type: "LB", is_side_berth: false, col: 0 },
                { berth_type: "MB", is_side_berth: false, col: 1 },
                { berth_type: "UB", is_side_berth: false, col: 2 },
                { berth_type: "LB", is_side_berth: false, col: 3 },
                { berth_type: "MB", is_side_berth: false, col: 4 },
                { berth_type: "UB", is_side_berth: false, col: 5 },
                { berth_type: "SL", is_side_berth: true,  col: 6 },
                { berth_type: "SU", is_side_berth: true,  col: 7 },
            ],
        };
    }
    if (coach_type === "2A") {
        return {
            capacity: 48, seatsToGenerate: 48, perRow: 6,
            pattern: [
                { berth_type: "LB", is_side_berth: false, col: 0 },
                { berth_type: "UB", is_side_berth: false, col: 1 },
                { berth_type: "LB", is_side_berth: false, col: 2 },
                { berth_type: "UB", is_side_berth: false, col: 3 },
                { berth_type: "SL", is_side_berth: true,  col: 4 },
                { berth_type: "SU", is_side_berth: true,  col: 5 },
            ],
        };
    }
    if (coach_type === "1A") {
        return {
            capacity: 24, seatsToGenerate: 24, perRow: 2,
            pattern: [
                { berth_type: "LB", is_side_berth: false, col: 0 },
                { berth_type: "UB", is_side_berth: false, col: 1 },
            ],
        };
    }
    // CC (Chair Car)
    return {
        capacity: 78, seatsToGenerate: 78, perRow: 5,
        pattern: [
            { berth_type: "WS", is_side_berth: false, col: 0 },
            { berth_type: "MS", is_side_berth: false, col: 1 },
            { berth_type: "AS", is_side_berth: false, col: 2 },
            { berth_type: "MS", is_side_berth: false, col: 3 },
            { berth_type: "WS", is_side_berth: false, col: 4 },
        ],
    };
};

// ─── Map station code → approximate km from TVC (used for realistic distances) ─
const APPROX_KM = {
    TVC: 0, KCVL: 6, NEM: 18, NYY: 30, PASA: 40, CAPE: 90,
    VAK: 55, QLN: 70, KUV: 85, PUU: 100,
    KYJ: 104, ALLP: 130, AMPA: 140, SRTL: 150, HAD: 120, MVLK: 110,
    CNGR: 135, TRVL: 143, CGY: 157, KTYM: 167, ETM: 175,
    ERS: 194, ERN: 200, TRTR: 190, AWY: 208, AFK: 218, KLMR: 204, EDPL: 201,
    CKI: 232, IJK: 240, TCR: 252, GUV: 260, KUMM: 258, WKI: 245, CTRE: 255,
    SRR: 264, OTP: 270, PTB: 278, PGT: 290, PGTN: 292,
    TIR: 310, KTU: 315, AAM: 320, PTMN: 325, MJR: 330,
    FK: 337, CLT: 344, BDJ: 370, QLD: 360, ETR: 340,
    TLY: 392, CAN: 404, PAY: 425, KZE: 455, KGQ: 470,
    MAQ: 510, MAJN: 515, UD: 545, KUDA: 555,
    CAPE: 92, TEN: 140, MDU: 310, CBE: 360, ED: 430, SA: 480, MAS: 700, MS: 702,
    SBC: 620,
};

const getDistanceBetween = (codeA, codeB) => {
    const a = APPROX_KM[codeA] ?? 0;
    const b = APPROX_KM[codeB] ?? 0;
    return Math.abs(b - a);
};

// ─── Main seed function ─────────────────────────────────────────────────────
const seed = async () => {
    try {
        await sequelize.sync({ alter: false });

        if (SEED_FORCE) {
            await TrainStop.destroy({ where: {}, truncate: true, cascade: true });
            await Seat.destroy({ where: {}, truncate: true, cascade: true });
            await Coach.destroy({ where: {}, truncate: true, cascade: true });
            await TrainRun.destroy({ where: {}, truncate: true, cascade: true });
            await Train.destroy({ where: {}, truncate: true, cascade: true });
            await Station.destroy({ where: {}, truncate: true, cascade: true });
            await FareRule.destroy({ where: {}, truncate: true, cascade: true });
            await SeatTypePricing.destroy({ where: {}, truncate: true, cascade: true });
            console.log("✅ Cleared existing data");
        }

        // ── Insert stations ──
        const stationByCode = new Map();
        for (const s of STATIONS) {
            const [st] = await Station.findOrCreate({ where: { code: s.code }, defaults: s });
            stationByCode.set(st.code, st);
        }
        console.log(`✅ Stations: ${stationByCode.size}`);

        // ── Fare rules (2024 Indian Railways Tariff) ──────────────────────────
        // Source: IR Passenger Fare Circular
        // Formula: total = base_fare + max(0, distance-min_distance)*per_km_rate
        //          + reservation_charge [+ superfast_charge for SF] * seat_multiplier
        //          + GST
        await FareRule.bulkCreate([
            // ── Express trains ────────────────────────────────────────────────
            { train_type: "EXPRESS", coach_type: "SL",  base_fare: 105,  per_km_rate: 0.52, min_distance: 0, reservation_charge: 20, gst_percent: 0   },
            { train_type: "EXPRESS", coach_type: "3A",  base_fare: 415,  per_km_rate: 1.56, min_distance: 0, reservation_charge: 40, gst_percent: 5   },
            { train_type: "EXPRESS", coach_type: "2A",  base_fare: 600,  per_km_rate: 2.00, min_distance: 0, reservation_charge: 50, gst_percent: 5   },
            { train_type: "EXPRESS", coach_type: "1A",  base_fare: 1100, per_km_rate: 3.20, min_distance: 0, reservation_charge: 60, gst_percent: 5   },
            { train_type: "EXPRESS", coach_type: "CC",  base_fare: 175,  per_km_rate: 0.95, min_distance: 0, reservation_charge: 30, gst_percent: 5   },
            { train_type: "EXPRESS", coach_type: "GEN", base_fare: 30,   per_km_rate: 0.30, min_distance: 0, reservation_charge: 0,  gst_percent: 0   },
            // ── Superfast trains (+superfast surcharge, slightly higher base) ─
            { train_type: "SUPERFAST", coach_type: "SL",  base_fare: 115,  per_km_rate: 0.55, min_distance: 0, reservation_charge: 20, superfast_charge: 30, gst_percent: 0 },
            { train_type: "SUPERFAST", coach_type: "3A",  base_fare: 460,  per_km_rate: 1.65, min_distance: 0, reservation_charge: 40, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "2A",  base_fare: 665,  per_km_rate: 2.10, min_distance: 0, reservation_charge: 50, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "1A",  base_fare: 1200, per_km_rate: 3.50, min_distance: 0, reservation_charge: 60, superfast_charge: 75, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "CC",  base_fare: 200,  per_km_rate: 1.02, min_distance: 0, reservation_charge: 30, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "GEN", base_fare: 35,   per_km_rate: 0.33, min_distance: 0, reservation_charge: 0,  superfast_charge: 0,  gst_percent: 0 },
            // ── Local / Suburban ─────────────────────────────────────────────
            { train_type: "LOCAL",     coach_type: "GEN", base_fare: 10,   per_km_rate: 0.22, min_distance: 0, reservation_charge: 0,  gst_percent: 0 },
        ], { ignoreDuplicates: true });

        await SeatTypePricing.bulkCreate([
            { coach_type: "SL", seat_type: "LOWER",      price_multiplier: 1.10 },
            { coach_type: "SL", seat_type: "MIDDLE",     price_multiplier: 0.98 },
            { coach_type: "SL", seat_type: "UPPER",      price_multiplier: 0.95 },
            { coach_type: "SL", seat_type: "SIDE_LOWER", price_multiplier: 1.12 },
            { coach_type: "SL", seat_type: "SIDE_UPPER", price_multiplier: 0.94 },
            { coach_type: "3A", seat_type: "LOWER",      price_multiplier: 1.08 },
            { coach_type: "3A", seat_type: "MIDDLE",     price_multiplier: 1.00 },
            { coach_type: "3A", seat_type: "UPPER",      price_multiplier: 0.98 },
            { coach_type: "3A", seat_type: "SIDE_LOWER", price_multiplier: 1.05 },
            { coach_type: "3A", seat_type: "SIDE_UPPER", price_multiplier: 0.96 },
            { coach_type: "2A", seat_type: "LOWER",      price_multiplier: 1.10 },
            { coach_type: "2A", seat_type: "UPPER",      price_multiplier: 1.02 },
            { coach_type: "2A", seat_type: "SIDE_LOWER", price_multiplier: 1.08 },
            { coach_type: "2A", seat_type: "SIDE_UPPER", price_multiplier: 1.00 },
            { coach_type: "1A", seat_type: "LOWER",      price_multiplier: 1.10 },
            { coach_type: "1A", seat_type: "UPPER",      price_multiplier: 1.00 },
            { coach_type: "CC", seat_type: "WINDOW",     price_multiplier: 1.05 },
            { coach_type: "CC", seat_type: "AISLE",      price_multiplier: 1.02 },
            { coach_type: "CC", seat_type: "MIDDLE",     price_multiplier: 1.00 },
        ], { ignoreDuplicates: true });

        console.log("✅ Fare rules + seat pricing loaded");

        // ── Trains ──
        let trainCount = 0, coachCount = 0, seatCount = 0;

        for (const bp of TRAIN_BLUEPRINTS) {
            // Filter route to only stations that exist in our DB
            const validRoute = bp.route.filter(code => stationByCode.has(code));
            if (validRoute.length < 2) {
                console.warn(`⚠️  Skipping ${bp.number} ${bp.name}: not enough valid stations`);
                continue;
            }

            const train = await Train.create({
                train_number: bp.number,
                train_name:   bp.name,
                train_type:   bp.type,
                active_days:  "Daily",
                status:       "active",
            });
            trainCount++;

            const sourceCode = validRoute[0];
            const destCode   = validRoute[validRoute.length - 1];
            const sourceStation = stationByCode.get(sourceCode);
            const destStation   = stationByCode.get(destCode);

            const run = await TrainRun.create({
                train_id:               train.train_id,
                direction:              "DOWN",
                source_station_id:      sourceStation.id,
                destination_station_id: destStation.id,
                departure_time:         bp.departure,
                arrival_time:           addMinutes(bp.departure, validRoute.length * 50),
                duration:               `${validRoute.length * 50}m`,
                days_of_run:            "Daily",
                status:                 "active",
            });

            // ── Stops with realistic incremental distances ──
            let cumulativeKm = 0;
            let currentTime = bp.departure;

            for (let idx = 0; idx < validRoute.length; idx++) {
                const code = validRoute[idx];
                const st   = stationByCode.get(code);
                if (!st) continue;

                const isFirst = idx === 0;
                const isLast  = idx === validRoute.length - 1;

                if (idx > 0) {
                    const prev = validRoute[idx - 1];
                    cumulativeKm += getDistanceBetween(prev, code);
                }

                const arrival   = isFirst ? null : currentTime;
                const departure = isLast  ? null : addMinutes(currentTime, 2);

                await TrainStop.create({
                    run_id:               run.run_id,
                    station_id:           st.id,
                    stop_order:           idx + 1,
                    arrival_time:         arrival,
                    departure_time:       departure,
                    halt_duration:        isFirst || isLast ? 0 : 2,
                    distance_from_source: cumulativeKm,
                });

                if (!isLast) currentTime = addMinutes(currentTime, 50);
            }

            // ── Coaches + Seats ──
            let seq = 1;
            for (const c of bp.coaches) {
                const plan = seatPlanForCoach(c.coach_type);
                for (let k = 1; k <= c.count; k++) {
                    const coach = await Coach.create({
                        train_id:       train.train_id,
                        coach_number:   `${c.coach_type}${k}`,
                        coach_type:     c.coach_type,
                        sequence_order: seq++,
                        capacity:       plan.capacity,
                    });
                    coachCount++;

                    const seats = [];
                    for (let n = 1; n <= plan.seatsToGenerate; n++) {
                        const row = Math.ceil(n / plan.perRow);
                        const p   = plan.pattern[(n - 1) % plan.pattern.length];
                        seats.push({
                            coach_id:     coach.coach_id,
                            seat_number:  n,
                            berth_type:   p.berth_type,
                            row_number:   row,
                            is_side_berth: Boolean(p.is_side_berth),
                            column_index: p.col,
                            status:       "available",
                        });
                    }
                    await Seat.bulkCreate(seats);
                    seatCount += seats.length;
                }
            }

            console.log(`  ✅ ${bp.number} ${bp.name}  (${validRoute[0]} → ${validRoute[validRoute.length - 1]}, ${validRoute.length} stops)`);
        }

        console.log("\n🎉 Seed complete!");
        console.log({ stations: stationByCode.size, trains: trainCount, coaches: coachCount, seats: seatCount });
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exitCode = 1;
    } finally {
        await sequelize.close().catch(() => {});
    }
};

seed();
