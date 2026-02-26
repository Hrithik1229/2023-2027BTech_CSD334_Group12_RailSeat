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
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle2, User } from 'lucide-react';
import { useState } from 'react';

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
  quota?: string;
  disabilityType?: string;
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
  coachNumber,
  quota,
  disabilityType
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

  const baseAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  
  let concession = 0;
  let finalAmount = baseAmount;

  if (quota === 'WD' && disabilityType) {
    const DISABILITY_OPTS = [
        { id: 'BLIND', discount: 0.75 },
        { id: 'ORTHOPEDIC', discount: 0.75 },
        { id: 'DEAF_DUMB', discount: 0.50 },
        { id: 'MENTAL', discount: 0.75 },
        { id: 'CANCER', discount: 0.50 },
        { id: 'PATIENT', discount: 0.50 },
    ];
    const opt = DISABILITY_OPTS.find(o => o.id === disabilityType);
    if (opt) {
      concession = Math.round(baseAmount * opt.discount);
      finalAmount = baseAmount - concession;
    }
  }

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
             {concession > 0 ? (
                <div className="flex items-baseline gap-2">
                     <span className="text-xl font-bold text-muted-foreground/60 line-through">₹{baseAmount}</span>
                     <span className="text-2xl font-bold text-green-600">₹{finalAmount}</span>
                     <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-1">
                        Concession Applied
                     </span>
                </div>
             ) : (
                <p className="text-2xl font-bold text-foreground">₹{finalAmount}</p>
             )}
          </div>
          <button
            onClick={handleSubmit}
            className="pay-btn"
            type="button"
          >
            <span className="btn-text">
              {isFormComplete ? "Pay Now" : "Fill Details"}
            </span>
            <div className="icon-container">
              {/* card */}
              <svg viewBox="0 0 24 24" className="icon card-icon">
                <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4Z" fill="currentColor" />
              </svg>
              {/* payment terminal */}
              <svg viewBox="0 0 24 24" className="icon payment-icon">
                <path d="M2,17H22V21H2V17M6.25,7H9V6H6V3H18V6H15V7H17.75L19,17H5L6.25,7M9,10H15V8H9V10M9,13H15V11H9V13Z" fill="currentColor" />
              </svg>
              {/* dollar */}
              <svg viewBox="0 0 24 24" className="icon dollar-icon">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="currentColor" />
              </svg>
              {/* wallet — default visible icon */}
              <svg viewBox="0 0 24 24" className="icon wallet-icon default-icon">
                <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z" fill="currentColor" />
              </svg>
              {/* checkmark */}
              <svg viewBox="0 0 24 24" className="icon check-icon">
                <path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" fill="currentColor" />
              </svg>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
