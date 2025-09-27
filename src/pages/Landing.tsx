import { ArrowRight, Milk, MapPin, Users, BarChart3, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/dairy-farm-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Milk,
      title: "Smart Milk Collection",
      description: "GPS-tracked collection with real-time quality grading and validation codes"
    },
    {
      icon: Users,
      title: "Farmer Management", 
      description: "Complete KYC onboarding with document verification and profile management"
    },
    {
      icon: BarChart3,
      title: "AI-Powered Analytics",
      description: "Intelligent insights and recommendations for optimal farm operations"
    },
    {
      icon: MapPin,
      title: "GPS Integration",
      description: "Location tracking for collections and route optimization for staff"
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Automated payment calculations with secure processing and tracking"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Optimized for field staff with offline capabilities and sync"
    }
  ];

  const stats = [
    { value: "10,000+", label: "Active Farmers" },
    { value: "50,000L", label: "Daily Collection" },
    { value: "99.9%", label: "System Uptime" },
    { value: "24/7", label: "Support Available" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm fixed w-full top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Milk className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-heading font-semibold">DairyChain Pro</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">Features</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">About</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-smooth">Contact</a>
            </div>
            <Button onClick={() => navigate('/login')} variant="primary">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-heading font-bold text-white drop-shadow-lg">
                Smart Dairy Farm Management System
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
                Revolutionize your dairy operations with AI-powered insights, GPS tracking, 
                and comprehensive farm management tools designed for modern agriculture.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/login')}
                className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-strong"
              >
                Start Managing Your Farm
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-primary"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{stat.value}</div>
                <div className="text-sm text-white/80 mt-2 drop-shadow-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Everything You Need to Manage Your Dairy Farm
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From farmer onboarding to payment processing, our comprehensive platform handles every aspect of dairy farm operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="farm-card p-6 text-center hover:shadow-glow group">
                  <CardContent className="p-0 space-y-4">
                    <div className="w-16 h-16 gradient-accent rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-bounce">
                      <Icon className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold font-heading">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Ready to Transform Your Dairy Operations?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of farmers who have already modernized their operations with DairyChain Pro.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/login')}
              variant="primary"
              className="text-lg px-8 py-6"
            >
              Get Started Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 bg-card/30">
        <div className="container mx-auto text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 gradient-primary rounded-md flex items-center justify-center">
              <Milk className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">DairyChain Pro</span>
          </div>
          <p>&copy; 2024 DairyChain Pro. Made with ❤️ for dairy farmers worldwide.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;