# Seat Model & Berth Types - Fixed! ✅

## Problem Solved
```
Error: null value in column "berth_type" of relation "seats" violates not-null constraint
```

The seat generation was using incorrect field names that didn't match the database schema.

## Actual Seat Model Schema

### Required Fields
```javascript
{
    seat_id: INTEGER (auto-increment),
    seat_number: INTEGER,           // Seat number (1, 2, 3, ...)
    berth_type: ENUM,               // Type of berth (LB, MB, UB, SL, SU, WS, MS, AS)
    row_number: INTEGER,            // Row number (1, 2, 3, ...)
    is_side_berth: BOOLEAN,         // Is this a side berth? (default: false)
    column_index: INTEGER,          // Column position in row (0, 1, 2, ...)
    coach_id: INTEGER               // Foreign key to coaches table
}
```

### Berth Type ENUM Values

| Code | Full Name | Used In | Description |
|------|-----------|---------|-------------|
| **LB** | Lower Berth | SL, AC coaches | Lower sleeping berth |
| **MB** | Middle Berth | SL coaches | Middle sleeping berth |
| **UB** | Upper Berth | SL, AC coaches | Upper sleeping berth |
| **SL** | Side Lower | SL, AC coaches | Side lower berth |
| **SU** | Side Upper | SL, AC coaches | Side upper berth |
| **WS** | Window Seat | Chair cars | Window seat |
| **MS** | Middle Seat | Chair cars | Middle seat |
| **AS** | Aisle Seat | Chair cars | Aisle seat |

## Seat Layouts by Coach Type

### Sleeper (SL) - 8 seats per row

```
Row Layout:
┌─────────────────────────────────────────────┐
│ [1-LB] [2-MB] [3-UB]  │  [4-LB] [5-MB] [6-UB] │ [7-SL] [8-SU] │
│ Lower  Middle Upper   │  Lower  Middle Upper  │ Side   Side   │
│ (col0) (col0) (col0)  │  (col1) (col1) (col1) │ (col0) (col1) │
└─────────────────────────────────────────────┘
```

**Seat Mapping:**
- Seats 1, 4: Lower Berth (LB)
- Seats 2, 5: Middle Berth (MB)
- Seats 3, 6: Upper Berth (UB)
- Seat 7: Side Lower (SL)
- Seat 8: Side Upper (SU)

### AC (1A/2A/3A) - 6 seats per row

```
Row Layout:
┌────────────────────────────────────┐
│ [1-LB] [2-UB]  │  [3-LB] [4-UB] │ [5-SL] [6-SU] │
│ Lower  Upper   │  Lower  Upper  │ Side   Side   │
│ (col0) (col0)  │  (col1) (col1) │ (col0) (col1) │
└────────────────────────────────────┘
```

**Seat Mapping:**
- Seats 1, 3: Lower Berth (LB)
- Seats 2, 4: Upper Berth (UB)
- Seat 5: Side Lower (SL)
- Seat 6: Side Upper (SU)

### Chair Car (CC/2S) - 5 seats per row

```
Row Layout:
┌─────────────────────────────────────┐
│ [1-WS] [2-MS] [3-AS] [4-MS] [5-WS] │
│ Window Middle Aisle  Middle Window │
│ (col0) (col1) (col2) (col3) (col4) │
└─────────────────────────────────────┘
```

**Seat Mapping:**
- Seats 1, 5: Window Seat (WS)
- Seats 2, 4: Middle Seat (MS)
- Seat 3: Aisle Seat (AS)

## What Was Fixed

### Before (Incorrect)
```javascript
seats.push({
    seat_number: j.toString(),      // ❌ String (should be integer)
    seat_type: seatType,            // ❌ Wrong field name
    status: 'available',            // ❌ Field doesn't exist
    price: price,                   // ❌ Field doesn't exist
    coach_id: coach.coach_id,
    row_number: row,
    side: side,                     // ❌ Field doesn't exist
    position_index: position_index  // ❌ Wrong field name
});
```

### After (Correct)
```javascript
seats.push({
    seat_number: j,                 // ✅ Integer
    berth_type: berthType,          // ✅ Correct field name (LB, MB, UB, etc.)
    row_number: row,                // ✅ Correct
    is_side_berth: isSideBerth,     // ✅ Boolean flag
    column_index: columnIndex,      // ✅ Correct field name
    coach_id: coach.coach_id        // ✅ Correct
});
```

## Example: Creating a Sleeper Coach with 72 Seats

### Request
```json
POST /api/trains/1/coaches
{
  "coach_number": "S1",
  "coach_type": "SL",
  "capacity": 72
}
```

### Generated Seats (First 8 seats - Row 1)

