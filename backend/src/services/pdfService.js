import PDFDocument from "pdfkit";
import QRCode from "qrcode";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
    navy:         "#0F2044",
    blue:         "#1A56DB",
    lightBlue:    "#EBF5FF",
    green:        "#059669",
    lightGreen:   "#ECFDF5",
    orange:       "#D97706",
    lightOrange:  "#FFFBEB",
    red:          "#DC2626",
    lightRed:     "#FEF2F2",
    grey:         "#6B7280",
    lightGrey:    "#F3F4F6",
    border:       "#E5E7EB",
    white:        "#FFFFFF",
    black:        "#111827",
    seatBooked:   "#059669",
    seatAvail:    "#D1D5DB",
    // GEN / Unreserved palette
    genHeaderBg:  "#78350F",
    genAmber:     "#92400E",
    genAmberLight:"#FFFBEB",
    genAmberMid:  "#FDE68A",
    genOrange:    "#D97706",
    genOrangeDark:"#78350F",
};

const PAGE_W = 595;
const PAGE_H = 841;
const MARGIN  = 36;
const PW      = PAGE_W - MARGIN * 2;
const SAFE_Y  = PAGE_H - 60;

// ── Coach labels ──────────────────────────────────────────────────────────────
const BERTH_LABELS = {
    LB: "Lower", MB: "Middle", UB: "Upper",
    SL: "Side-L", SU: "Side-U", WS: "Window",
    MS: "Middle", AS: "Aisle",
};
const COACH_LABELS = {
    SL: "Sleeper", "2A": "2nd AC", "3A": "3rd AC",
    "1A": "1st AC", CC: "Chair Car", EC: "Exec Chair",
    "2S": "2nd Sit", EA: "Exec AC", EV: "Vistadome",
    GEN: "General (Unreserved)",
};

// ── QR helper ─────────────────────────────────────────────────────────────────
async function makeQR(data, dark = "#0F2044") {
    return QRCode.toBuffer(data, {
        errorCorrectionLevel: "M", type: "png", margin: 1,
        color: { dark, light: "#FFFFFF" }, width: 200,
    });
}

// ── Time formatter ────────────────────────────────────────────────────────────
function formatTime(t) {
    if (!t) return null;
    const parts = String(t).split(":");
    if (parts.length >= 2) return `${parts[0].padStart(2,"0")}:${parts[1].padStart(2,"0")}`;
    return String(t);
}

// ── Low-level drawing ─────────────────────────────────────────────────────────
function fillRect(doc, x, y, w, h, col) {
    doc.save().rect(x, y, w, h).fill(col).restore();
}
function hRule(doc, x, y, w, col = C.border) {
    doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(0.5).strokeColor(col).stroke().restore();
}
function syncCursor(doc, y) {
    doc.text("", MARGIN, y, { lineBreak: false });
}
function ensureSpace(doc, y, needed = 80) {
    if (y + needed > SAFE_Y) { doc.addPage(); syncCursor(doc, MARGIN); return MARGIN; }
    return y;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function statusBadge(doc, x, y, status) {
    const map = {
        confirmed: { bg: C.lightGreen,  fg: C.green,  label: "CONFIRMED" },
        paid:      { bg: C.lightGreen,  fg: C.green,  label: "CONFIRMED" },
        pending:   { bg: C.lightOrange, fg: C.orange, label: "PENDING"   },
        failed:    { bg: C.lightRed,    fg: C.red,    label: "FAILED"    },
        cancelled: { bg: C.lightRed,    fg: C.red,    label: "CANCELLED" },
    };
    const s   = map[(status || "pending").toLowerCase()] || map.pending;
    const pad = 12, h = 22;
    doc.fontSize(9).font("Helvetica-Bold");
    const bw = doc.widthOfString(s.label) + pad * 2;
    doc.save()
        .roundedRect(x - bw, y, bw, h, 4).fill(s.bg)
        .fillColor(s.fg).text(s.label, x - bw, y + 6, { width: bw, align: "center" })
        .restore();
}

// ── Section header ────────────────────────────────────────────────────────────
function sectionHeader(doc, y, title, bgColor = C.navy) {
    fillRect(doc, MARGIN, y, PW, 22, bgColor);
    doc.save()
        .fillColor(C.white).font("Helvetica-Bold").fontSize(9)
        .text(title, MARGIN + 10, y + 6, { width: PW - 20 })
        .restore();
    return y + 22;
}

// ── Info cell ─────────────────────────────────────────────────────────────────
function infoCell(doc, x, y, label, value, w = 100) {
    doc.save()
        .font("Helvetica").fontSize(7).fillColor(C.grey)
        .text(label.toUpperCase(), x, y, { width: w });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.black)
        .text(value || "-", x, y + 10, { width: w });
    doc.restore();
}

