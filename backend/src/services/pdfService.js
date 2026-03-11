import PDFDocument from "pdfkit";
import QRCode from "qrcode";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
    navy: "#0F2044",
    blue: "#1A56DB",
    lightBlue: "#EBF5FF",
    green: "#059669",
    lightGreen: "#ECFDF5",
    orange: "#D97706",
    lightOrange: "#FFFBEB",
    red: "#DC2626",
    lightRed: "#FEF2F2",
    grey: "#6B7280",
    lightGrey: "#F3F4F6",
    border: "#E5E7EB",
    white: "#FFFFFF",
    black: "#111827",
    seatBooked: "#059669",
    seatAvail: "#D1D5DB",
};

const PAGE_W = 595;            // A4 width  (pt)
const PAGE_H = 841;            // A4 height (pt)
const MARGIN = 36;
const PW = PAGE_W - MARGIN * 2;
const SAFE_Y = PAGE_H - 60;   // bottom threshold before adding a new page

// ── Berth / Coach labels ──────────────────────────────────────────────────────
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

// ── QR code buffer ────────────────────────────────────────────────────────────
async function makeQR(data) {
    return QRCode.toBuffer(data, {
        errorCorrectionLevel: "M", type: "png", margin: 1,
        color: { dark: "#0F2044", light: "#FFFFFF" }, width: 200,
    });
}

// ── Format TIME string "HH:MM:SS" -> "HH:MM" ─────────────────────────────────
function formatTime(t) {
    if (!t) return null;
    // TIME columns come back as "HH:MM:SS" or already "HH:MM"
    const parts = String(t).split(":");
    if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return String(t);
}

// ── Low-level drawing helpers ─────────────────────────────────────────────────
function fillRect(doc, x, y, w, h, col) {
    doc.save().rect(x, y, w, h).fill(col).restore();
}
function hRule(doc, x, y, w, col = C.border) {
    doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(0.5).strokeColor(col).stroke().restore();
}

/**
 * Sync PDFKit's internal cursor to our Y tracker so it doesn't
 * trigger auto-pagination in the wrong place.
 */
function syncCursor(doc, y) {
    doc.text("", MARGIN, y, { lineBreak: false });
}

/**
 * Add a new page if Y is too close to the bottom.
 * Returns the new Y (reset to top margin on new page, unchanged otherwise).
 */
function ensureSpace(doc, y, needed = 80) {
    if (y + needed > SAFE_Y) {
        doc.addPage();
        syncCursor(doc, MARGIN);
        return MARGIN;
    }
    return y;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function statusBadge(doc, x, y, status) {
    const map = {
        confirmed: { bg: C.lightGreen, fg: C.green, label: "CONFIRMED" },
        paid: { bg: C.lightGreen, fg: C.green, label: "CONFIRMED" },
        pending: { bg: C.lightOrange, fg: C.orange, label: "PENDING" },
        failed: { bg: C.lightRed, fg: C.red, label: "FAILED" },
        cancelled: { bg: C.lightRed, fg: C.red, label: "CANCELLED" },
    };
    const s = map[(status || "pending").toLowerCase()] || map.pending;
    const pad = 12; const h = 22;
    doc.fontSize(9).font("Helvetica-Bold");
    const bw = doc.widthOfString(s.label) + pad * 2;
    doc.save()
        .roundedRect(x - bw, y, bw, h, 4).fill(s.bg)
        .fillColor(s.fg).text(s.label, x - bw, y + 6, { width: bw, align: "center" })
        .restore();
}

// ── Section header ────────────────────────────────────────────────────────────
function sectionHeader(doc, y, title) {
    fillRect(doc, MARGIN, y, PW, 22, C.navy);
    doc.save()
        .fillColor(C.white).font("Helvetica-Bold").fontSize(9)
        .text(title, MARGIN + 10, y + 6, { width: PW - 20 })
        .restore();
    return y + 22;
}

// ── Two-line info cell ────────────────────────────────────────────────────────
function infoCell(doc, x, y, label, value, w = 100) {
    doc.save()
        .font("Helvetica").fontSize(7).fillColor(C.grey)
        .text(label.toUpperCase(), x, y, { width: w });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.black)
        .text(value || "-", x, y + 10, { width: w });
    doc.restore();
}

