import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Train, MapPin, Ticket, Shield, Zap, Users, ArrowRight, ChevronDown } from 'lucide-react';
import heroImage from '@/assets/hero-train.jpg';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: 'Visual Seat Selection',
      description: 'Choose your exact seat from an interactive coach layout with real-time availability'
    },
    {
      icon: Zap,
      title: 'Instant Booking',
      description: 'Complete your reservation in seconds with our streamlined booking flow'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Your transactions are protected with bank-grade encryption'
    },
    {
      icon: Users,
      title: 'Group Travel',
      description: 'Easily book adjacent seats for family and friends traveling together'
    }
  ];

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Train className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              RailSeat
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <Button 
              onClick={() => navigate('/book')} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Book Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Modern train journey" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-sm font-medium mb-6 animate-fade-in backdrop-blur-sm">
              <Zap className="w-4 h-4" />
              <span>The smarter way to book train tickets</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up leading-tight">
              Your Perfect
              <span className="block text-gradient">Seat Awaits</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Experience train booking like never before. See the actual coach layout, 
              pick your preferred seat, and travel in comfort — all in one seamless experience.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button 
                onClick={() => navigate('/book')}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Ticket className="w-5 h-5 mr-2" />
                Book Your Journey
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={scrollToFeatures}
                className="border-foreground/20 hover:bg-foreground/5 text-lg px-8 py-6 backdrop-blur-sm"
              >
                Learn More
                <ChevronDown className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border/50 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground">Happy Travelers</p>
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">200+</p>
                <p className="text-sm text-muted-foreground">Train Routes</p>
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Features</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">
              Why Choose RailSeat?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              A modern booking experience designed for the way you travel today
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group p-8 bg-background rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl w-fit mb-6 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Process</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">
              Book in 3 Simple Steps
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Select Your Train', desc: 'Choose your route, date, and preferred train from our extensive network' },
              { step: '02', title: 'Pick Your Seat', desc: 'View the interactive coach layout and select your perfect seat' },
              { step: '03', title: 'Confirm & Go', desc: 'Complete your booking and receive instant confirmation' }
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="text-xl font-display font-bold text-primary-foreground">{item.step}</span>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <h3 className="font-display font-semibold text-xl text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Button 
              onClick={() => navigate('/book')}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-10 py-6 shadow-xl shadow-primary/20"
            >
              Start Booking Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Train className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">RailSeat</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 RailSeat. Making train travel seamless.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
