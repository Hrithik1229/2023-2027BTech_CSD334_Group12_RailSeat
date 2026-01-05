export type SeatStatus = 'available' | 'selected' | 'booked' | 'locked';

export type SeatType = 'lower' | 'middle' | 'upper' | 'side-lower' | 'side-upper' | 'window' | 'aisle' | 'middle-seat';

export interface Seat {
  id: string;
  number: string;
  type: SeatType;
  status: SeatStatus;
  price: number;
}

export interface CoachRow {
  rowNumber: number;
  seats: Seat[];
}

export interface CoachLayout {
  id: string;
  name: string;
  type: 'sleeper' | 'ac' | 'chair';
  totalSeats: number;
  rows: CoachRow[];
}

// Sleeper coach layout - 8 berths per compartment (6 main + 2 side)
const generateSleeperLayout = (coachId: string): CoachLayout => {
  const rows: CoachRow[] = [];
  let seatNum = 1;
  
  // 9 compartments
  for (let comp = 0; comp < 9; comp++) {
    // Main berths (6 per compartment: 2 lower, 2 middle, 2 upper)
    const mainSeats: Seat[] = [];
    
    // Left side
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'lower',
      status: Math.random() > 0.6 ? 'available' : Math.random() > 0.5 ? 'booked' : 'available',
      price: 850
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'middle',
      status: Math.random() > 0.5 ? 'available' : 'booked',
      price: 750
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'upper',
      status: Math.random() > 0.4 ? 'available' : 'booked',
      price: 650
    });
    seatNum++;
    
    // Right side
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'lower',
      status: Math.random() > 0.6 ? 'available' : Math.random() > 0.3 ? 'locked' : 'booked',
      price: 850
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'middle',
      status: Math.random() > 0.5 ? 'available' : 'booked',
      price: 750
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'upper',
      status: Math.random() > 0.4 ? 'available' : 'booked',
      price: 650
    });
    seatNum++;
    
    rows.push({ rowNumber: comp * 2 + 1, seats: mainSeats });
    
    // Side berths (2 per compartment)
    const sideSeatS: Seat[] = [
      {
        id: `${coachId}-${seatNum}`,
        number: seatNum.toString(),
        type: 'side-lower',
        status: Math.random() > 0.5 ? 'available' : 'booked',
        price: 700
      },
      {
        id: `${coachId}-${seatNum + 1}`,
        number: (seatNum + 1).toString(),
        type: 'side-upper',
        status: Math.random() > 0.4 ? 'available' : 'booked',
        price: 600
      }
    ];
    seatNum += 2;
    
    rows.push({ rowNumber: comp * 2 + 2, seats: sideSeatS });
  }
  
  return {
    id: coachId,
    name: coachId,
    type: 'sleeper',
    totalSeats: 72,
    rows
  };
};

// AC coach layout - Similar to sleeper but with 6 berths per compartment
const generateACLayout = (coachId: string): CoachLayout => {
  const rows: CoachRow[] = [];
  let seatNum = 1;
  
  // 8 compartments for AC
  for (let comp = 0; comp < 8; comp++) {
    const mainSeats: Seat[] = [];
    
    // Left side - Lower and Upper only
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'lower',
      status: Math.random() > 0.5 ? 'available' : 'booked',
      price: 1450
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'upper',
      status: Math.random() > 0.4 ? 'available' : 'booked',
      price: 1350
    });
    seatNum++;
    
    // Right side
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'lower',
      status: Math.random() > 0.6 ? 'available' : Math.random() > 0.5 ? 'locked' : 'booked',
      price: 1450
    });
    seatNum++;
    
    mainSeats.push({
      id: `${coachId}-${seatNum}`,
      number: seatNum.toString(),
      type: 'upper',
      status: Math.random() > 0.4 ? 'available' : 'booked',
      price: 1350
    });
    seatNum++;
    
    rows.push({ rowNumber: comp * 2 + 1, seats: mainSeats });
    
    // Side berths
    const sideSeats: Seat[] = [
      {
        id: `${coachId}-${seatNum}`,
        number: seatNum.toString(),
        type: 'side-lower',
        status: Math.random() > 0.5 ? 'available' : 'booked',
        price: 1250
      },
      {
        id: `${coachId}-${seatNum + 1}`,
        number: (seatNum + 1).toString(),
        type: 'side-upper',
        status: Math.random() > 0.45 ? 'available' : 'booked',
        price: 1150
      }
    ];
    seatNum += 2;
    
    rows.push({ rowNumber: comp * 2 + 2, seats: sideSeats });
  }
  
  return {
    id: coachId,
    name: coachId,
    type: 'ac',
    totalSeats: 48,
    rows
  };
};

