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
import { Train, CalendarDays, MapPin, Clock, ArrowRight, ArrowLeft, Users, Wifi, UtensilsCrossed, Armchair } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const selectedTrainData = trains.find(t => t.id === selectedTrain);
  const isFormComplete = source && destination && date && selectedTrain;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-500/25">
              <Train className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              RailSeat
            </span>
          </button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-3">
            Where to next?
          </h1>
          <p className="text-slate-500 text-lg">
            Find and book your perfect train journey
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left - Search Form */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
              <h2 className="font-display font-semibold text-xl text-slate-800 mb-6">
                Journey Details
              </h2>

              <div className="space-y-5">
                {/* From */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    Departure Station
                  </label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className={cn(
                      "h-14 bg-slate-50 border-0 text-base rounded-xl transition-all",
                      source && "ring-2 ring-emerald-500/30 bg-emerald-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        <MapPin className={cn("w-5 h-5", source ? "text-emerald-600" : "text-slate-400")} />
                        <SelectValue placeholder="Select station" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station} disabled={station === destination}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Connector Line */}
                <div className="flex items-center justify-center">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-rose-500 rounded-full" />
                </div>

                {/* To */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
                    Arrival Station
                  </label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className={cn(
                      "h-14 bg-slate-50 border-0 text-base rounded-xl transition-all",
                      destination && "ring-2 ring-rose-500/30 bg-rose-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        <MapPin className={cn("w-5 h-5", destination ? "text-rose-600" : "text-slate-400")} />
                        <SelectValue placeholder="Select station" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station} disabled={station === source}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Travel Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-14 justify-start text-left font-normal bg-slate-50 border-0 text-base rounded-xl transition-all",
                          !date && "text-slate-400",
                          date && "ring-2 ring-blue-500/30 bg-blue-50/50"
                        )}
                      >
                        <CalendarDays className={cn("mr-3 h-5 w-5", date ? "text-blue-600" : "text-slate-400")} />
                        {date ? format(date, "EEEE, MMMM d, yyyy") : "Select date"}
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
                </div>

                {/* Train */}
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Train className="w-4 h-4" />
                    Select Train
                  </label>
                  <Select value={selectedTrain} onValueChange={setSelectedTrain}>
                    <SelectTrigger className={cn(
                      "h-14 bg-slate-50 border-0 text-base rounded-xl transition-all",
                      selectedTrain && "ring-2 ring-blue-500/30 bg-blue-50/50"
                    )}>
                      <SelectValue placeholder="Choose your train" />
                    </SelectTrigger>
                    <SelectContent>
                      {trains.map((train) => (
                        <SelectItem key={train.id} value={train.id}>
                          <span className="font-medium">{train.number}</span>
                          <span className="text-slate-400 mx-2">•</span>
                          <span>{train.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <motion.div 
                className="mt-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleSearch}
                  disabled={!isFormComplete}
                  size="lg"
                  className={cn(
                    "w-full h-14 text-base font-semibold rounded-xl transition-all duration-300",
                    isFormComplete 
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30" 
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  Search Seats
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Right - Train Cards */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <h2 className="font-display font-semibold text-xl text-slate-800 mb-4">
              Available Trains
            </h2>

            <div className="space-y-4">
              {trains.map((train, index) => (
                <motion.div
                  key={train.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  onClick={() => setSelectedTrain(train.id)}
                  className={cn(
                    "bg-white rounded-2xl p-5 cursor-pointer transition-all duration-300 border-2",
                    selectedTrain === train.id 
                      ? "border-blue-500 shadow-xl shadow-blue-500/10" 
                      : "border-transparent shadow-lg shadow-slate-200/50 hover:shadow-xl"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        selectedTrain === train.id ? "bg-blue-100" : "bg-slate-100"
                      )}>
                        <Train className={cn(
                          "w-6 h-6",
                          selectedTrain === train.id ? "text-blue-600" : "text-slate-600"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-slate-800">
                          {train.name}
                        </h3>
                        <p className="text-sm text-slate-500">#{train.number}</p>
                      </div>
                    </div>
                    
                    {selectedTrain === train.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full"
                      >
                        Selected
                      </motion.div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-800">{train.departureTime}</p>
                      <p className="text-xs text-slate-500">Departure</p>
                    </div>
                    
                    <div className="flex-1 relative">
                      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-slate-300 to-rose-400 rounded-full" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500" />
                      <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {train.duration}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-800">{train.arrivalTime}</p>
                      <p className="text-xs text-slate-500">Arrival</p>
                    </div>
                  </div>

                  {/* Amenities & Coaches */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex items-center gap-1 text-xs">
                        <Wifi className="w-4 h-4" />
                        <span>WiFi</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Pantry</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Armchair className="w-4 h-4" />
                        <span>Recliner</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {train.coaches.slice(0, 4).map((coach) => (
                        <span 
                          key={coach}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md"
                        >
                          {coach}
                        </span>
                      ))}
                      {train.coaches.length > 4 && (
                        <span className="text-xs text-slate-400">
                          +{train.coaches.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default TrainSelection;
