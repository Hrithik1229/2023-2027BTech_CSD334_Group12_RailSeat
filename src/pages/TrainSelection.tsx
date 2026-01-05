import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Train, CalendarDays, MapPin, Clock, ArrowRight, ArrowLeft, ArrowRightLeft, Users, Wifi, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import heroImage from '@/assets/hero-train.jpg';

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
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Plan Your Journey
            </h1>
            <p className="text-white/80">
              Select your route and find the perfect train for your travel
            </p>
          </div>

          {/* Search Form Card */}
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 md:p-8 mb-8 animate-fade-in">
            {/* Station Selection Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 mb-6">
              {/* Source Station */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  From
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-14 bg-background border-border text-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
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
              </div>

              {/* Swap Button */}
              <button
                onClick={swapStations}
                disabled={!source && !destination}
                className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-secondary hover:bg-secondary/80 transition-colors mb-1 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-5 h-5 text-secondary-foreground" />
              </button>

              {/* Destination Station */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  To
                </label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="h-14 bg-background border-border text-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
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
              </div>
            </div>

            {/* Date and Train Row */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Travel Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Travel Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal bg-background border-border text-lg",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-3 h-5 w-5" />
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
              </div>

              {/* Train Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Train className="w-4 h-4" />
                  Select Train
                </label>
                <Select value={selectedTrain} onValueChange={setSelectedTrain}>
                  <SelectTrigger className="h-14 bg-background border-border text-lg">
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
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={!source || !destination || !date || !selectedTrain}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Find Seats
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Selected Train Details */}
          {selectedTrainData && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden animate-scale-in">
              {/* Train Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Train className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-foreground">
                        {selectedTrainData.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Train #{selectedTrainData.number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wifi className="w-4 h-4" />
                      <span>WiFi</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Coffee className="w-4 h-4" />
                      <span>Pantry</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Timeline */}
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  {/* Departure */}
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{selectedTrainData.departureTime}</p>
                    <p className="text-sm text-muted-foreground mt-1">{source || 'Departure'}</p>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 mx-6">
                    <div className="relative flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 z-10" />
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-green-500 via-muted to-red-500" />
                      <div className="absolute left-1/2 -translate-x-1/2 -top-6 px-3 py-1 bg-secondary rounded-full">
                        <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium">{selectedTrainData.duration}</span>
                        </div>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-red-500 z-10" />
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{selectedTrainData.arrivalTime}</p>
                    <p className="text-sm text-muted-foreground mt-1">{destination || 'Arrival'}</p>
                  </div>
                </div>
              </div>

              {/* Available Coaches */}
              <div className="px-6 py-4 bg-muted/30 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Available Coaches</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrainData.coaches.map((coach) => (
                      <span 
                        key={coach}
                        className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-default"
                      >
                        {coach}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TrainSelection;