// ── Table row ─────────────────────────────────────────────────────────────────
function tableRow(doc, y, cols, isHeader = false, isAlt = false, altColor = C.lightGrey) {
    const rowH = isHeader ? 20 : 17;
    if (isAlt) {
        const totalW = cols[cols.length-1].x + cols[cols.length-1].w - cols[0].x;
        fillRect(doc, cols[0].x, y, totalW, rowH, altColor);
    }
    for (const col of cols) {
        doc.save()
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(isHeader ? 7.5 : 8)
            .fillColor(isHeader ? C.navy : C.black)
            .text(String(col.val ?? ""), col.x + 3, y + (isHeader ? 6 : 5), { width: col.w - 6, ellipsis: true })
            .restore();
    }
    return y + rowH;
}

// ── Seat grid (reserved tickets only) ────────────────────────────────────────
function drawSeatLayout(doc, startY, coachData, bookedSeatIds) {
    const CELL = 16, GAP = 2, x = MARGIN + 10;
    const seats = [...(coachData.seats || [])]
        .filter(s => s.seat_number > 0)
        .sort((a, b) => a.seat_number - b.seat_number);
    if (seats.length === 0) return startY;

    const coachType = coachData.coach_type;
    let colsPerRow  = 6;
    if (["1A","2A"].includes(coachType))                   colsPerRow = 4;
    else if (["CC","EC","EA","2S"].includes(coachType))    colsPerRow = 5;

    const cols    = Math.min(colsPerRow, seats.length);
    const maxRows = 8;
    const display = seats.slice(0, cols * maxRows);
    let row = 0, col = 0, Y = startY;

    for (const seat of display) {
        const sx      = x + col * (CELL + GAP);
        const sy      = Y + row * (CELL + GAP);
        const booked  = bookedSeatIds.has(seat.seat_id);
        const fill    = booked ? C.seatBooked : C.seatAvail;
        const textCol = booked ? C.white : "#4B5563";
        doc.save().roundedRect(sx, sy, CELL, CELL, 2).fill(fill).restore();
        doc.save().fillColor(textCol).font("Helvetica-Bold").fontSize(5.5)
            .text(String(seat.seat_number), sx, sy + 3, { width: CELL, align: "center" }).restore();
        doc.save().fillColor(textCol).font("Helvetica").fontSize(4.5)
            .text(BERTH_LABELS[seat.berth_type] || seat.berth_type, sx, sy + 10, { width: CELL, align: "center" }).restore();
        col++;
        if (col >= cols) { col = 0; row++; }
    }

    const gridH   = Math.ceil(display.length / cols) * (CELL + GAP);
    const legendY = Y + gridH + 6;
    let lx = x;
    for (const item of [
        { colour: C.seatBooked, label: "Booked by you" },
        { colour: C.seatAvail,  label: "Available" },
    ]) {
        doc.save().rect(lx, legendY, 9, 9).fill(item.colour).restore();
        doc.save().fillColor(C.grey).font("Helvetica").fontSize(6.5)
            .text(item.label, lx + 12, legendY + 1, { width: 80 }).restore();
        lx += 95;
    }
    if (display.length < seats.length) {
        doc.save().fillColor(C.grey).font("Helvetica").fontSize(6.5)
            .text(`Showing ${display.length} of ${seats.length} seats`, lx + 10, legendY + 1, { width: 120 }).restore();
    }
    return legendY + 16;
}

