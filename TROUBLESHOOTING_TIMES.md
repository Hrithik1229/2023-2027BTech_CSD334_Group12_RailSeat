# Troubleshooting: Times Not Stored in Database

## Issue
The `departure_time`, `arrival_time`, and `duration` fields are not being registered in the database when saving routes.

## Root Cause Analysis

The issue occurs because:
1. **TrainStop times** (arrival_time, departure_time) are stored in the `train_stops` table
2. **TrainRun times** (departure_time, arrival_time, duration) are stored in the `train_runs` table
3. The TrainRun times need to be **calculated from the stops** and explicitly updated

## Solution Implemented

### Backend Changes
Updated `admin.controller.js` to:
1. Extract `departure_time` from the **first stop**
2. Extract `arrival_time` from the **last stop**
3. Calculate `duration` from the time difference
4. Update the `train_runs` table with these values

### Code Flow
```javascript
// First stop's departure time → TrainRun.departure_time
const departureTime = stopsData[0].departure_time;

// Last stop's arrival time → TrainRun.arrival_time
const arrivalTime = stopsData[stopsData.length - 1].arrival_time;

// Calculate duration (e.g., "5h 30m")
const duration = calculateDuration(departureTime, arrivalTime);

// Update TrainRun
await TrainRun.update({
  departure_time: departureTime,
  arrival_time: arrivalTime,
  duration: duration
}, { where: { run_id: id } });
```

## Diagnostic Steps

### Step 1: Verify Database Schema
Run the schema verification script:
```bash
cd backend
node src/scripts/verifySchema.js
```

**Expected Output:**
```
✅ departure_time          - TIME
✅ arrival_time            - TIME
✅ duration                - VARCHAR(255)
```

**If Missing:**
- The database schema doesn't have these columns
- You need to sync the database or run migrations

### Step 2: Check Current Data
Run the route data checker:
```bash
node src/scripts/checkRouteData.js <run_id>
```

**Example:**
```bash
node src/scripts/checkRouteData.js 1
```

**Expected Output:**
```
📋 Train Run Details (ID: 1)
Departure Time: 06:00:00
Arrival Time: 09:00:00
Duration: 3h 0m

🛤️  Route Stops (3 stops)
Stop 1: Departure Time: 06:00
Stop 2: Arrival Time: 07:30, Departure Time: 07:35
Stop 3: Arrival Time: 09:00
```

**If Times are NULL:**
- The update logic isn't working
- Check server logs for errors

### Step 3: Test with Fresh Data
1. Open the route builder in the admin panel
2. Add a route with at least 2 stops
3. **Important:** Fill in these fields:
   - First stop: **Departure Time** (required)
   - Last stop: **Arrival Time** (required)
   - Middle stops: Both times (optional but recommended)
4. Click "Save Route"
5. Check the database using the script above

### Step 4: Check Server Logs
When you save a route, look for these log messages:

**Success:**
```
[updateRoute] - Calculated duration: 3h 0m (180 minutes)
[updateRoute] - Updating TrainRun 1:
  source_station_id: 1
  destination_station_id: 3
  departure_time: 06:00
  arrival_time: 09:00
  duration: 3h 0m
[updateRoute] - TrainRun 1 updated successfully. Rows affected: 1
```

**Failure:**
```
[updateRoute] - Transaction rolling back due to error: ...
```

## Common Issues & Fixes

### Issue 1: Times are NULL in train_runs table
**Cause:** First/last stop times not provided
**Fix:** 
- Ensure first stop has `departure_time`
- Ensure last stop has `arrival_time`

### Issue 2: Duration is NULL
**Cause:** Either departure_time or arrival_time is missing
**Fix:** Both times must be provided for duration calculation

### Issue 3: Times in train_stops are NULL
**Cause:** Frontend not sending the times
**Fix:** 
- Check that time inputs in RouteBuilder.tsx have values
- Check browser console for errors
- Verify the payload being sent to the API

### Issue 4: Database schema missing columns
**Cause:** Database not synced with models
**Fix:**
```bash
# Option 1: Sync database (CAUTION: May drop data)
# Only use in development
node -e "import('./src/config/db.js').then(m => m.default.sync({alter: true}))"

# Option 2: Manual migration
node src/migrations/add_status_to_train_runs.js
```

### Issue 5: Time format errors
**Cause:** Invalid time format sent from frontend
**Fix:** 
- Times must be in HH:MM or HH:MM:SS format
- Example: "09:30" or "09:30:00"
- NOT: "9:30am" or "9:30 AM"

## Verification Checklist

After implementing the fix, verify:

- [ ] Backend server restarted
- [ ] Database schema has all required columns
- [ ] Route builder UI shows time input fields
- [ ] First stop has departure time input
- [ ] Last stop has arrival time input
- [ ] Save button works without errors
- [ ] Server logs show successful update
- [ ] Database query shows times are stored
- [ ] TrainRun table has departure_time, arrival_time, duration
- [ ] TrainStop table has arrival_time, departure_time for each stop

## Testing Script

Use this SQL query to manually check the data:

```sql
-- Check TrainRun times
SELECT 
  run_id,
  train_id,
  direction,
  departure_time,
  arrival_time,
  duration
FROM train_runs
WHERE run_id = 1;

-- Check TrainStop times
SELECT 
  stop_id,
  run_id,
  station_id,
  stop_order,
  arrival_time,
  departure_time,
  halt_duration,
  distance_from_source
FROM train_stops
WHERE run_id = 1
ORDER BY stop_order;
```

## Quick Fix Commands

```bash
# 1. Verify schema
node src/scripts/verifySchema.js

# 2. Check existing data
node src/scripts/checkRouteData.js 1

# 3. Restart backend (if changes were made)
# Press Ctrl+C to stop, then:
npm run dev

# 4. Test the route builder
# Open browser → Admin Panel → Runs → Build Route
```

## Still Not Working?

If times are still not being stored:

1. **Check the payload** being sent from frontend:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Save a route
   - Check the request payload for `/admin/runs/:id/route`
   - Verify `arrival_time` and `departure_time` are present

2. **Check database directly**:
   ```bash
   # Connect to your database
   mysql -u root -p your_database
   # or
   psql -U postgres your_database
   
   # Run the SQL queries above
   ```

3. **Enable debug logging**:
   - Check `backend/src/controllers/admin.controller.js`
   - All console.log statements should show in server console
   - Look for the exact values being saved

4. **Check for database errors**:
   - Look for Sequelize errors in server logs
   - Check if TIME columns accept the format being sent
   - Some databases require 'HH:MM:SS' not 'HH:MM'

## Need More Help?

Provide these details:
1. Output from `verifySchema.js`
2. Output from `checkRouteData.js`
3. Server logs when saving a route
4. Network request payload from browser DevTools
5. Database type (MySQL, PostgreSQL, SQLite, etc.)
