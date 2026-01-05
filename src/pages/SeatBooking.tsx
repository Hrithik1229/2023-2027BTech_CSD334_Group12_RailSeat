import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CoachSelector } from '@/components/CoachSelector';
import { SeatMap } from '@/components/SeatMap';
import { BookingSummary } from '@/components/BookingSummary';
import { PassengerForm, PassengerDetails } from '@/components/PassengerForm';
import { coaches, trains, Seat as SeatType } from '@/data/coachLayouts';
import { Train, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SeatBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trainId, source, destination, date } = location.state || {};

  const train = trains.find(t => t.id === trainId);
  const [selectedCoach, setSelectedCoach] = useState<string>(train?.coaches[0] || '');
  const [selectedSeats, setSelectedSeats] = useState<SeatType[]>([]);
  const [showError, setShowError] = useState(false);
  const [showPassengerForm, setShowPassengerForm] = useState(false);

  useEffect(() => {
    if (!train) {
      navigate('/book');
    }
  }, [train, navigate]);

  useEffect(() => {
    // Clear selected seats when coach changes
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
    console.log('handleConfirm called, seats:', selectedSeats.length);
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    console.log('Setting showPassengerForm to true');
    setShowPassengerForm(true);
  };

  const handlePassengerConfirm = (passengers: PassengerDetails[]) => {
    const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);
    toast.success(`Booking confirmed for ${passengers.length} passenger(s)!`, {
      description: `Total: ₹${totalAmount}`,
      duration: 5000,
    });
    // Here you would typically navigate to a confirmation page or payment
    navigate('/');
  };

  const handleBackToSeats = () => {
    setShowPassengerForm(false);
  };

  const handleChangeCoach = () => {
    setSelectedSeats([]);
    setShowPassengerForm(false);
  };

  if (!train) return null;

  const currentCoach = coaches[selectedCoach];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-primary rounded-lg">
              <Train className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg text-foreground">
              RailSeat
            </span>
          </button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/book')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Train
          </Button>
        </div>
      </header>

      {/* Journey Info Bar */}
      <div className="bg-primary/5 border-b border-border py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium text-foreground">{train.name}</span>
              <span className="text-muted-foreground">#{train.number}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{source}</span>
              <span>→</span>
              <span>{destination}</span>
              <span className="mx-2">•</span>
              <span>{date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {showError && (
        <div className="bg-destructive/10 border-b border-destructive/20 py-3 animate-fade-in">
          <div className="container mx-auto px-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Maximum 6 seats can be selected at once</span>
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