| Seat # | Berth Type | Row | Column | Is Side | Description |
|--------|------------|-----|--------|---------|-------------|
| 1 | LB | 1 | 0 | false | Lower Berth, Left |
| 2 | MB | 1 | 0 | false | Middle Berth, Left |
| 3 | UB | 1 | 0 | false | Upper Berth, Left |
| 4 | LB | 1 | 1 | false | Lower Berth, Right |
| 5 | MB | 1 | 1 | false | Middle Berth, Right |
| 6 | UB | 1 | 1 | false | Upper Berth, Right |
| 7 | SL | 1 | 0 | true | Side Lower |
| 8 | SU | 1 | 1 | true | Side Upper |

This pattern repeats for 9 rows (72 ÷ 8 = 9 rows)

## Database Schema

```sql
CREATE TABLE seats (
    seat_id SERIAL PRIMARY KEY,
    seat_number INTEGER NOT NULL,
    berth_type VARCHAR(2) NOT NULL CHECK (berth_type IN ('LB', 'MB', 'UB', 'SL', 'SU', 'WS', 'MS', 'AS')),
    row_number INTEGER NOT NULL,
    is_side_berth BOOLEAN DEFAULT false,
    column_index INTEGER NOT NULL,
    coach_id INTEGER NOT NULL REFERENCES coaches(coach_id)
);
```

## Testing

### Test 1: Create Sleeper Coach
```bash
POST /api/trains/1/coaches
{
  "coach_number": "S1",
  "coach_type": "SL",
  "capacity": 72
}
```

**Expected:**
- ✅ Coach created
- ✅ 72 seats generated
- ✅ 9 rows (72 ÷ 8)
- ✅ Berth types: LB, MB, UB, SL, SU

### Test 2: Create AC Coach
```bash
POST /api/trains/1/coaches
{
  "coach_number": "A1",
  "coach_type": "2A",
  "capacity": 54
}
```

**Expected:**
- ✅ Coach created
- ✅ 54 seats generated
- ✅ 9 rows (54 ÷ 6)
- ✅ Berth types: LB, UB, SL, SU

### Test 3: Create Chair Car
```bash
POST /api/trains/1/coaches
{
  "coach_number": "CC1",
  "coach_type": "CC",
  "capacity": 78
}
```

**Expected:**
- ✅ Coach created
- ✅ 78 seats generated
- ✅ 16 rows (78 ÷ 5 = 15.6, rounded up)
- ✅ Berth types: WS, MS, AS

## Response Format

```json
{
  "coach_id": 1,
  "coach_number": "S1",
  "coach_type": "SL",
  "capacity": 72,
  "sequence_order": 1,
  "train_id": 1,
  "seats": [
    {
      "seat_id": 1,
      "seat_number": 1,
      "berth_type": "LB",
      "row_number": 1,
      "column_index": 0,
      "is_side_berth": false
    },
    {
      "seat_id": 2,
      "seat_number": 2,
      "berth_type": "MB",
      "row_number": 1,
      "column_index": 0,
      "is_side_berth": false
    }
    // ... 70 more seats
  ]
}
```

## Berth Type Reference

### For Sleeper (SL)
- **LB (Lower Berth)**: Most comfortable, easy access
- **MB (Middle Berth)**: Folds up during day, medium comfort
- **UB (Upper Berth)**: Least comfortable, used mainly for sleeping
- **SL (Side Lower)**: Side berth, lower position
- **SU (Side Upper)**: Side berth, upper position

### For AC (1A/2A/3A)
- **LB (Lower Berth)**: Lower sleeping berth
- **UB (Upper Berth)**: Upper sleeping berth
- **SL (Side Lower)**: Side lower berth
- **SU (Side Upper)**: Side upper berth

### For Chair Car (CC/2S)
- **WS (Window Seat)**: Seat by the window
- **MS (Middle Seat)**: Middle seat in row
- **AS (Aisle Seat)**: Seat by the aisle

## Frontend Integration

When displaying seats in the UI, you can use the berth type to:

1. **Show appropriate icons**
   - LB/MB/UB: Bed icons
   - WS/MS/AS: Chair icons
   - SL/SU: Side berth icons

2. **Group by row**
   - Use `row_number` to group seats
   - Use `column_index` to order within row

3. **Highlight side berths**
   - Use `is_side_berth` flag
   - Display differently in UI

4. **Apply pricing**
   - Lower berths typically cost more
   - Window seats preferred
   - Side berths may have different pricing

## Summary

✅ **Fixed Field Names**: `berth_type`, `column_index`, `is_side_berth`
✅ **Correct Data Types**: `seat_number` is INTEGER, not STRING
✅ **Removed Non-Existent Fields**: `status`, `price`, `side`, `seat_type`
✅ **Proper Berth Types**: LB, MB, UB, SL, SU, WS, MS, AS
✅ **Accurate Layouts**: 8/row for SL, 6/row for AC, 5/row for CC

Coach creation now works correctly with the actual database schema! 🎉
