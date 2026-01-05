import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Train, CalendarDays, MapPin, Clock, ArrowRight, ChevronRight, Zap } from 'lucide-react';
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

  const isFormComplete = source && destination && date && selectedTrain;

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg">
              <Train className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">RailSeat</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Fast booking</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-12">
        {/* Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Book your
            <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              next journey
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Select your route and find the perfect train for your trip.
          </p>
        </motion.div>

        {/* Main Content - Horizontal Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8"
        >
          {/* Station & Date Selection Row */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {/* From */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">From</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    <SelectValue placeholder="Departure" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {stations.map((station) => (
                    <SelectItem key={station} value={station} disabled={station === destination} className="text-white hover:bg-slate-800">
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">To</label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-400 shadow-lg shadow-rose-400/50" />
                    <SelectValue placeholder="Arrival" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {stations.map((station) => (
                    <SelectItem key={station} value={station} disabled={station === source} className="text-white hover:bg-slate-800">
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-14 justify-start bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors",
                      !date && "text-slate-400"
                    )}
                  >
                    <CalendarDays className="mr-3 h-4 w-4 text-blue-400" />
                    {date ? format(date, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="bg-slate-900 text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Train */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Train</label>
              <Select value={selectedTrain} onValueChange={setSelectedTrain}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors">
                  <SelectValue placeholder="Select train" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {trains.map((train) => (
                    <SelectItem key={train.id} value={train.id} className="text-white hover:bg-slate-800">
                      {train.number} - {train.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Train Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-400">Available trains</h2>
              <span className="text-xs text-slate-500">{trains.length} options</span>
            </div>
            
            <div className="grid gap-3">
              {trains.map((train, index) => (
                <motion.div
                  key={train.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  onClick={() => setSelectedTrain(train.id)}
                  className={cn(
                    "group relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border",
                    selectedTrain === train.id 
                      ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 border-blue-500/50" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    {/* Train Info */}
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        selectedTrain === train.id ? "bg-blue-500/20" : "bg-white/5"
                      )}>
                        <Train className={cn(
                          "w-5 h-5",
                          selectedTrain === train.id ? "text-blue-400" : "text-slate-400"
                        )} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-white">{train.name}</h3>
                          <span className="text-xs text-slate-500 font-mono">{train.number}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {train.coaches.slice(0, 3).map((coach) => (
                            <span 
                              key={coach}
                              className="px-2 py-0.5 bg-white/5 text-slate-400 text-xs rounded-md"
                            >
                              {coach}
                            </span>
                          ))}
                          {train.coaches.length > 3 && (
                            <span className="text-xs text-slate-500">+{train.coaches.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Info */}
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">{train.departureTime}</p>
                        <p className="text-xs text-slate-500">Depart</p>
                      </div>
                      
                      <div className="flex items-center gap-2 px-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <div className="w-16 h-px bg-gradient-to-r from-emerald-400/50 via-slate-600 to-rose-400/50" />
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {train.duration}
                        </div>
                        <div className="w-16 h-px bg-gradient-to-r from-emerald-400/50 via-slate-600 to-rose-400/50" />
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                      </div>
                      
                      <div>
                        <p className="text-xl font-bold text-white">{train.arrivalTime}</p>
                        <p className="text-xs text-slate-500">Arrive</p>
                      </div>

                      <ChevronRight className={cn(
                        "w-5 h-5 transition-all",
                        selectedTrain === train.id ? "text-blue-400 translate-x-1" : "text-slate-600 group-hover:text-slate-400"
                      )} />
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {selectedTrain === train.id && (
                    <motion.div 
                      layoutId="selected-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-violet-400 rounded-r-full"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSearch}
              disabled={!isFormComplete}
              size="lg"
              className={cn(
                "h-14 px-8 text-base font-semibold rounded-xl transition-all duration-300",
                isFormComplete 
                  ? "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25 text-white" 
                  : "bg-white/10 text-slate-500 cursor-not-allowed"
              )}
            >
              Continue to Seats
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TrainSelection;