// =============================================================================
//  GEN "Open Ticket" PDF — unreserved, time-bound, amber theme
// =============================================================================
async function generateGenTicketPDF(booking, res) {
    const doc = new PDFDocument({
        size: "A4", margin: 0,
        info: {
            Title:   `RailSeat Open Ticket - PNR ${booking.booking_number}`,
            Author:  "RailSeat",
            Subject: "General / Unreserved Open Ticket",
        }
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
        `attachment; filename="RailSeat_${booking.booking_number}.pdf"`);
    doc.pipe(res);

    // ── Validity calculation ─────────────────────────────────────────────────
    const bookingTs  = booking.createdAt ? new Date(booking.createdAt) : new Date();
    const validUntil = new Date(bookingTs.getTime() + 2 * 60 * 60 * 1000); // +2 h

    const fmtDT = (d) => d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
    const fmtDO = (d) => d.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", weekday: "short",
    });

    const bookingTimeStr = fmtDT(bookingTs);
    const validUntilStr  = fmtDT(validUntil);
    const travelDateStr  = fmtDO(new Date(booking.travel_date));
    const passengers     = booking.passengers || [];
    const totalAmount    = Number(booking.total_amount) || 0;
    let Y = 0;

    // ── HEADER (deep amber) ──────────────────────────────────────────────────
    fillRect(doc, 0, 0, PAGE_W, 66, C.genHeaderBg);
    fillRect(doc, 0, 66, PAGE_W, 4, C.genOrange);
    doc.save()
        .fillColor(C.white).font("Helvetica-Bold").fontSize(22)
        .text("RailSeat", MARGIN, 15);
    doc.fillColor("#FDE68A").font("Helvetica").fontSize(8.5)
        .text("General / Unreserved Open Ticket  |  Time-Bound Travel Pass", MARGIN, 41);
    doc.restore();
    statusBadge(doc, PAGE_W - MARGIN, 16, booking.payment_status || booking.booking_status);
    // "OPEN TICKET" pill
    doc.save()
        .roundedRect(PAGE_W - MARGIN - 140, 44, 80, 16, 3).fill("#FDE68A");
    doc.fillColor(C.genHeaderBg).font("Helvetica-Bold").fontSize(7.5)
        .text("OPEN TICKET", PAGE_W - MARGIN - 140, 49, { width: 80, align: "center" });
    doc.restore();
    Y = 82;

    // ── DIAGONAL WATERMARK ───────────────────────────────────────────────────
    doc.save()
        .translate(PAGE_W / 2, PAGE_H / 2)
        .rotate(-45)
        .fillColor("#FDE68A").fillOpacity(0.12)
        .font("Helvetica-Bold").fontSize(72)
        .text("UNRESERVED", -180, -40, { width: 360, align: "center" })
        .fillOpacity(1)
        .restore();

    // ── PNR BAR ──────────────────────────────────────────────────────────────
    fillRect(doc, MARGIN, Y, PW, 34, C.genAmberLight);
    doc.save()
        .fillColor(C.genHeaderBg).font("Helvetica-Bold").fontSize(10)
        .text(`PNR:  ${booking.booking_number}`, MARGIN + 10, Y + 6);
    doc.fillColor(C.grey).font("Helvetica").fontSize(7.5)
        .text(
            `Booked: ${bookingTimeStr}   |   Contact: ${booking.contact_name}`,
            MARGIN + 10, Y + 20
        );
    doc.restore();
    Y += 46;

    // ── TRAVEL DETAILS ───────────────────────────────────────────────────────
    Y = sectionHeader(doc, Y, "TRAVEL DETAILS", C.genHeaderBg);
    Y += 14;

    const fromX = MARGIN + 10, arrowX = MARGIN + 158, toX = MARGIN + 220;

    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("BOARDING STATION", fromX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(20)
        .text(booking.source_station || "-", fromX, Y + 10);
    doc.restore();

    const arrowMidY = Y + 23;
    doc.save()
        .moveTo(arrowX, arrowMidY).lineTo(arrowX + 36, arrowMidY)
        .lineWidth(2).strokeColor(C.genOrange).stroke()
        .polygon([arrowX + 36, arrowMidY - 5], [arrowX + 48, arrowMidY], [arrowX + 36, arrowMidY + 5])
        .fill(C.genOrange).restore();

    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("DESTINATION STATION", toX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(20)
        .text(booking.destination_station || "-", toX, Y + 10);
    doc.restore();

    Y += 42;
    hRule(doc, MARGIN, Y, PW, C.genAmberMid);
    Y += 10;
    infoCell(doc, MARGIN + 10, Y, "Travel Date", travelDateStr, 200);
    Y += 36;
    hRule(doc, MARGIN, Y, PW, C.genAmberMid);
    Y += 12;

    // ── TICKET VALIDITY ──────────────────────────────────────────────────────
    Y = ensureSpace(doc, Y, 120);
    Y = sectionHeader(doc, Y, "TICKET VALIDITY", C.genHeaderBg);
    Y += 10;

    const halfW = (PW - 20) / 2;
    const BOX_H = 52;

    // Booked At
    fillRect(doc, MARGIN + 10, Y, halfW, BOX_H, C.genAmberLight);
    doc.save()
        .rect(MARGIN + 10, Y, halfW, BOX_H).lineWidth(0.5).strokeColor(C.genAmberMid).stroke();
    doc.fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("BOOKED AT (Payment Confirmed)", MARGIN + 16, Y + 6, { width: halfW - 12 });
    doc.fillColor(C.genHeaderBg).font("Helvetica-Bold").fontSize(10)
        .text(bookingTimeStr, MARGIN + 16, Y + 18, { width: halfW - 12 });
    doc.restore();

    // Valid Until
    const vBox = MARGIN + 10 + halfW + 10;
    fillRect(doc, vBox, Y, halfW, BOX_H, "#FEF9C3");
    doc.save()
        .rect(vBox, Y, halfW, BOX_H).lineWidth(0.5).strokeColor(C.genAmberMid).stroke();
    doc.fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("VALID UNTIL (Expires)", vBox + 6, Y + 6, { width: halfW - 12 });
    doc.fillColor(C.red).font("Helvetica-Bold").fontSize(10)
        .text(validUntilStr, vBox + 6, Y + 18, { width: halfW - 12 });
    doc.restore();
    Y += BOX_H + 10;

    // Instructional banner
    fillRect(doc, MARGIN, Y, PW, 32, "#FFFBEB");
    doc.save()
        .rect(MARGIN, Y, PW, 32).lineWidth(0.5).strokeColor(C.genAmberMid).stroke();
    doc.fillColor(C.genAmber).font("Helvetica-Bold").fontSize(8)
        .text("IMPORTANT:", MARGIN + 10, Y + 6);
    doc.fillColor(C.genOrangeDark).font("Helvetica").fontSize(7.5)
        .text(
            "Valid for travel in any train departing within 2 hours of booking time. " +
            "Seating is unreserved and on a first-come, first-served basis.",
            MARGIN + 10, Y + 18, { width: PW - 20 }
        );
    doc.restore();
    Y += 44;
    hRule(doc, MARGIN, Y, PW, C.genAmberMid);
    Y += 12;

    // ── PASSENGER TABLE ──────────────────────────────────────────────────────
    Y = ensureSpace(doc, Y, 70);
    Y = sectionHeader(doc, Y, "PASSENGER DETAILS", C.genHeaderBg);
    Y += 6;

    const TC = [
        { x: MARGIN + 4,   w: 22,  val: "#" },
        { x: MARGIN + 28,  w: 140, val: "Passenger Name" },
        { x: MARGIN + 170, w: 70,  val: "Gender" },
        { x: MARGIN + 242, w: 110, val: "Ticket Type" },
        { x: MARGIN + 354, w: 70,  val: "Status" },
        { x: MARGIN + 426, w: 90,  val: "Fare (INR)" },
    ];

    fillRect(doc, MARGIN, Y, PW, 20, C.genAmberMid);
    Y = tableRow(doc, Y, TC, true);

    const perHead = passengers.length > 0 ? Math.round(totalAmount / passengers.length) : 0;
    passengers.forEach((p, i) => {
        Y = ensureSpace(doc, Y, 20);
        const gender = (p.passenger_gender || "").charAt(0).toUpperCase()
            + (p.passenger_gender || "").slice(1);
        Y = tableRow(doc, Y, TC.map((c, ci) => ({
            ...c,
            val: [
                i + 1,
                p.passenger_name,
                gender,
                "General (Unreserved)",
                (booking.booking_status || "-").toUpperCase(),
                `Rs. ${perHead}`,
            ][ci],
        })), false, i % 2 === 1, "#FFF7ED");
    });

    Y += 8;
    hRule(doc, MARGIN, Y, PW, C.genAmberMid);
    Y += 12;

    // ── PAYMENT DETAILS ──────────────────────────────────────────────────────
    Y = ensureSpace(doc, Y, 130);
    Y = sectionHeader(doc, Y, "PAYMENT DETAILS", C.genHeaderBg);
    Y += 10;

    const baseFare    = Math.round(totalAmount / 1.05 / 1.18);
    const gst         = Math.round(totalAmount - baseFare * 1.05);
    const convenience = Math.round(baseFare * 0.05);
    const priceX      = MARGIN + PW - 130;

    for (const [label, value, bold] of [
        ["Base Ticket Fare",  `Rs. ${baseFare}`,    false],
        ["Convenience Fee",   `Rs. ${convenience}`, false],
        ["GST (18%)",         `Rs. ${gst}`,         false],
        ["Total Amount Paid", `Rs. ${totalAmount}`, true],
    ]) {
        if (bold) {
            fillRect(doc, MARGIN, Y - 2, PW, 20, C.lightGreen);
            doc.save()
                .fillColor(C.green).font("Helvetica-Bold").fontSize(10)
                .text(label, MARGIN + 10, Y + 2)
                .text(value, priceX, Y + 2, { width: 120, align: "right" })
                .restore();
        } else {
            doc.save()
                .fillColor(C.grey).font("Helvetica").fontSize(8.5)
                .text(label, MARGIN + 10, Y + 2)
                .fillColor(C.black)
                .text(value, priceX, Y + 2, { width: 120, align: "right" })
                .restore();
        }
        Y += 20;
    }

    Y += 4;
    const payStatusCol = booking.payment_status === "paid" ? C.green : C.orange;
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(8)
        .text("Payment Status:", MARGIN + 10, Y)
        .fillColor(payStatusCol).font("Helvetica-Bold")
        .text((booking.payment_status || "-").toUpperCase(), MARGIN + 108, Y)
        .restore();
    Y += 16;
    hRule(doc, MARGIN, Y, PW, C.genAmberMid);
    Y += 12;

    // ── QR + SUMMARY ─────────────────────────────────────────────────────────
    const qrSize = 90;
    Y = ensureSpace(doc, Y, qrSize + 40);

    // QR encodes: source, destination, expiry — for TC verification (no train details)
    const qrBuf = await makeQR(JSON.stringify({
        pnr:        booking.booking_number,
        from:       booking.source_station,
        to:         booking.destination_station,
        date:       booking.travel_date,
        bookedAt:   bookingTs.toISOString(),
        validUntil: validUntil.toISOString(),
        type:       "UNRESERVED",
    }), C.genHeaderBg);

    const qrX = MARGIN + PW - qrSize;
    doc.image(qrBuf, qrX, Y, { width: qrSize, height: qrSize });
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(6)
        .text("Scan to verify ticket", qrX, Y + qrSize + 3, { width: qrSize, align: "center" })
        .restore();

    doc.save()
        .fillColor(C.genHeaderBg).font("Helvetica-Bold").fontSize(10)
        .text(`PNR: ${booking.booking_number}`, MARGIN + 10, Y + 8);
    doc.fillColor(C.grey).font("Helvetica").fontSize(7.5)
        .text(`Route      : ${booking.source_station} → ${booking.destination_station}`, MARGIN + 10, Y + 24)
        .text(`Travel Date: ${travelDateStr}`,        MARGIN + 10, Y + 36)
        .text(`Class      : General (Unreserved)`,    MARGIN + 10, Y + 48)
        .text(`Booked At  : ${bookingTimeStr}`,        MARGIN + 10, Y + 60)
        .text(`Valid Until: ${validUntilStr}`,         MARGIN + 10, Y + 72);
    doc.fillColor(C.red).font("Helvetica-Bold").fontSize(7)
        .text(
            "Valid for any train departing within 2 hours of booking time.",
            MARGIN + 10, Y + 86, { width: qrX - MARGIN - 20 }
        );
    doc.restore();

    Y = Math.max(Y + qrSize + 16, Y + 106);

    // ── FOOTER ───────────────────────────────────────────────────────────────
    Y = ensureSpace(doc, Y, 52);
    fillRect(doc, 0, Y, PAGE_W, 52, C.lightGrey);
    hRule(doc, 0, Y, PAGE_W, C.border);
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(6.5)
        .text(
            "NOTE: This is an Unreserved (General) open ticket. It does not guarantee a seat. Valid for 2 hours from booking time.",
            MARGIN, Y + 9, { width: PW }
        )
        .text(
            "Support: support@railseat.in  |  This is a system-generated Open Ticket from RailSeat.",
            MARGIN, Y + 21, { width: PW }
        );
    doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(7)
        .text("RailSeat - Seat-Level Train Ticket Booking System  |  Powered by RailSeat",
            MARGIN, Y + 35, { width: PW, align: "center" });
    doc.restore();

    doc.end();
}


// =============================================================================
//  Main entry — branches into GEN or Reserved ticket
// =============================================================================
export async function generateTicketPDF(booking, res) {

    // ── Detect GEN (Unreserved) bookings ─────────────────────────────────────
    const passengers   = booking.passengers || [];
    const firstSeat    = passengers[0]?.seat;
    const coachType    = firstSeat?.coach?.coach_type || "-";
    const isGenBooking = coachType === "GEN"
        || firstSeat?.seat_number === 0
        || !passengers.some(p => p.seat && p.seat.seat_number > 0);

    if (isGenBooking) {
        return generateGenTicketPDF(booking, res);
    }

    // =========================================================================
    //  RESERVED SEAT TICKET (unchanged from original)
    // =========================================================================
    const doc = new PDFDocument({
        size: "A4", margin: 0,
        info: {
            Title:   `RailSeat Ticket - PNR ${booking.booking_number}`,
            Author:  "RailSeat",
            Subject: "Electronic Reservation Slip",
        }
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
        `attachment; filename="RailSeat_${booking.booking_number}.pdf"`);
    doc.pipe(res);

    let Y = 0;

    // HEADER
    fillRect(doc, 0, 0, PAGE_W, 66, C.navy);
    doc.save()
        .fillColor(C.white).font("Helvetica-Bold").fontSize(22).text("RailSeat", MARGIN, 15);
    doc.fillColor("#93C5FD").font("Helvetica").fontSize(8.5)
        .text("Electronic Reservation Slip  |  Seat-Level Train Booking", MARGIN, 41);
    doc.restore();
    fillRect(doc, 0, 66, PAGE_W, 4, C.blue);
    statusBadge(doc, PAGE_W - MARGIN, 16, booking.payment_status || booking.booking_status);
    Y = 82;

    // PNR BAR
    fillRect(doc, MARGIN, Y, PW, 34, C.lightBlue);
    doc.save()
        .fillColor(C.navy).font("Helvetica-Bold").fontSize(10)
        .text(`PNR:  ${booking.booking_number}`, MARGIN + 10, Y + 6);
    doc.fillColor(C.grey).font("Helvetica").fontSize(7.5)
        .text(
            `Booked: ${new Date(booking.createdAt).toLocaleString("en-IN")}   |   Contact: ${booking.contact_name}`,
            MARGIN + 10, Y + 20
        );
    doc.restore();
    Y += 46;

    // JOURNEY INFO
    Y = sectionHeader(doc, Y, "JOURNEY INFORMATION");
    Y += 10;

    const train       = booking.train || {};
    const coachNumber = firstSeat?.coach?.coach_number || "-";
    const coachLabel  = COACH_LABELS[coachType] || coachType;
    const fromX       = MARGIN + 10, arrowX = MARGIN + 158, toX = MARGIN + 220;
    const deptTime    = formatTime(booking.departureTime);
    const arrvTime    = formatTime(booking.arrivalTime);
    const hasTime     = !!(deptTime || arrvTime);

    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7).text("BOARDING STATION", fromX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(16).text(booking.source_station || "-", fromX, Y + 10);
    if (deptTime) {
        doc.fillColor(C.blue).font("Helvetica-Bold").fontSize(9).text(`Dep: ${deptTime}`, fromX, Y + 29);
    }
    doc.restore();

    const arrowMidY = Y + (hasTime ? 23 : 20);
    doc.save()
        .moveTo(arrowX, arrowMidY).lineTo(arrowX + 36, arrowMidY)
        .lineWidth(2).strokeColor(C.blue).stroke()
        .polygon([arrowX+36, arrowMidY-5], [arrowX+48, arrowMidY], [arrowX+36, arrowMidY+5])
        .fill(C.blue).restore();

    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7).text("DESTINATION STATION", toX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(16).text(booking.destination_station || "-", toX, Y + 10);
    if (arrvTime) {
        doc.fillColor(C.green).font("Helvetica-Bold").fontSize(9).text(`Arr: ${arrvTime}`, toX, Y + 29);
    }
    doc.restore();

    Y += hasTime ? 50 : 38;
    hRule(doc, MARGIN, Y, PW);
    Y += 8;

    const travelDate = new Date(booking.travel_date).toLocaleDateString("en-IN",
        { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
    const cellW = (PW - 20) / 5;
    [
        { label: "Travel Date", value: travelDate },
        { label: "Train No.",   value: train.train_number || "-" },
        { label: "Train Name",  value: train.train_name   || "-" },
        { label: "Coach",       value: coachNumber },
        { label: "Class",       value: coachLabel },
    ].forEach((c, i) => infoCell(doc, MARGIN + 10 + i * cellW, Y, c.label, c.value, cellW - 8));
    Y += 36;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // PASSENGER TABLE
    Y = ensureSpace(doc, Y, 70);
    Y = sectionHeader(doc, Y, "PASSENGER DETAILS");
    Y += 6;

    const TC = [
        { x: MARGIN + 4,   w: 22,  val: "#" },
        { x: MARGIN + 28,  w: 105, val: "Passenger" },
        { x: MARGIN + 135, w: 52,  val: "Gender" },
        { x: MARGIN + 189, w: 52,  val: "Seat No." },
        { x: MARGIN + 243, w: 58,  val: "Berth Type" },
        { x: MARGIN + 303, w: 62,  val: "Coach" },
        { x: MARGIN + 367, w: 72,  val: "Status" },
        { x: MARGIN + 441, w: 80,  val: "Fare (INR)" },
    ];
    fillRect(doc, MARGIN, Y, PW, 20, "#DBEAFE");
    Y = tableRow(doc, Y, TC, true);

    const totalAmount = Number(booking.total_amount) || 0;
    const perHead     = passengers.length > 0 ? Math.round(totalAmount / passengers.length) : 0;

    passengers.forEach((p, i) => {
        Y = ensureSpace(doc, Y, 20);
        const seat   = p.seat || {};
        const gender = (p.passenger_gender || "").charAt(0).toUpperCase()
            + (p.passenger_gender || "").slice(1);
        Y = tableRow(doc, Y, TC.map((c, ci) => ({
            ...c,
            val: [
                i + 1,
                p.passenger_name,
                gender,
                seat.seat_number ?? "-",
                BERTH_LABELS[seat.berth_type] || seat.berth_type || "-",
                seat.coach?.coach_number || "-",
                (booking.booking_status || "-").toUpperCase(),
                `Rs. ${perHead}`,
            ][ci],
        })), false, i % 2 === 1);
    });

    Y += 8;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // SEAT LAYOUT
    const coachData     = firstSeat?.coach || null;
    const bookedSeatIds = new Set(passengers.map(p => p.seat_id));

    if (coachData && coachData.seats && coachData.seats.length > 0) {
        Y = ensureSpace(doc, Y, 200);
        Y = sectionHeader(doc, Y, `SEAT LOCATION IN COACH - ${coachNumber}`);
        Y += 10;
        syncCursor(doc, Y);
        Y = drawSeatLayout(doc, Y, coachData, bookedSeatIds);
        syncCursor(doc, Y);
        Y += 10;
        hRule(doc, MARGIN, Y, PW);
        Y += 12;
    }

    // PAYMENT DETAILS
    Y = ensureSpace(doc, Y, 130);
    Y = sectionHeader(doc, Y, "PAYMENT DETAILS");
    Y += 10;

    const baseFare    = Math.round(totalAmount / 1.05 / 1.18);
    const gst         = Math.round(totalAmount - baseFare * 1.05);
    const convenience = Math.round(baseFare * 0.05);
    const priceX      = MARGIN + PW - 130;

    for (const [label, value, bold] of [
        ["Base Ticket Fare",  `Rs. ${baseFare}`,    false],
        ["Convenience Fee",   `Rs. ${convenience}`, false],
        ["GST (18%)",         `Rs. ${gst}`,         false],
        ["Total Amount Paid", `Rs. ${totalAmount}`, true],
    ]) {
        if (bold) {
            fillRect(doc, MARGIN, Y - 2, PW, 20, C.lightGreen);
            doc.save()
                .fillColor(C.green).font("Helvetica-Bold").fontSize(10)
                .text(label, MARGIN + 10, Y + 2)
                .text(value, priceX, Y + 2, { width: 120, align: "right" })
                .restore();
        } else {
            doc.save()
                .fillColor(C.grey).font("Helvetica").fontSize(8.5)
                .text(label, MARGIN + 10, Y + 2)
                .fillColor(C.black)
                .text(value, priceX, Y + 2, { width: 120, align: "right" })
                .restore();
        }
        Y += 20;
    }

    Y += 4;
    const payStatusRes    = (booking.payment_status || "-").toUpperCase();
    const payStatusColRes = booking.payment_status === "paid" ? C.green : C.orange;
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(8)
        .text("Payment Status:", MARGIN + 10, Y)
        .fillColor(payStatusColRes).font("Helvetica-Bold")
        .text(payStatusRes, MARGIN + 108, Y)
        .restore();
    Y += 16;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // QR + SUMMARY
    const qrSize = 85;
    Y = ensureSpace(doc, Y, qrSize + 30);

    const qrBuf = await makeQR(JSON.stringify({
        pnr:   booking.booking_number,
        train: train.train_number,
        from:  booking.source_station,
        to:    booking.destination_station,
        date:  booking.travel_date,
        seats: passengers.map(p => p.seat?.seat_number).join(","),
        name:  booking.contact_name,
    }));

    const qrX = MARGIN + PW - qrSize;
    doc.image(qrBuf, qrX, Y, { width: qrSize, height: qrSize });
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(6)
        .text("Scan to verify ticket", qrX, Y + qrSize + 3, { width: qrSize, align: "center" })
        .restore();

    doc.save()
        .fillColor(C.navy).font("Helvetica-Bold").fontSize(10)
        .text(`PNR: ${booking.booking_number}`, MARGIN + 10, Y + 8);
    doc.fillColor(C.grey).font("Helvetica").fontSize(7.5)
        .text(`Train  : ${train.train_number} - ${train.train_name}`, MARGIN + 10, Y + 22)
        .text(`Route  : ${booking.source_station} to ${booking.destination_station}`, MARGIN + 10, Y + 34)
        .text(`Date   : ${travelDate}`, MARGIN + 10, Y + 46)
        .text(`Coach  : ${coachNumber}  |  Class: ${coachLabel}`, MARGIN + 10, Y + 58);
    doc.restore();

    Y = Math.max(Y + qrSize + 16, Y + 90);

    // FOOTER
    Y = ensureSpace(doc, Y, 52);
    fillRect(doc, 0, Y, PAGE_W, 52, C.lightGrey);
    hRule(doc, 0, Y, PAGE_W, C.border);
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(6.5)
        .text("NOTE: Train timings are subject to change. Please verify with official railway sources before travel.",
            MARGIN, Y + 9, { width: PW })
        .text("Support: support@railseat.in  |  This is a system-generated Electronic Reservation Slip from RailSeat.",
            MARGIN, Y + 21, { width: PW });
    doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(7)
        .text("RailSeat - Seat-Level Train Ticket Booking System  |  Powered by RailSeat",
            MARGIN, Y + 35, { width: PW, align: "center" });
    doc.restore();

    doc.end();
}