// Chair car layout - 5 seats per row (3+2 configuration)
const generateChairCarLayout = (coachId: string): CoachLayout => {
  const rows: CoachRow[] = [];
  let seatNum = 1;
  
  // 20 rows
  for (let row = 0; row < 20; row++) {
    const seats: Seat[] = [];
    
    // Window seat left
    seats.push({
      id: `${coachId}-${seatNum}`,
      number: `${row + 1}A`,
      type: 'window',
      status: Math.random() > 0.5 ? 'available' : 'booked',
      price: 550
    });
    seatNum++;
    
    // Middle seat left
    seats.push({
      id: `${coachId}-${seatNum}`,
      number: `${row + 1}B`,
      type: 'middle-seat',
      status: Math.random() > 0.6 ? 'available' : 'booked',
      price: 500
    });
    seatNum++;
    
    // Aisle seat left
    seats.push({
      id: `${coachId}-${seatNum}`,
      number: `${row + 1}C`,
      type: 'aisle',
      status: Math.random() > 0.55 ? 'available' : Math.random() > 0.5 ? 'locked' : 'booked',
      price: 520
    });
    seatNum++;
    
    // Aisle seat right
    seats.push({
      id: `${coachId}-${seatNum}`,
      number: `${row + 1}D`,
      type: 'aisle',
      status: Math.random() > 0.55 ? 'available' : 'booked',
      price: 520
    });
    seatNum++;
    
    // Window seat right
    seats.push({
      id: `${coachId}-${seatNum}`,
      number: `${row + 1}E`,
      type: 'window',
      status: Math.random() > 0.5 ? 'available' : 'booked',
      price: 550
    });
    seatNum++;
    
    rows.push({ rowNumber: row + 1, seats });
  }
  
  return {
    id: coachId,
    name: coachId,
    type: 'chair',
    totalSeats: 100,
    rows
  };
};

export const coaches: Record<string, CoachLayout> = {
  'S1': generateSleeperLayout('S1'),
  'S2': generateSleeperLayout('S2'),
  'A1': generateACLayout('A1'),
  'B1': generateACLayout('B1'),
  'C1': generateChairCarLayout('C1'),
  'C2': generateChairCarLayout('C2'),
};

export const trains = [
  {
    id: 'T001',
    number: '12301',
    name: 'Rajdhani Express',
    coaches: ['A1', 'B1', 'C1'],
    departureTime: '16:55',
    arrivalTime: '10:00',
    duration: '17h 5m'
  },
  {
    id: 'T002',
    number: '12951',
    name: 'Mumbai Rajdhani',
    coaches: ['A1', 'B1', 'S1', 'S2'],
    departureTime: '17:25',
    arrivalTime: '08:35',
    duration: '15h 10m'
  },
  {
    id: 'T003',
    number: '12259',
    name: 'Duronto Express',
    coaches: ['S1', 'S2', 'C1', 'C2'],
    departureTime: '23:00',
    arrivalTime: '14:30',
    duration: '15h 30m'
  }
];

export const stations = [
  'New Delhi',
  'Mumbai Central',
  'Chennai Central',
  'Kolkata Howrah',
  'Bangalore City',
  'Hyderabad Deccan',
  'Ahmedabad Junction',
  'Pune Junction',
  'Jaipur Junction',
  'Lucknow Charbagh'
];
