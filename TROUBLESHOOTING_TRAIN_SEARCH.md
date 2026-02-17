# Troubleshooting: Train Search Not Working for Intermediate Stops

## Quick Diagnosis

Run this command to debug your train search:

```bash
cd backend
node src/scripts/debugTrainSearch.js "SourceStation" "DestinationStation"
```

**Example:**
```bash
node src/scripts/debugTrainSearch.js "Mumbai" "Ahmedabad"
```

This will show you:
- ✅ All stations in your database
- ✅ Which trains stop at each station
- ✅ Whether any trains connect the two stations
- ✅ Why the search might be failing

## Common Issues & Solutions

### Issue 1: No Stations in Database
**Symptom:** Script shows "No stations found in database"

**Solution:**
1. Add stations through the admin panel
2. Or run a seed script to populate stations

### Issue 2: No Train Stops Configured
**Symptom:** "No trains stop at [Station]"

**Solution:**
1. Go to Admin Panel → Runs
2. Select a train run
3. Click "Build Route"
4. Add the stations as stops with proper order

### Issue 3: Stops in Wrong Order
**Symptom:** "Source comes AFTER destination (wrong direction)"

**Solution:**
The train route has the destination before the source. You need to:
1. Check the route in Admin Panel
2. Verify the stop order is correct
3. Or search in the opposite direction

### Issue 4: Station Name Mismatch
**Symptom:** "Station not found"

**Solution:**
Station names must match exactly (case-insensitive). Check:
1. Run the debug script without arguments to see all station names
2. Use the exact name from the database
3. Or add the station if it doesn't exist

### Issue 5: No Route Data
**Symptom:** Trains exist but no stops are configured

**Solution:**
1. Go to Admin Panel → Runs
2. For each run, click "Build Route"
3. Add all intermediate stops in order
4. Set arrival/departure times
5. Save the route

## Step-by-Step Verification

### Step 1: Check Backend Logs
When you search for trains, check your backend console for these logs:

```
[searchTrains] Searching for trains from "Mumbai" to "Ahmedabad"
[searchTrains] Source station found: Mumbai (ID: 1)
[searchTrains] Destination station found: Ahmedabad (ID: 3)
[searchTrains] Found 2 stops at source station
[searchTrains] Found 2 stops at destination station
[searchTrains] Valid run found: run_id=1, stops 1 → 3
[searchTrains] Total valid runs found: 1
[searchTrains] Fetched 1 train runs from database
[searchTrains] Returning 1 results
```

**If you see:**
- `Source station found: NOT FOUND` → Station doesn't exist in database
- `Found 0 stops at source station` → No trains stop at that station
- `Total valid runs found: 0` → No trains connect these stations

### Step 2: Check Frontend Console
Open browser DevTools (F12) and look for:

```
Searching trains from Mumbai to Ahmedabad
Search results: [...]
```

**If you see:**
- `Search results: []` → Backend returned no results
- Network error → Backend not running or wrong API URL

### Step 3: Verify Database Data

Run this SQL query to check your data:

```sql
-- Check stations
SELECT id, name, code FROM stations ORDER BY name;

-- Check train stops
SELECT 
  ts.run_id,
  ts.station_id,
  s.name as station_name,
  ts.stop_order,
  ts.departure_time,
  ts.arrival_time
FROM train_stops ts
JOIN stations s ON ts.station_id = s.id
ORDER BY ts.run_id, ts.stop_order;
```

### Step 4: Test with Debug Script

```bash
# List all stations
node src/scripts/debugTrainSearch.js

# Test specific route
node src/scripts/debugTrainSearch.js "Station1" "Station2"
```

## Example: Setting Up a Route

Let's say you want trains to show up for "Surat → Ahmedabad":

### 1. Create Stations (if not exist)
- Mumbai
- Surat
- Vadodara
- Ahmedabad
- Delhi

### 2. Create a Train
- Name: "Gujarat Express"
- Number: "12345"

### 3. Create a Run
- Train: Gujarat Express
- Direction: UP
- Days: All days

### 4. Build the Route
Go to Admin → Runs → Select the run → Build Route

Add stops in order:
1. Mumbai (Departure: 06:00, Distance: 0 km)
2. Surat (Arrival: 10:00, Departure: 10:10, Distance: 280 km)
3. Vadodara (Arrival: 12:00, Departure: 12:10, Distance: 390 km)
4. Ahmedabad (Arrival: 14:00, Departure: 14:10, Distance: 490 km)
5. Delhi (Arrival: 22:00, Distance: 1400 km)

### 5. Test the Search
Now search for:
- Mumbai → Delhi ✅ Should work
- Surat → Ahmedabad ✅ Should work
- Vadodara → Mumbai ❌ Won't work (wrong direction)

## Still Not Working?

### Check These:

1. **Backend server is running**
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend is using correct API URL**
   - Check `src/lib/api.ts` or similar
   - Verify `API_BASE` points to your backend

3. **Database connection is working**
   - Check backend logs for database errors
   - Verify connection string in `.env`

4. **Route data is saved**
   - Use the debug script to verify
   - Check database directly

5. **Station names match exactly**
   - Case doesn't matter (case-insensitive search)
   - But spelling must be exact

## Get Detailed Logs

### Backend
The updated `searchTrains` function now logs everything:
- Station lookups
- Number of stops found
- Valid runs matched
- Results returned

Just watch your backend console when searching.

### Frontend
Check browser console for:
- API calls being made
- Responses received
- Any errors

## Quick Test

1. Run debug script to see all stations:
   ```bash
   node src/scripts/debugTrainSearch.js
   ```

2. Pick two stations from the list

3. Test search with those exact names:
   ```bash
   node src/scripts/debugTrainSearch.js "Station1" "Station2"
   ```

4. If it shows valid runs, the backend is working

5. If frontend still doesn't show results, check:
   - Browser console for errors
   - Network tab for API response
   - Frontend code for mapping issues

## Need More Help?

Provide these details:
1. Output from `debugTrainSearch.js`
2. Backend console logs when searching
3. Frontend console logs (browser DevTools)
4. Network tab showing the API request/response
5. Database type (MySQL, PostgreSQL, SQLite)
