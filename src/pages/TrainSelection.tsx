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
import { Train, CalendarDays, MapPin, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
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
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Select Your Journey
          </h1>
          <p className="text-muted-foreground">
            Choose your train and travel details to proceed
          </p>
        </div>

        {/* Search Form */}
        <div className="glass-card p-6 md:p-8 mb-8 animate-slide-up">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Source Station */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                From Station
              </label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-12 bg-background border-border">
                  <SelectValue placeholder="Select source station" />
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

            {/* Destination Station */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                To Station
              </label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="h-12 bg-background border-border">
                  <SelectValue placeholder="Select destination station" />
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
                      "w-full h-12 justify-start text-left font-normal bg-background border-border",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
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
                <SelectTrigger className="h-12 bg-background border-border">
                  <SelectValue placeholder="Select a train" />
                </SelectTrigger>
                <SelectContent>
                  {trains.map((train) => (
                    <SelectItem key={train.id} value={train.id}>
                      {train.number} - {train.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Selected Train Details */}
        {selectedTrainData && (
          <div className="glass-card p-6 mb-8 animate-scale-in">
            <h3 className="font-display font-semibold text-lg text-foreground mb-4">
              Train Details
            </h3>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-foreground">{selectedTrainData.name}</p>
                <p className="text-sm text-muted-foreground">Train #{selectedTrainData.number}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-foreground">{selectedTrainData.departureTime}</p>
                  <p className="text-muted-foreground text-xs">Departure</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-8 h-px bg-border" />
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">{selectedTrainData.duration}</span>
                  <div className="w-8 h-px bg-border" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">{selectedTrainData.arrivalTime}</p>
                  <p className="text-muted-foreground text-xs">Arrival</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTrainData.coaches.map((coach) => (
                  <span 
                    key={coach}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                  >
                    {coach}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSearch}
            disabled={!source || !destination || !date || !selectedTrain}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Select Seats
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TrainSelection;
