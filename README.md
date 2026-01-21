# RailSeat - Train Seat Booking System

A modern, full-stack train ticket booking application with interactive seat selection, real-time availability, and a beautiful user interface.

![RailSeat Logo](/public/logo%20(2).png)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

RailSeat is a comprehensive train booking platform that allows users to:
- Search for available trains between stations
- Select intermediate boarding and dropping points
- View interactive coach layouts with real-time seat availability
- Book multiple seats (up to 6 per transaction)
- Enter passenger details and complete reservations

The application features a modern, responsive UI built with React and a robust Node.js/Express backend with PostgreSQL database.

---

## Features

### Core Features
- **Train Search**: Browse available trains between source and destination stations
- **Intermediate Stops**: Select custom boarding and dropping points along the train route
- **Visual Seat Selection**: Interactive coach layouts showing real-time seat availability
- **Multiple Coach Types**: Support for Sleeper, AC 2-Tier, and Chair Car configurations
- **Passenger Management**: Add details for multiple passengers per booking
- **Booking Confirmation**: Instant PNR generation with booking summary

### User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Real-time Feedback**: Toast notifications for booking actions
- **Date-based Availability**: Seats availability calculated dynamically per travel date

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool & Dev Server |
| React Router v6 | Client-side Routing |
| TanStack Query | Server State Management |
| Tailwind CSS | Styling |
| shadcn/ui | UI Component Library |
| Framer Motion | Animations |
| Lucide React | Icons |
| date-fns | Date Formatting |
| Zod | Schema Validation |
| React Hook Form | Form Management |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime Environment |
| Express 5 | Web Framework |
| Sequelize | ORM |
| PostgreSQL | Database |
| CORS | Cross-Origin Resource Sharing |
| dotenv | Environment Variables |
| Socket.io | Real-time Communication (Optional) |

---

## Project Structure

```
Train Booking System/
└── seat-master/
    ├── backend/                    # Backend API Server
    │   ├── src/
    │   │   ├── app.js             # Express app configuration
    │   │   ├── server.js          # Server entry point
    │   │   ├── config/
    │   │   │   ├── db.js          # Database connection
    │   │   │   └── initDb.js      # Database initialization
    │   │   ├── controllers/       # Route handlers
    │   │   │   ├── booking.controller.js
    │   │   │   ├── seat.controller.js
    │   │   │   ├── train.controller.js
    │   │   │   └── user.controller.js
    │   │   ├── models/            # Sequelize models
    │   │   │   ├── booking.model.js
    │   │   │   ├── coach.model.js
    │   │   │   ├── passenger.model.js
    │   │   │   ├── seat.model.js
    │   │   │   ├── station.model.js
    │   │   │   ├── train.model.js
    │   │   │   ├── trainStop.model.js
    │   │   │   └── index.js
    │   │   ├── routes/            # API routes
    │   │   │   ├── booking.routes.js
    │   │   │   ├── seat.routes.js
    │   │   │   ├── train.routes.js
    │   │   │   └── user.routes.js
    │   │   └── scripts/           # Utility scripts
    │   │       ├── seed.js        # Database seeding
    │   │       ├── resetSeatStatus.js
    │   │       └── check_data.js
    │   └── package.json
    │
    ├── src/                        # Frontend React App
    │   ├── main.tsx               # App entry point
    │   ├── App.tsx                # Root component with routing
    │   ├── index.css              # Global styles
    │   ├── pages/                 # Page components
    │   │   ├── Index.tsx          # Landing page
    │   │   ├── TrainSelection.tsx # Train search & selection
    │   │   ├── SeatBooking.tsx    # Seat selection & booking
    │   │   └── NotFound.tsx       # 404 page
    │   ├── components/            # Reusable components
    │   │   ├── BookingSummary.tsx
    │   │   ├── CoachSelector.tsx
    │   │   ├── PassengerForm.tsx
    │   │   ├── Seat.tsx
    │   │   ├── SeatLegend.tsx
    │   │   ├── SeatMap.tsx
    │   │   └── ui/                # shadcn/ui components
    │   ├── data/
    │   │   └── coachLayouts.ts    # Coach layout type definitions
    │   ├── hooks/                 # Custom React hooks
    │   └── lib/
    │       └── utils.ts           # Utility functions
    │
    ├── public/                     # Static assets
    ├── package.json               # Frontend dependencies
    ├── vite.config.ts             # Vite configuration
    ├── tailwind.config.ts         # Tailwind configuration
    └── tsconfig.json              # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher (or yarn/pnpm)
- **PostgreSQL** v14.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AlenSony/seat-master.git
   cd seat-master
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Database Setup

1. **Create PostgreSQL Database**
   ```sql
   CREATE DATABASE train_booking;
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   # Database Configuration
   DB_NAME=train_booking
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. **Initialize Database**
   
   The database tables will be automatically created when you start the backend server. To seed initial data:
   ```bash
   cd backend
   node src/scripts/seed.js
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The API will be available at `http://localhost:3000`

