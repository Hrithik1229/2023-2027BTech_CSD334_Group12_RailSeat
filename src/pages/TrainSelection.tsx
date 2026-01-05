import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { trains, stations } from '@/data/coachLayouts';
import { Train, CalendarDays, MapPin, Clock, ArrowRight, ArrowLeft, ArrowRightLeft, Users, Wifi, Coffee, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import heroImage from '@/assets/hero-train.jpg';

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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

const TrainSelection = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<Date>();
  const [selectedTrain, setSelectedTrain] = useState<string>('');

  const handleSearch = () => {
    if (source && destination && date && selectedTrain) {
      navigate('/seats', { 
        state: { 
          source, 
          destination, 
          date: format(date, 'PPP'),
          trainId: selectedTrain 
        } 
      });
    }
  };

  const swapStations = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const selectedTrainData = trains.find(t => t.id === selectedTrain);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
              <Train className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg text-foreground">
              RailSeat
            </span>
          </button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Hero Section with Background */}
      <div className="relative">
        <div className="absolute inset-0 h-72 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Train journey" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-background" />
        </div>

        <main className="relative container mx-auto px-4 pt-8 pb-12 max-w-5xl">
          {/* Page Title */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Plan Your Journey
            </h1>
            <p className="text-white/80">
              Select your route and find the perfect train for your travel
            </p>
          </motion.div>

          {/* Search Form Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 md:p-8 mb-8"
          >
            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <motion.div 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  source ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                )}
                animate={source ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {source ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border-2 border-current" />}
                From
              </motion.div>
              <div className="w-8 h-0.5 bg-muted" />
              <motion.div 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  destination ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                )}
                animate={destination ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {destination ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border-2 border-current" />}
                To
              </motion.div>
              <div className="w-8 h-0.5 bg-muted" />
              <motion.div 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  date ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                )}
                animate={date ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {date ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border-2 border-current" />}
                Date
              </motion.div>
              <div className="w-8 h-0.5 bg-muted" />
              <motion.div 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  selectedTrain ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                )}
                animate={selectedTrain ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {selectedTrain ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border-2 border-current" />}
                Train
              </motion.div>
            </div>

            {/* Station Selection Row */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col md:flex-row items-stretch md:items-end gap-4 mb-6"
            >
              {/* Source Station */}
              <motion.div variants={itemVariants} className="flex-1 space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  From
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className={cn(
                    "h-14 bg-background border-border text-lg transition-all duration-300",
                    source && "border-green-500/50 ring-2 ring-green-500/20"
                  )}>
                    <div className="flex items-center gap-3">
                      <MapPin className={cn("w-5 h-5 transition-colors", source ? "text-green-500" : "text-muted-foreground")} />
                      <SelectValue placeholder="Select departure station" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem 
                        key={station} 
                        value={station}
                        disabled={station === destination}
                      >
                        {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Swap Button */}
              <motion.button
                variants={itemVariants}
                onClick={swapStations}
                disabled={!source && !destination}
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-secondary hover:bg-secondary/80 transition-colors mb-1 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-5 h-5 text-secondary-foreground" />
              </motion.button>

              {/* Destination Station */}
              <motion.div variants={itemVariants} className="flex-1 space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  To
                </label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className={cn(
                    "h-14 bg-background border-border text-lg transition-all duration-300",
                    destination && "border-red-500/50 ring-2 ring-red-500/20"
                  )}>
                    <div className="flex items-center gap-3">
                      <MapPin className={cn("w-5 h-5 transition-colors", destination ? "text-red-500" : "text-muted-foreground")} />
                      <SelectValue placeholder="Select arrival station" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem 
                        key={station} 
                        value={station}
                        disabled={station === source}
                      >
                        {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            </motion.div>

            {/* Date and Train Row */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 gap-4 mb-6"
            >
              {/* Travel Date */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Travel Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal bg-background border-border text-lg transition-all duration-300",
                        !date && "text-muted-foreground",
                        date && "border-primary/50 ring-2 ring-primary/20"
                      )}
                    >
                      <CalendarDays className={cn("mr-3 h-5 w-5 transition-colors", date ? "text-primary" : "")} />
                      {date ? format(date, "EEE, dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>

              {/* Train Selection */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Train className="w-4 h-4" />
                  Select Train
                </label>
                <Select value={selectedTrain} onValueChange={setSelectedTrain}>
                  <SelectTrigger className={cn(
                    "h-14 bg-background border-border text-lg transition-all duration-300",
                    selectedTrain && "border-primary/50 ring-2 ring-primary/20"
                  )}>
                    <SelectValue placeholder="Choose your train" />
                  </SelectTrigger>
                  <SelectContent>
                    {trains.map((train) => (
                      <SelectItem key={train.id} value={train.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{train.number}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{train.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            </motion.div>

            {/* Search Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={handleSearch}
                disabled={!source || !destination || !date || !selectedTrain}
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                <motion.span
                  className="flex items-center gap-2"
                  whileHover={{ x: 5 }}
                >
                  Find Seats
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Selected Train Details */}
          <AnimatePresence mode="wait">
            {selectedTrainData && (
              <motion.div 
                key={selectedTrainData.id}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden"
              >
                {/* Train Header */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                        className="p-3 bg-primary/10 rounded-xl"
                      >
                        <Train className="w-6 h-6 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="font-display font-bold text-xl text-foreground">
                          {selectedTrainData.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Train #{selectedTrainData.number}
                        </p>
                      </div>
                    </div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wifi className="w-4 h-4" />
                        <span>WiFi</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coffee className="w-4 h-4" />
                        <span>Pantry</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Journey Timeline */}
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between">
                    {/* Departure */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <p className="text-3xl font-bold text-foreground">{selectedTrainData.departureTime}</p>
                      <p className="text-sm text-muted-foreground mt-1">{source || 'Departure'}</p>
                    </motion.div>

                    {/* Timeline */}
                    <div className="flex-1 mx-6">
                      <div className="relative flex items-center">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="w-3 h-3 rounded-full bg-green-500 z-10" 
                        />
                        <motion.div 
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                          className="flex-1 h-0.5 bg-gradient-to-r from-green-500 via-muted to-red-500 origin-left" 
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="absolute left-1/2 -translate-x-1/2 -top-6 px-3 py-1 bg-secondary rounded-full"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">{selectedTrainData.duration}</span>
                          </div>
                        </motion.div>
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring" }}
                          className="w-3 h-3 rounded-full bg-red-500 z-10" 
                        />
                      </div>
                    </div>

                    {/* Arrival */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <p className="text-3xl font-bold text-foreground">{selectedTrainData.arrivalTime}</p>
                      <p className="text-sm text-muted-foreground mt-1">{destination || 'Arrival'}</p>
                    </motion.div>
                  </div>
                </div>

                {/* Available Coaches */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="px-6 py-4 bg-muted/30 border-t border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Available Coaches</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrainData.coaches.map((coach, index) => (
                        <motion.span 
                          key={coach}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + index * 0.05 }}
                          whileHover={{ scale: 1.1, y: -2 }}
                          className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-default"
                        >
                          {coach}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default TrainSelection;
