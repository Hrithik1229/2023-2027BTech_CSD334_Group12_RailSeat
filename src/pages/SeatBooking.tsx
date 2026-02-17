import { BookingSummary } from '@/components/BookingSummary';
import { CoachSelector } from '@/components/CoachSelector';
import Navbar from '@/components/Navbar';
import { PassengerDetails, PassengerForm } from '@/components/PassengerForm';
import { SeatMap } from '@/components/SeatMap';
import { Button } from '@/components/ui/button';
import { CoachLayout, CoachRow, Seat as SeatType } from '@/data/coachLayouts';
import { API_BASE, getStoredUser } from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SeatBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trainId, source, destination, date, isoDate } = location.state || {};

  const [train, setTrain] = useState<any>(null);
  const [coachLayouts, setCoachLayouts] = useState<Record<string, CoachLayout>>({});
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<SeatType[]>([]);
  const [showError, setShowError] = useState(false);
  const [showPassengerForm, setShowPassengerForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Transform backend coach data to frontend CoachLayout
  const transformCoachToLayout = (backendCoach: any): CoachLayout => {
    const rowMap = new Map<number, SeatType[]>();
    
    // Sort seats by seat number (numeric)
    const sortedSeats = [...backendCoach.seats].sort((a, b) => {
        const numA = parseInt(a.seat_number.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.seat_number.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    sortedSeats.forEach((s: any) => {
      const rowNum = s.row_number;
      if (!rowMap.has(rowNum)) {
        rowMap.set(rowNum, []);
      }
      
      rowMap.get(rowNum)?.push({
        id: s.seat_id.toString(),
        number: s.seat_number,
        type: s.seat_type,
        status: s.status,
        price: parseFloat(s.price)
      });
    });

    let finalRows: CoachRow[] = [];
    const sortedRowNumbers = Array.from(rowMap.keys()).sort((a, b) => a - b);

    if (backendCoach.coach_type === 'sleeper' || backendCoach.coach_type === 'ac') {
        // For Sleeper/AC: Split into Main Row and Side Row
        sortedRowNumbers.forEach(rowNum => {
            const seats = rowMap.get(rowNum) || [];
            
            const mainSeats = seats.filter(s => !s.type.startsWith('side-'));
            const sideSeats = seats.filter(s => s.type.startsWith('side-'));

            // Sort side seats: Upper first (visual preference? Or standard?) 
            // Usually Side Upper is above Side Lower physically, but seat number wise:
            // S7 (SL), S8 (SU).
            // SeatMap render: sideRow.seats.map().
            // If we keep numeric sort: SL, SU.
            // SeatMap:
            //   map(seat => <Seat ... />)
            //   Labels: SU, SL.
            // It puts seats in a column. top -> bottom.
            // If we want SU on top, we probably need SU first?
            // Let's stick to numeric sort first.

            finalRows.push({ rowNumber: rowNum, seats: mainSeats });
            finalRows.push({ rowNumber: rowNum, seats: sideSeats });
        });
    } else {
        // For Chair Car: Keep as is
        sortedRowNumbers.forEach(rowNum => {
             finalRows.push({ rowNumber: rowNum, seats: rowMap.get(rowNum) || [] });
        });
    }

    return {
      id: backendCoach.coach_number,
      name: backendCoach.coach_number,
      type: backendCoach.coach_type,
      totalSeats: backendCoach.total_seats,
      rows: finalRows
    };
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      toast.error("Please login to select seats");
      navigate('/login');
      return;
    }

    if (!trainId) {
      navigate('/');
      return;
    }

    const fetchTrainDetails = async () => {
      try {
        const response = await fetch(`${API_BASE}/trains/${trainId}`);
        if (!response.ok) throw new Error('Failed to fetch train details');
        
        const data = await response.json();
        
        const trainData = {
            id: data.train_id.toString(),
            number: data.train_number,
            name: data.train_name,
            coaches: data.coaches.map((c: any) => c.coach_number)
        };

        const layouts: Record<string, CoachLayout> = {};
        data.coaches.forEach((c: any) => {
            layouts[c.coach_number] = transformCoachToLayout(c);
        });

        setTrain(trainData);
        setCoachLayouts(layouts);
        
        if (data.coaches.length > 0) {
            setSelectedCoach(data.coaches[0].coach_number);
        }

      } catch (error) {
        console.error("Error fetching train details:", error);
        toast.error("Failed to load train details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrainDetails();
  }, [trainId, navigate]);

  useEffect(() => {
    setSelectedSeats([]);
  }, [selectedCoach]);

  const handleSeatSelect = (seat: SeatType) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      toast.info(`Seat ${seat.number} removed`);
    } else {
      if (selectedSeats.length >= 6) {
        setShowError(true);
        toast.error('Maximum 6 seats can be selected at once');
        setTimeout(() => setShowError(false), 3000);
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
      toast.success(`Seat ${seat.number} selected`);
    }
  };

  const handleRemoveSeat = (seat: SeatType) => {
    setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
    toast.info(`Seat ${seat.number} removed`);
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    setShowPassengerForm(true);
  };

  const handlePassengerConfirm = async (passengers: PassengerDetails[]) => {
    setIsLoading(true);
    try {
        const user = getStoredUser();
        const payload = {
            contactName: passengers[0].name,
            email: user?.email ?? passengers[0].name + "@guest.local",
            userId: user?.user_id ?? undefined,
            trainId: train.id,
            sourceStation: source,
            destinationStation: destination,
            travelDate: isoDate || new Date().toISOString().split('T')[0],
            seats: selectedSeats.map(s => ({ seatId: parseInt(s.id) })),
            passengers: passengers.map(p => ({
                name: p.name,
                gender: p.gender
            }))
        };

        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
             throw new Error(errorData.error || 'Booking failed');
        }

        const bookingData = await response.json();
        const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);
        
        toast.success(`Booking Confirmed!`, {
            description: (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold">PNR: {bookingData.booking_number}</span>
                    <span>Total Amount: ₹{totalAmount}</span>
                </div>
            ),
            duration: 6000,
        });

        navigate('/book'); 

    } catch (error: any) {
        console.error("Booking Error:", error);
        toast.error(`Booking Failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleBackToSeats = () => {
    setShowPassengerForm(false);
  };

  const handleChangeCoach = () => {
    setSelectedSeats([]);
    setShowPassengerForm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!train) return null;

  const currentCoach = coachLayouts[selectedCoach];

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        extraNav={
          <Button variant="ghost" onClick={() => navigate('/book')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Train
          </Button>
        }
      />

      {/* Journey Info Bar */}
      <div className="bg-gradient-to-r from-primary to-blue-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 opacity-50 pattern-grid-lg"></div>
        <div className="container mx-auto px-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display tracking-tight text-white">{train.name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium border border-white/20">#{train.number}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-100 text-sm font-medium">
                  <span className="opacity-80">Departure</span>
                  <span>•</span>
                  <span>{date}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 bg-white/10 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10">
               <div className="flex flex-col">
                   <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">From</span>
                   <span className="font-bold text-lg">{source}</span>
               </div>
               <div className="flex items-center px-4">
                   <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent relative">
                       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white"></div>
                   </div>
               </div>
               <div className="flex flex-col text-right">
                   <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">To</span>
                   <span className="font-bold text-lg">{destination}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {showError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in shadow-2xl">
          <div className="bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-3 border border-red-400/50 backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-white animate-pulse" />
            <span className="font-medium">Maximum 6 seats allowed per booking</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {showPassengerForm ? (
            <motion.div
              key="passenger-form"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <PassengerForm
                selectedSeats={selectedSeats}
                onBack={handleBackToSeats}
                onConfirm={handlePassengerConfirm}
                trainName={train.name}
                coachNumber={selectedCoach}
              />
            </motion.div>
          ) : (
            <motion.div
              key="seat-selection"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              {/* Left Panel - Coach Selection & Seat Map */}
              <div className="lg:col-span-2 space-y-6">
                {/* Coach Selector */}
                <div className="glass-card p-6">
                  <CoachSelector
                    coaches={train.coaches}
                    selectedCoach={selectedCoach}
                    onSelect={setSelectedCoach}
                  />
                </div>

                {/* Seat Map */}
                {currentCoach && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        Coach {selectedCoach} - {currentCoach.type === 'sleeper' ? 'Sleeper Class' : currentCoach.type === 'ac' ? 'AC 2-Tier' : 'Chair Car'}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {currentCoach.totalSeats} seats
                      </span>
                    </div>
                    <SeatMap
                      coach={currentCoach}
                      selectedSeats={selectedSeats}
                      onSeatSelect={handleSeatSelect}
                    />
                  </div>
                )}
              </div>

              {/* Right Panel - Booking Summary */}
              <div className="lg:col-span-1">
                <BookingSummary
                  trainName={train.name}
                  trainNumber={train.number}
                  selectedCoach={selectedCoach}
                  selectedSeats={selectedSeats}
                  onRemoveSeat={handleRemoveSeat}
                  onConfirm={handleConfirm}
                  onChangeCoach={handleChangeCoach}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SeatBooking;
