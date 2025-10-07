import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, Shield, Leaf, Milk, UserCog, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import bgImage from "@/assets/dairy-farm-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();
  
  // Features data for the enhanced landing page
  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Farmer Management",
      description: "Efficiently manage farmer profiles, KYC documentation, and account information in one centralized system."
    },
    {
      icon: <Leaf className="h-8 w-8 text-primary" />,
      title: "Collection Tracking",
      description: "Real-time tracking of milk collections with quality metrics and automated reporting capabilities."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Secure Payments",
      description: "Transparent and secure payment processing with detailed transaction history and automated settlements."
    }
  ];

  const userTypes = [
    {
      icon: <Home className="h-6 w-6" />,
      title: "Farmers",
      description: "Manage your dairy operations, track collections, and view payments."
    },
    {
      icon: <UserCog className="h-6 w-6" />,
      title: "Field Staff",
      description: "Record collections, manage farmer data, and track daily operations."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Administrators",
      description: "Oversee the entire system, manage users, and generate reports."
    }
  ];

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background font-display justify-between">
      {/* Hero Section */}
      <div className="relative w-full min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
              <Milk className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight max-w-4xl">
            Modern <span className="text-primary">Dairy</span> Management
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Streamline your dairy operations with our comprehensive platform designed for farmers, staff, and administrators.
          </p>
          <div className="mt-10 flex flex-col xs:flex-row gap-4">
            <Button 
              size="lg" 
              className="px-8 xs:px-10 py-6 xs:py-7 text-base rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full xs:w-auto"
              onClick={() => navigate('/farmer/login')}
            >
              Farmer Login <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 xs:px-10 py-6 xs:py-7 text-base rounded-full border-2 w-full xs:w-auto"
              onClick={() => navigate('/staff/login')}
            >
              Staff Login
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 xs:px-10 py-6 xs:py-7 text-base rounded-full border-2 w-full xs:w-auto"
              onClick={() => navigate('/admin/login')}
            >
              Admin Login
            </Button>
          </div>
        </div>
      </div>

      {/* User Types Section */}
      <div className="py-16 md:py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Designed for Everyone</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tailored solutions for every role in your dairy operation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userTypes.map((type, index) => (
              <Card key={index} className="p-8 border-border transition-all duration-300 hover:shadow-lg hover:border-primary/30 text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-primary/10">
                    {type.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{type.title}</h3>
                <p className="text-muted-foreground">{type.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Powerful Features</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your dairy operations efficiently
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 border-border transition-all duration-300 hover:shadow-lg hover:border-primary/30">
                <div className="flex flex-col items-center text-center">
                  <div className="p-4 rounded-full bg-primary/10 mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Dairy Operations?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto text-primary-foreground/90">
            Join thousands of dairy professionals who trust DAIRY FARMERS OF TRANS-NZOIA to streamline their operations.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            onClick={() => navigate('/register')}>
            Get Started Today
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <Milk className="h-8 w-8 text-primary mr-2" />
                <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
              </div>
              <p className="mt-2 text-muted-foreground text-sm">
                Modern dairy management simplified
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-muted-foreground">
                © {new Date().getFullYear()} DAIRY FARMERS OF TRANS-NZOIA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;