2. **Start the Frontend Development Server** (in a new terminal)
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

---

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Trains

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trains` | Get all trains with coaches |
| GET | `/trains/:id` | Get train by ID with full details |
| GET | `/trains/:id/stops` | Get intermediate stops for a train |
| GET | `/trains/search` | Search trains by route |
| POST | `/trains` | Create a new train |

**Example Response - GET /trains**
```json
[
  {
    "train_id": 1,
    "train_number": "12301",
    "train_name": "Rajdhani Express",
    "source_station": "New Delhi",
    "destination_station": "Mumbai Central",
    "departure_time": "16:55:00",
    "arrival_time": "10:00:00",
    "duration": "17h 5m",
    "status": "active",
    "coaches": [
      {
        "coach_id": 1,
        "coach_number": "A1",
        "coach_type": "ac",
        "total_seats": 48
      }
    ]
  }
]
```

#### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings` | Create a new booking |
| GET | `/bookings/:id` | Get booking by ID |
| GET | `/bookings/search?email=` | Get bookings by email |
| PUT | `/bookings/:id/status` | Update booking status |
| PUT | `/bookings/:id/cancel` | Cancel a booking |

**Example Request - POST /bookings**
```json
{
  "contactName": "John Doe",
  "email": "john@example.com",
  "trainId": 1,
  "sourceStation": "New Delhi",
  "destinationStation": "Mumbai Central",
  "travelDate": "2025-02-15",
  "seats": [
    { "seatId": 1 },
    { "seatId": 2 }
  ],
  "passengers": [
    { "name": "John Doe", "gender": "male" },
    { "name": "Jane Doe", "gender": "female" }
  ]
}
```

**Example Response**
```json
{
  "booking_id": 1,
  "booking_number": "BK17058234561234",
  "contact_name": "John Doe",
  "email": "john@example.com",
  "train_id": 1,
  "source_station": "New Delhi",
  "destination_station": "Mumbai Central",
  "travel_date": "2025-02-15",
  "total_amount": "2900.00",
  "booking_status": "pending",
  "payment_status": "pending"
}
```

#### Seats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/seats/coach/:coachId` | Get seats by coach |
| GET | `/seats/available/:coachId` | Get available seats for a date |

---

## Frontend Architecture

### Pages

1. **Index (Landing Page)**
   - Hero section with call-to-action
   - Features showcase
   - How it works section
   - Navigation to booking flow

2. **TrainSelection**
   - Source/destination station selection
   - Date picker for travel date
   - Train listing with details (duration, timings, amenities)
   - Intermediate stop selection for boarding/dropping points

3. **SeatBooking**
   - Coach selector (tabs for different coaches)
   - Interactive seat map with different layouts:
     - **Sleeper**: 8 berths per compartment (6 main + 2 side)
     - **AC 2-Tier**: 6 berths per compartment (4 main + 2 side)
     - **Chair Car**: 5 seats per row (3+2 configuration)
   - Real-time seat selection with visual feedback
   - Booking summary sidebar
   - Passenger details form

### Component Hierarchy

```
App
├── Index (Landing)
├── TrainSelection
│   ├── Station Selectors
│   ├── Date Picker
│   └── Train Cards
└── SeatBooking
    ├── CoachSelector
    ├── SeatMap
    │   ├── SeatLegend
    │   └── Seat (individual)
    ├── BookingSummary
    └── PassengerForm
```

### State Management
- **React Query**: Server state (trains, bookings)
- **React useState**: Local UI state (selections, form data)
- **React Router**: Navigation state (route params)

---

## Backend Architecture

