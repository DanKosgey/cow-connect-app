import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, Shield, Leaf, Milk, UserCog, Home, CheckCircle, TrendingUp, Award, ArrowRight, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import bgImage from "@/assets/dairy-farm-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [scrollY, setScrollY] = useState(0);
  
  // Check for registration completion and show toast message
  useEffect(() => {
    const registrationComplete = localStorage.getItem('registration_complete');
    if (registrationComplete) {
      // Show toast message for 60 seconds (as requested)
      const toastId = toast.success(
        "Registration Complete", 
        "Please check your email and click the verification link to confirm your account. After verification, our admin team will review your documents."
      );
      
      // Remove the flag from localStorage
      localStorage.removeItem('registration_complete');
      
      // Auto-dismiss the toast after 60 seconds
      setTimeout(() => {
        // The toast system already handles auto-dismissal, but we can ensure it's cleared
      }, 60000);
    }
  }, [toast]);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <CheckCircle className="h-7 w-7" />,
      title: "Quality Assurance",
      description: "Real-time quality monitoring and reporting for all dairy collections with advanced analytics.",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: <TrendingUp className="h-7 w-7" />,
      title: "Performance Tracking",
      description: "Detailed analytics and insights to optimize your dairy operations and maximize efficiency.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Award className="h-7 w-7" />,
      title: "Certification Ready",
      description: "Comprehensive documentation for regulatory compliance and industry certifications.",
      color: "from-violet-500 to-purple-500"
    }
  ];

  const userTypes = [
    {
      icon: <Home className="h-7 w-7" />,
      title: "Farmers",
      description: "Manage your dairy operations, track collections, and view payments in real-time.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <UserCog className="h-7 w-7" />,
      title: "Field Staff",
      description: "Record collections, manage farmer data, and track daily operations seamlessly.",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      icon: <Shield className="h-7 w-7" />,
      title: "Administrators",
      description: "Oversee the entire system, manage users, and generate comprehensive reports.",
      gradient: "from-purple-500 to-pink-600"
    }
  ];

  const stats = [
    { number: "5000+", label: "Active Farmers" },
    { number: "50M+", label: "Liters Processed" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  return (
    <div className="relative w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section with Background Image */}
      <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40" />
        
        <div className="relative z-10 max-w-7xl mx-auto text-center py-20">
          {/* Floating Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full mb-8 backdrop-blur-sm animate-fade-in">
            <Star className="w-4 h-4 text-green-600 fill-green-600" />
            <span className="text-sm font-medium text-green-700">Trusted by 5000+ Farmers</span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-8 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Milk className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
            <span className="bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">
              Modern{" "}
            </span>
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Dairy
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">
              Management
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Streamline your dairy operations with our comprehensive platform designed for{" "}
            <span className="font-semibold text-green-300">farmers</span>,{" "}
            <span className="font-semibold text-blue-300">staff</span>, and{" "}
            <span className="font-semibold text-purple-300">administrators</span>.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-400">
            <Button 
              size="lg"
              className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 overflow-hidden"
              onClick={() => navigate('/farmer/login')}
            >
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              <span className="relative">Farmer Login</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-full border-2 border-white/20 hover:border-green-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              onClick={() => navigate('/staff/login')}
            >
              Staff Login
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-full border-2 border-white/20 hover:border-purple-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              onClick={() => navigate('/admin/login')}
            >
              Admin Login
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="group animate-fade-in-up" style={{ animationDelay: `${600 + index * 100}ms` }}>
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="mt-2 text-sm text-slate-300 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full p-1">
            <div className="w-1.5 h-3 bg-gradient-to-b from-green-500 to-transparent rounded-full mx-auto animate-scroll"></div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-full mb-4">
              <span className="text-sm font-semibold text-blue-600">FEATURES</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage your dairy operations efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-500`}></div>
                
                <div className="relative">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-green-600 group-hover:to-emerald-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Types Section */}
      <div className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full mb-4">
              <span className="text-sm font-semibold text-purple-600">FOR EVERYONE</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Designed for Everyone
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Tailored solutions for every role in your dairy operation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userTypes.map((type, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100"
              >
                {/* Animated Gradient Border */}
                <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <div className="absolute inset-[2px] bg-white rounded-3xl"></div>
                
                <div className="relative">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${type.gradient} text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    {type.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {type.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {type.description}
                  </p>
                  <button className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${type.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-300`}>
                    Learn More
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600"></div>
        <div className="absolute inset-0 opacity-30"></div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <Zap className="w-16 h-16 text-white mx-auto mb-6 animate-pulse" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Dairy Operations?
          </h2>
          <p className="text-xl text-green-50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of dairy professionals who trust DAIRY FARMERS OF TRANS-NZOIA to streamline their operations.
          </p>
          <Button 
            size="lg"
            className="group px-10 py-5 bg-white text-green-600 font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
            onClick={() => navigate('/register')}
          >
            <span>Get Started Today</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Milk className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
              </div>
              <p className="text-slate-400 text-sm">
                Modern dairy management simplified
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} DAIRY FARMERS OF TRANS-NZOIA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes scroll {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(20px);
            opacity: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
          animation-fill-mode: both;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-scroll {
          animation: scroll 1.5s ease-in-out infinite;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-400 {
          animation-delay: 400ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }

        .delay-2000 {
          animation-delay: 2000ms;
        }
      `}</style>
    </div>
  );
};

export default Landing;