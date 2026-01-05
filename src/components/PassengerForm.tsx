import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Seat } from '@/data/coachLayouts';
import { User, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PassengerDetails {
  seatId: string;
  seatNumber: string;
  name: string;
  age: string;
  gender: string;
}

interface PassengerFormProps {
  selectedSeats: Seat[];
  onBack: () => void;
  onConfirm: (passengers: PassengerDetails[]) => void;
  trainName: string;
  coachNumber: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

export const PassengerForm = ({ 
  selectedSeats, 
  onBack, 
  onConfirm,
  trainName,
  coachNumber
}: PassengerFormProps) => {
  const [passengers, setPassengers] = useState<PassengerDetails[]>(
    selectedSeats.map(seat => ({
      seatId: seat.id,
      seatNumber: seat.number,
      name: '',
      age: '',
      gender: ''
    }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    passengers.forEach((passenger, index) => {
      // Name validation
      if (!passenger.name.trim()) {
        newErrors[`name-${index}`] = 'Name is required';
      } else if (passenger.name.trim().length < 2) {
        newErrors[`name-${index}`] = 'Name must be at least 2 characters';
      } else if (passenger.name.trim().length > 50) {
        newErrors[`name-${index}`] = 'Name must be less than 50 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(passenger.name.trim())) {
        newErrors[`name-${index}`] = 'Name can only contain letters';
      }
      
      // Age validation
      if (!passenger.age) {
        newErrors[`age-${index}`] = 'Age is required';
      } else {
        const ageNum = parseInt(passenger.age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          newErrors[`age-${index}`] = 'Enter a valid age (1-120)';
        }
      }
      
      // Gender validation
      if (!passenger.gender) {
        newErrors[`gender-${index}`] = 'Gender is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updatePassenger = (index: number, field: keyof PassengerDetails, value: string) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear error when user starts typing
    if (errors[`${field}-${index}`]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[`${field}-${index}`];
        return updated;
      });
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onConfirm(passengers);
    }
  };

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const isFormComplete = passengers.every(p => p.name && p.age && p.gender);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Passenger Details
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Enter details for {selectedSeats.length} passenger{selectedSeats.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Seats
        </Button>
      </div>

      {/* Journey Summary */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">{trainName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Coach {coachNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedSeats.map((seat, i) => (
              <span key={seat.id} className="px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
                {seat.number}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Passenger Forms */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {passengers.map((passenger, index) => (
          <motion.div
            key={passenger.seatId}
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            {/* Passenger Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                passenger.name && passenger.age && passenger.gender 
                  ? "bg-green-500/20" 
                  : "bg-muted"
              )}>
                {passenger.name && passenger.age && passenger.gender ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Passenger {index + 1}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Seat {passenger.seatNumber} • ₹{selectedSeats[index]?.price}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor={`name-${index}`} className="text-sm text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id={`name-${index}`}
                  placeholder="Enter full name"
                  value={passenger.name}
                  onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                  maxLength={50}
                  className={cn(
                    "h-11",
                    errors[`name-${index}`] && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <AnimatePresence>
                  {errors[`name-${index}`] && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {errors[`name-${index}`]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor={`age-${index}`} className="text-sm text-muted-foreground">
                  Age
                </Label>
                <Input
                  id={`age-${index}`}
                  type="number"
                  placeholder="Enter age"
                  value={passenger.age}
                  onChange={(e) => updatePassenger(index, 'age', e.target.value)}
                  min={1}
                  max={120}
                  className={cn(
                    "h-11",
                    errors[`age-${index}`] && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <AnimatePresence>
                  {errors[`age-${index}`] && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {errors[`age-${index}`]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor={`gender-${index}`} className="text-sm text-muted-foreground">
                  Gender
                </Label>
                <Select
                  value={passenger.gender}
                  onValueChange={(value) => updatePassenger(index, 'gender', value)}
                >
                  <SelectTrigger 
                    id={`gender-${index}`}
                    className={cn(
                      "h-11",
                      errors[`gender-${index}`] && "border-destructive focus-visible:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <AnimatePresence>
                  {errors[`gender-${index}`] && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {errors[`gender-${index}`]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-5 shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Fare</p>
            <p className="text-2xl font-bold text-foreground">₹{totalAmount}</p>
          </div>
          <Button
            onClick={handleSubmit}
            size="lg"
            className={cn(
              "min-w-[200px] h-12 text-base font-semibold transition-all duration-300",
              isFormComplete 
                ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400" 
                : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
            )}
          >
            {isFormComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirm Booking
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