### Models & Relationships

```
Train (1) ─────────< Coach (many)
  │                    │
  │                    └────────< Seat (many)
  │
  └────────< TrainStop (many) >───────── Station
  │
  └────────< Booking (many)
                │
                └────────< Passenger (many) >───── Seat
```

### Controller Pattern

Each controller handles business logic for its domain:

- **train.controller.js**: Train CRUD, search, stops
- **booking.controller.js**: Booking creation, status updates, cancellation
- **seat.controller.js**: Seat availability queries
- **user.controller.js**: User management (optional)

### Booking Flow

1. User selects train and date
2. Frontend fetches train with coaches and seats
3. User selects seats (up to 6)
4. User enters passenger details
5. POST to `/api/bookings` creates:
   - Booking record with unique PNR
   - Passenger records linked to seats
6. Seats availability is calculated dynamically per date

---

## Database Schema

### Tables

#### trains
| Column | Type | Description |
|--------|------|-------------|
| train_id | SERIAL | Primary key |
| train_number | VARCHAR | Unique train number |
| train_name | VARCHAR | Train name |
| source_station | VARCHAR | Origin station |
| destination_station | VARCHAR | Final destination |
| departure_time | TIME | Scheduled departure |
| arrival_time | TIME | Scheduled arrival |
| duration | VARCHAR | Journey duration |
| status | ENUM | 'active' or 'inactive' |

#### coaches
| Column | Type | Description |
|--------|------|-------------|
| coach_id | SERIAL | Primary key |
| train_id | INTEGER | Foreign key to trains |
| coach_number | VARCHAR | e.g., 'A1', 'S1', 'C1' |
| coach_type | ENUM | 'sleeper', 'ac', 'chair' |
| total_seats | INTEGER | Total seats in coach |

#### seats
| Column | Type | Description |
|--------|------|-------------|
| seat_id | SERIAL | Primary key |
| coach_id | INTEGER | Foreign key to coaches |
| seat_number | VARCHAR | e.g., '1', '2A', '3B' |
| seat_type | ENUM | 'lower', 'middle', 'upper', etc. |
| status | ENUM | 'available', 'selected', 'booked', 'locked' |
| price | DECIMAL | Seat price |
| row_number | INTEGER | Row position in coach |

#### bookings
| Column | Type | Description |
|--------|------|-------------|
| booking_id | SERIAL | Primary key |
| booking_number | VARCHAR | Unique PNR |
| contact_name | VARCHAR | Booking contact name |
| email | VARCHAR | Contact email |
| train_id | INTEGER | Foreign key to trains |
| source_station | VARCHAR | Boarding station |
| destination_station | VARCHAR | Dropping station |
| travel_date | DATE | Date of travel |
| total_amount | DECIMAL | Total booking amount |
| booking_status | ENUM | 'pending', 'confirmed', 'cancelled' |
| payment_status | ENUM | 'pending', 'paid', 'failed', 'refunded' |

#### passengers
| Column | Type | Description |
|--------|------|-------------|
| passenger_id | SERIAL | Primary key |
| booking_id | INTEGER | Foreign key to bookings |
| seat_id | INTEGER | Foreign key to seats |
| passenger_name | VARCHAR | Passenger name |
| passenger_gender | VARCHAR | Gender |

#### stations
| Column | Type | Description |
|--------|------|-------------|
| station_id | SERIAL | Primary key |
| station_name | VARCHAR | Station name |
| station_code | VARCHAR | Station code |

#### train_stops
| Column | Type | Description |
|--------|------|-------------|
| stop_id | SERIAL | Primary key |
| train_id | INTEGER | Foreign key to trains |
| station_id | INTEGER | Foreign key to stations |
| stop_order | INTEGER | Order of stop in route |
| arrival_time | TIME | Arrival at stop |
| departure_time | TIME | Departure from stop |

---

## Scripts

### Backend Scripts

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Reset all seat statuses to available
npm run reset:seats
```

### Frontend Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## Environment Variables

### Backend (.env)

```env
# Database
DB_NAME=train_booking
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Server
PORT=3000
NODE_ENV=development
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the ISC License.

---

## Author

**Alen Sony**

- GitHub: [@AlenSony](https://github.com/AlenSony)

---

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Lucide](https://lucide.dev/) - Icon library