// ── Table row ─────────────────────────────────────────────────────────────────
function tableRow(doc, y, cols, isHeader = false, isAlt = false) {
    const rowH = isHeader ? 20 : 17;
    if (isAlt) {
        const totalW = cols[cols.length - 1].x + cols[cols.length - 1].w - cols[0].x;
        fillRect(doc, cols[0].x, y, totalW, rowH, C.lightGrey);
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

// ── Seat grid ─────────────────────────────────────────────────────────────────
// Returns the Y coordinate immediately after the grid + legend.
// IMPORTANT: uses ONLY fillRect / direct rectangle + text calls so no
// PDFKit auto-pagination fires mid-grid.
function drawSeatLayout(doc, startY, coachData, bookedSeatIds) {
    // Small fixed cell so the whole grid stays compact
    const CELL = 16;
    const GAP  = 2;
    const x    = MARGIN + 10;

    // Filter out the GEN sentinel seat (seat_number 0) — it has no physical berth
    const seats = [...(coachData.seats || [])]
        .filter(s => s.seat_number > 0)
        .sort((a, b) => a.seat_number - b.seat_number);

    if (seats.length === 0) return startY;

    const coachType = coachData.coach_type;
    let colsPerRow = 6;
    if (["1A", "2A"].includes(coachType))               colsPerRow = 4;
    else if (["CC", "EC", "EA", "2S"].includes(coachType)) colsPerRow = 5;

    const cols    = Math.min(colsPerRow, seats.length);
    const maxRows = 8;   // cap grid height regardless of coach size
    const display = seats.slice(0, cols * maxRows);

    let row = 0, col = 0;
    let Y = startY;

    for (const seat of display) {
        const sx     = x + col * (CELL + GAP);
        const sy     = Y + row * (CELL + GAP);
        const booked = bookedSeatIds.has(seat.seat_id);
        const fill   = booked ? C.seatBooked : C.seatAvail;
        const textCol = booked ? C.white : "#4B5563";

        doc.save().roundedRect(sx, sy, CELL, CELL, 2).fill(fill).restore();

        doc.save()
            .fillColor(textCol).font("Helvetica-Bold").fontSize(5.5)
            .text(String(seat.seat_number), sx, sy + 3, { width: CELL, align: "center" })
            .restore();

        doc.save()
            .fillColor(textCol).font("Helvetica").fontSize(4.5)
            .text(BERTH_LABELS[seat.berth_type] || seat.berth_type, sx, sy + 10, { width: CELL, align: "center" })
            .restore();

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
        doc.save()
            .fillColor(C.grey).font("Helvetica").fontSize(6.5)
            .text(item.label, lx + 12, legendY + 1, { width: 80 })
            .restore();
        lx += 95;
    }

    if (display.length < seats.length) {
        doc.save()
            .fillColor(C.grey).font("Helvetica").fontSize(6.5)
            .text(
                `Showing ${display.length} of ${seats.length} seats`,
                lx + 10, legendY + 1, { width: 120 }
            )
            .restore();
    }

    return legendY + 16;
}



// =============================================================================

//  Main: generate ticket PDF and stream to HTTP response
// =============================================================================
export async function generateTicketPDF(booking, res) {
    const doc = new PDFDocument({
        size: "A4", margin: 0,
        info: {
            Title: `RailSeat Ticket - PNR ${booking.booking_number}`,
            Author: "RailSeat", Subject: "Electronic Reservation Slip"
        }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
        `attachment; filename="RailSeat_${booking.booking_number}.pdf"`);
    doc.pipe(res);

    let Y = 0;

    // ── HEADER ──────────────────────────────────────────────────────────────
    fillRect(doc, 0, 0, PAGE_W, 66, C.navy);
    doc.save()
        .fillColor(C.white).font("Helvetica-Bold").fontSize(22).text("RailSeat", MARGIN, 15);
    doc.fillColor("#93C5FD").font("Helvetica").fontSize(8.5)
        .text("Electronic Reservation Slip  |  Seat-Level Train Booking", MARGIN, 41);
    doc.restore();
    fillRect(doc, 0, 66, PAGE_W, 4, C.blue);
    statusBadge(doc, PAGE_W - MARGIN, 16, booking.payment_status || booking.booking_status);
    Y = 82;

    // ── PNR BAR ─────────────────────────────────────────────────────────────
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

    // ── JOURNEY INFO ─────────────────────────────────────────────────────────
    Y = sectionHeader(doc, Y, "JOURNEY INFORMATION");
    Y += 10;

    const train = booking.train || {};
    const passengers = booking.passengers || [];
    const firstSeat = passengers[0]?.seat;
    const coachNumber = firstSeat?.coach?.coach_number || "-";
    const coachType = firstSeat?.coach?.coach_type || "-";
    const coachLabel = COACH_LABELS[coachType] || coachType;
    // Detect General (unreserved) booking — sentinel seat has seat_number 0
    const isGenBooking = coachType === "GEN" || firstSeat?.seat_number === 0;

    // From / To
    const fromX = MARGIN + 10, arrowX = MARGIN + 158, toX = MARGIN + 220;

    const deptTime = formatTime(booking.departureTime);
    const arrvTime = formatTime(booking.arrivalTime);
    const hasTime = !!(deptTime || arrvTime);

    // Source station
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("BOARDING STATION", fromX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(16)
        .text(booking.source_station || "-", fromX, Y + 10);
    if (deptTime) {
        doc.fillColor(C.blue).font("Helvetica-Bold").fontSize(9)
            .text(`Dep: ${deptTime}`, fromX, Y + 29);
    }
    doc.restore();

    // Arrow — vertically centred on the station name
    const arrowMidY = Y + (hasTime ? 23 : 20);
    doc.save()
        .moveTo(arrowX, arrowMidY).lineTo(arrowX + 36, arrowMidY)
        .lineWidth(2).strokeColor(C.blue).stroke()
        .polygon([arrowX + 36, arrowMidY - 5], [arrowX + 48, arrowMidY], [arrowX + 36, arrowMidY + 5])
        .fill(C.blue).restore();

    // Destination station
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(7)
        .text("DESTINATION STATION", toX, Y);
    doc.fillColor(C.black).font("Helvetica-Bold").fontSize(16)
        .text(booking.destination_station || "-", toX, Y + 10);
    if (arrvTime) {
        doc.fillColor(C.green).font("Helvetica-Bold").fontSize(9)
            .text(`Arr: ${arrvTime}`, toX, Y + 29);
    }
    doc.restore();

    Y += hasTime ? 50 : 38;
    hRule(doc, MARGIN, Y, PW);
    Y += 8;

    // Info cells
    const travelDate = new Date(booking.travel_date).toLocaleDateString("en-IN",
        { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
    const cellW = (PW - 20) / 5;
    [
        { label: "Travel Date", value: travelDate },
        { label: "Train No.", value: train.train_number || "-" },
        { label: "Train Name", value: train.train_name || "-" },
        { label: "Coach", value: coachNumber },
        { label: "Class", value: coachLabel },
    ].forEach((c, i) =>
        infoCell(doc, MARGIN + 10 + i * cellW, Y, c.label, c.value, cellW - 8)
    );
    Y += 36;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // ── PASSENGER TABLE ──────────────────────────────────────────────────────
    Y = ensureSpace(doc, Y, 70);
    Y = sectionHeader(doc, Y, "PASSENGER DETAILS");
    Y += 6;

    const TC = [
        { x: MARGIN + 4, w: 22, val: "#" },
        { x: MARGIN + 28, w: 105, val: "Passenger" },
        { x: MARGIN + 135, w: 52, val: "Gender" },
        { x: MARGIN + 189, w: 52, val: "Seat No." },
        { x: MARGIN + 243, w: 58, val: "Berth Type" },
        { x: MARGIN + 303, w: 62, val: "Coach" },
        { x: MARGIN + 367, w: 72, val: "Status" },
        { x: MARGIN + 441, w: 80, val: "Fare (INR)" },
    ];

    fillRect(doc, MARGIN, Y, PW, 20, "#DBEAFE");
    Y = tableRow(doc, Y, TC, true);

    const totalAmount = Number(booking.total_amount) || 0;
    const perHead = passengers.length > 0 ? Math.round(totalAmount / passengers.length) : 0;

    passengers.forEach((p, i) => {
        Y = ensureSpace(doc, Y, 20);
        const seat = p.seat || {};
        const gender = (p.passenger_gender || "").charAt(0).toUpperCase()
            + (p.passenger_gender || "").slice(1);
        // GEN passengers have no assigned seat — display "Unreserved"
        const displaySeatNum = isGenBooking ? "Unreserved" : (seat.seat_number ?? "-");
        const displayBerth = isGenBooking ? "General" : (BERTH_LABELS[seat.berth_type] || seat.berth_type || "-");
        const displayCoach = isGenBooking ? (seat.coach?.coach_number || "-") : (seat.coach?.coach_number || "-");
        Y = tableRow(doc, Y, TC.map((c, ci) => ({
            ...c,
            val: [
                i + 1,
                p.passenger_name,
                gender,
                displaySeatNum,
                displayBerth,
                displayCoach,
                (booking.booking_status || "-").toUpperCase(),
                `Rs. ${perHead}`,
            ][ci],
        })), false, i % 2 === 1);
    });

    Y += 8;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // ── SEAT LAYOUT ──────────────────────────────────────────────────────────
    // Skipped for General (Unreserved) coach — no assigned seats exist.
    const coachData = firstSeat?.coach || null;
    const bookedSeatIds = new Set(passengers.map(p => p.seat_id));

    if (!isGenBooking && coachData && coachData.seats && coachData.seats.length > 0) {
        // Estimate grid height: 8 rows max * (16+2) = 144 + legend 22 + margin 24 = ~190
        Y = ensureSpace(doc, Y, 200);
        Y = sectionHeader(doc, Y, `SEAT LOCATION IN COACH - ${coachNumber}`);
        Y += 10;
        syncCursor(doc, Y);             // keep PDFKit cursor in sync before grid
        Y = drawSeatLayout(doc, Y, coachData, bookedSeatIds);
        syncCursor(doc, Y);             // sync after grid
        Y += 10;
        hRule(doc, MARGIN, Y, PW);
        Y += 12;
    } else if (isGenBooking) {
        // For GEN tickets: show a brief unreserved notice instead of a seat grid
        Y = ensureSpace(doc, Y, 60);
        fillRect(doc, MARGIN, Y, PW, 46, "#FFFBEB");
        doc.save()
            .fillColor("#92400E").font("Helvetica-Bold").fontSize(9)
            .text("GENERAL / UNRESERVED COMPARTMENT", MARGIN + 10, Y + 8, { width: PW - 20 });
        doc.fillColor("#78350F").font("Helvetica").fontSize(7.5)
            .text(
                "No specific seat is assigned for this ticket. You may board any General (GEN) coach on this train. "
                + "Seating is on a first-come, first-served basis.",
                MARGIN + 10, Y + 22, { width: PW - 20 }
            );
        doc.restore();
        Y += 58;
        hRule(doc, MARGIN, Y, PW);
        Y += 12;
    }

    // ── PAYMENT DETAILS ──────────────────────────────────────────────────────
    // Estimate: section header 22 + 4 rows * 20 + status 16 + spacing = ~120
    Y = ensureSpace(doc, Y, 130);
    Y = sectionHeader(doc, Y, "PAYMENT DETAILS");
    Y += 10;

    const baseFare = Math.round(totalAmount / 1.05 / 1.18);
    const gst = Math.round(totalAmount - baseFare * 1.05);
    const convenience = Math.round(baseFare * 0.05);

    const priceX = MARGIN + PW - 130;

    for (const [label, value, bold] of [
        ["Base Ticket Fare", `Rs. ${baseFare}`, false],
        ["Convenience Fee", `Rs. ${convenience}`, false],
        ["GST (18%)", `Rs. ${gst}`, false],
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
    const payStatus = (booking.payment_status || "-").toUpperCase();
    const payStatusCol = booking.payment_status === "paid" ? C.green : C.orange;
    doc.save()
        .fillColor(C.grey).font("Helvetica").fontSize(8)
        .text("Payment Status:", MARGIN + 10, Y)
        .fillColor(payStatusCol).font("Helvetica-Bold")
        .text(payStatus, MARGIN + 108, Y)
        .restore();
    Y += 16;
    hRule(doc, MARGIN, Y, PW);
    Y += 12;

    // ── QR CODE + SUMMARY ─────────────────────────────────────────────────────
    const qrSize = 85;
    Y = ensureSpace(doc, Y, qrSize + 30);

    const qrBuf = await makeQR(JSON.stringify({
        pnr: booking.booking_number,
        train: train.train_number,
        from: booking.source_station,
        to: booking.destination_station,
        date: booking.travel_date,
        seats: isGenBooking ? "Unreserved" : passengers.map(p => p.seat?.seat_number).join(","),
        name: booking.contact_name,
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
        .text(
            isGenBooking
                ? `Coach  : ${coachNumber}  |  Class: ${coachLabel}  |  Seat: Unreserved`
                : `Coach  : ${coachNumber}  |  Class: ${coachLabel}`,
            MARGIN + 10, Y + 58
        );
    doc.restore();

    Y = Math.max(Y + qrSize + 16, Y + 90);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    // Always place footer at the bottom of the LAST page content
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
