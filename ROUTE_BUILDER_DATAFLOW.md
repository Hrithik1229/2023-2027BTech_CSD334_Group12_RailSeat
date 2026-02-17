# Route Builder Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                     RouteBuilder.tsx                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User Input Fields:                                                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│  │ Arrival Time │ Departure    │ Halt (min)   │ Distance (km)│     │
│  │   (HH:MM)    │   (HH:MM)    │   (number)   │   (number)   │     │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                                                       │
│  Data Preparation:                                                   │
│  • Convert halt_duration to Number                                   │
│  • Convert distance_from_source to Number                            │
│  • Keep times as strings (HH:MM format)                              │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ PUT /admin/runs/:id/route
                            │ Content-Type: application/json
                            │
                            │ {
                            │   "stops": [
                            │     {
                            │       "station_id": 1,
                            │       "arrival_time": null,
                            │       "departure_time": "06:00",
                            │       "halt_duration": 0,
                            │       "distance_from_source": 0
                            │     },
                            │     ...
                            │   ]
                            │ }
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                            │
│                   admin.controller.js                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  STEP 1: Basic Validation                                            │
│  ✓ Check stops array exists                                          │
│  ✓ Check at least 2 stops                                            │
│  ✓ Check run_id exists in database                                   │
│                                                                       │
│  STEP 2: Detailed Validation (for each stop)                         │
│  ✓ station_id is valid number                                        │
│  ✓ station exists in database                                        │
│  ✓ distance_from_source >= 0                                         │
│  ✓ halt_duration >= 0                                                │
│  ✓ arrival_time matches HH:MM format                                 │
│  ✓ departure_time matches HH:MM format                               │
│                                                                       │
│  STEP 3: Type Conversion                                             │
│  • parseInt(run_id)                                                  │
│  • parseInt(station_id)                                              │
│  • parseInt(halt_duration)                                           │
│  • parseFloat(distance_from_source)                                  │
│                                                                       │
│  STEP 4: Database Transaction                                        │
│  ┌─────────────────────────────────────────┐                        │
│  │ BEGIN TRANSACTION                       │                        │
│  │                                         │                        │
│  │ 1. DELETE existing stops                │                        │
│  │    WHERE run_id = :id                   │                        │
│  │                                         │                        │
│  │ 2. INSERT new stops (bulkCreate)        │                        │
│  │    - stop_order = index + 1             │                        │
│  │    - All validated data                 │                        │
│  │                                         │                        │
│  │ 3. UPDATE train_runs                    │                        │
│  │    SET source_station_id = first_stop   │                        │
│  │        destination_station_id = last    │                        │
│  │    WHERE run_id = :id                   │                        │
│  │                                         │                        │
│  │ COMMIT TRANSACTION                      │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                       │
│  If ANY error occurs → ROLLBACK transaction                          │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE (MySQL/PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Table: train_stops                                                  │
│  ┌────────┬────────┬────────────┬───────────┬──────────┬─────────┐ │
│  │stop_id │ run_id │ station_id │stop_order │arrival   │departure│ │
│  ├────────┼────────┼────────────┼───────────┼──────────┼─────────┤ │
│  │   1    │   1    │     1      │     1     │   NULL   │  06:00  │ │
│  │   2    │   1    │     2      │     2     │  07:30   │  07:35  │ │
│  │   3    │   1    │     3      │     3     │  09:00   │  NULL   │ │
│  └────────┴────────┴────────────┴───────────┴──────────┴─────────┘ │
│                                                                       │
│  Additional Columns:                                                 │
│  • halt_duration (INTEGER) - minutes                                 │
│  • distance_from_source (FLOAT) - kilometers                         │
│                                                                       │
│  Table: train_runs                                                   │
│  ┌────────┬──────────┬───────────────────┬──────────────────────┐  │
│  │ run_id │ train_id │ source_station_id │ destination_station  │  │
│  ├────────┼──────────┼───────────────────┼──────────────────────┤  │
│  │   1    │    1     │         1         │          3           │  │
│  └────────┴──────────┴───────────────────┴──────────────────────┘  │
│                                                                       │
│  • source_station_id = first stop's station_id                       │
│  • destination_station_id = last stop's station_id                   │
│  • status = 'active' (NEW FIELD)                                     │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Success Response
                            │
                            │ {
                            │   "message": "Route updated successfully",
                            │   "count": 3,
                            │   "stops": [...]
                            │ }
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  • Display success toast                                             │
│  • Navigate back to runs list                                        │
│  • User can verify saved data                                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘


ERROR HANDLING FLOW
═══════════════════

If validation fails at ANY step:
┌─────────────────────────────────────────────────────────────────────┐
│  Backend:                                                            │
│  1. ROLLBACK transaction                                             │
│  2. Return 400/404/500 status code                                   │
│  3. Return error message:                                            │
│     {                                                                │
│       "error": "Invalid station_id at stop 2. Must be valid number." │
│     }                                                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend:                                                           │
│  1. Display error toast with message                                 │
│  2. Keep user on route builder page                                  │
│  3. User can fix the error and retry                                 │
└─────────────────────────────────────────────────────────────────────┘


DATA TYPE MAPPING
═════════════════

Frontend → Backend → Database
─────────────────────────────
station_id (number) → parseInt() → INTEGER
arrival_time (string "HH:MM") → string → TIME
departure_time (string "HH:MM") → string → TIME
halt_duration (number) → parseInt() → INTEGER
distance_from_source (number) → parseFloat() → FLOAT
stop_order (calculated) → index + 1 → INTEGER
```
