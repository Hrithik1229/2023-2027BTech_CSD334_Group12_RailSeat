# Route Builder Data Storage Improvements

## Summary
Enhanced the route builder to ensure all data is correctly validated and stored in the database with comprehensive error handling and data integrity checks.

## Changes Made

### 1. Backend Controller (`admin.controller.js`)

#### Enhanced Validation
- **Run Existence Check**: Verify the train run exists before processing
- **Station Validation**: 
  - Check that `station_id` is a valid number
  - Verify each station exists in the database
- **Distance Validation**: Ensure `distance_from_source` is a non-negative number
- **Halt Duration Validation**: Ensure `halt_duration` is a non-negative integer
- **Time Format Validation**: Validate arrival/departure times match HH:MM or HH:MM:SS format
- **Logical Validation**:
  - First stop should have departure time
  - Last stop should have arrival time
  - Intermediate stops should have both times

#### Data Type Conversion
- Convert `run_id` to integer using `parseInt()`
- Convert `station_id` to integer using `parseInt()`
- Convert `halt_duration` to integer using `parseInt()`
- Convert `distance_from_source` to float using `parseFloat()`

#### Improved Error Handling
- Better error messages with specific stop numbers
- Stack traces in development mode
- Transaction rollback on any validation failure
- Detailed console logging for debugging

#### Response Enhancement
- Return created stops in the response
- Include row count for updates
- Better success/error messages

### 2. TrainRun Model (`trainRun.model.js`)

Added `status` field to track active/inactive runs:
```javascript
status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
}
```

### 3. Frontend Route Builder (`RouteBuilder.tsx`)

Added **Halt Duration** input field:
- New input field for specifying halt duration in minutes
- Proper validation and number handling
- Updated grid layout from 3 columns to 4 columns
- Consistent styling with other fields

### 4. Database Migration

Created migration script (`add_status_to_train_runs.js`) to:
- Add status column to existing databases
- Set all existing runs to 'active' status
- Check if column exists before adding (idempotent)

### 5. Test Script

Created comprehensive test script (`testRouteBuilder.js`) to:
- Test valid route data submission
- Verify data is correctly stored in database
- Validate data integrity
- Test validation rules (< 2 stops, invalid station IDs)
- Provide detailed test results

## Data Flow

1. **Frontend** → User fills in route details (stations, times, halt duration, distance)
2. **API Request** → PUT `/admin/runs/:id/route` with stops array
3. **Backend Validation** → Comprehensive validation of all fields
4. **Database Transaction** → 
   - Delete existing stops
   - Create new stops with validated data
   - Update run's source/destination stations
   - Commit transaction
5. **Response** → Success message with created stops

## Database Schema

### train_stops Table
```sql
- stop_id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- run_id (INTEGER, FOREIGN KEY → train_runs.run_id)
- station_id (INTEGER, FOREIGN KEY → stations.id)
- stop_order (INTEGER, NOT NULL)
- arrival_time (TIME, NULLABLE)
- departure_time (TIME, NULLABLE)
- halt_duration (INTEGER, minutes)
- distance_from_source (FLOAT, km)
```

### train_runs Table (Updated)
```sql
- run_id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- train_id (INTEGER, FOREIGN KEY)
- direction (ENUM: 'UP', 'DOWN')
- source_station_id (INTEGER, FOREIGN KEY)
- destination_station_id (INTEGER, FOREIGN KEY)
- departure_time (TIME)
- arrival_time (TIME)
- duration (STRING)
- days_of_run (STRING)
- status (ENUM: 'active', 'inactive') ← NEW
```

## How to Test

### 1. Run the Migration (if needed)
```bash
cd backend
node src/migrations/add_status_to_train_runs.js
```

### 2. Test the Route Builder
```bash
# Test with run_id 1
node src/scripts/testRouteBuilder.js 1

# Or specify a different run_id
node src/scripts/testRouteBuilder.js 5
```

### 3. Manual Testing
1. Start the backend server
2. Navigate to the admin panel
3. Go to Runs → Select a run → Build Route
4. Add at least 2 stations
5. Fill in arrival/departure times, halt duration, and distances
6. Click "Save Route"
7. Verify data is saved correctly

## Validation Rules

1. **Minimum Stops**: At least 2 stops required
2. **Station IDs**: Must be valid integers that exist in the database
3. **Times**: Must be in HH:MM or HH:MM:SS format
4. **Distance**: Must be a non-negative number
5. **Halt Duration**: Must be a non-negative integer
6. **First Stop**: Should have departure time
7. **Last Stop**: Should have arrival time
8. **Intermediate Stops**: Should have both arrival and departure times

## Error Messages

The system now provides specific error messages:
- "Route must have at least 2 stops."
- "Train run not found."
- "Invalid station_id at stop X. Must be a valid number."
- "Station with ID X not found at stop Y."
- "Invalid distance_from_source at stop X. Must be a non-negative number."
- "Invalid halt_duration at stop X. Must be a non-negative integer."
- "Invalid arrival_time format at stop X. Use HH:MM or HH:MM:SS."
- "Invalid departure_time format at stop X. Use HH:MM or HH:MM:SS."

## Benefits

1. **Data Integrity**: All data is validated before storage
2. **Better UX**: Clear error messages help users fix issues
3. **Debugging**: Comprehensive logging for troubleshooting
4. **Type Safety**: Proper type conversion prevents database errors
5. **Transaction Safety**: Rollback on any error ensures consistency
6. **Complete Data**: Halt duration field now available in UI
7. **Testability**: Automated tests verify functionality

## Future Improvements

1. Add time validation (arrival should be before departure for same stop)
2. Add distance validation (should increase monotonically)
3. Add automatic calculation of halt duration from arrival/departure times
4. Add bulk import from CSV/Excel
5. Add route templates for common routes
6. Add visualization of the route on a map
