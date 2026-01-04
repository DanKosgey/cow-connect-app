import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, Shield, Leaf, Milk, UserCog, CheckCircle, TrendingUp, Award, ArrowRight, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      toast.success(
        "Registration Complete",
        "Please check your email and click the verification link to confirm your account. After verification, our admin team will review your documents."
      );

      // Remove the flag from localStorage
      localStorage.removeItem('registration_complete');
    }
  }, [toast]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Quality Assurance",
      description: "Real-time quality monitoring and reporting for all dairy collections with advanced analytics.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Performance Tracking",
      description: "Detailed analytics and insights to optimize your dairy operations and maximize efficiency.",
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "AI-Powered Insights",
      description: "Get expert dairy farming advice and production predictions to maximize your profits.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Community Forum",
      description: "Connect with fellow farmers, share experiences, and participate in knowledge-sharing discussions.",
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      title: "Sustainable Farming",
      description: "Promoting eco-friendly dairy farming practices that protect our environment.",
    }
  ];

  const userTypes = [
    {
      icon: <Milk className="h-6 w-6" />,
      title: "Farmers",
      description: "Manage your dairy operations, track collections, and view payments in real-time.",
      action: "Farmer Login",
      path: "/farmer/login"
    },
    {
      icon: <UserCog className="h-6 w-6" />,
      title: "Field Staff",
      description: "Record collections, manage farmer data, and track daily operations seamlessly.",
      action: "Staff Login",
      path: "/staff/login"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Administrators",
      description: "Oversee the entire system, manage users, and generate comprehensive reports.",
      action: "Admin Portal",
      path: "/admin/login"
    }
  ];

  const stats = [
    { number: "50,000+", label: "Active Farmers" },
    { number: "10M+", label: "Liters of Milk" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  return (
    <div className="relative w-full min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900">

      {/* Navbar / Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight ${scrollY > 50 ? 'text-slate-900' : 'text-white'}`}>
              DAIRY FARMERS <span className="font-light opacity-80">OF TRANS-NZOIA</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              className="login-btn-animated text-white font-bold px-6 py-2 rounded-full shadow-lg border-2 border-green-400/50 backdrop-blur-sm"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              className="hidden md:flex bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-6 rounded-full transition-all backdrop-blur-md"
              onClick={() => navigate('/farmer/signup')}
            >
              Register
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 z-0 bg-slate-900/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-slate-900/60" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full mb-8 animate-fade-in-up">
            <Star className="w-4 h-4 text-green-400 fill-green-400" />
            <span className="text-sm font-medium text-white/90 tracking-wide">Trusted by 50,000+ Farmers</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight animate-fade-in-up delay-100">
            Connecting <span className="text-green-400">Dairy Farmers</span> <br className="hidden md:block" />
            in Trans-Nzoia
          </h1>

          <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-12 leading-relaxed font-light animate-fade-in-up delay-200">
            Empowering the region with premium dairy management technology.
            Streamline your collections, track performance, and grow with confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Button
              size="lg"
              className="h-14 px-8 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-green-900/20 transition-all w-full sm:w-auto"
              onClick={() => navigate('/farmer/signup')}
            >
              Get Started Now
            </Button>
            <Button
              size="lg"
              className="h-14 px-8 border-2 border-white/30 hover:border-green-400 bg-white/5 hover:bg-green-600/20 backdrop-blur-md text-white text-lg font-medium rounded-full w-full sm:w-auto transition-all animate-pulse"
              onClick={() => navigate('/login')}
            >
              Member Login
            </Button>
          </div>

          <div className="mt-20 border-t border-white/10 pt-8 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up delay-500">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-green-600 font-semibold tracking-wider text-sm uppercase">Our Solution</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">Everything you need to grow</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Professional tools designed specifically for the modern dairy ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {features.map((feature, index) => (
              <div key={index} className="group p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portals Section */}
      <div className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-green-600 font-semibold tracking-wider text-sm uppercase">Access Portals</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-6">Designed for every stakeholder</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Whether you are a farmer, field officer, or administrator, our platform provides tailored interfaces to perform your daily tasks efficiently.
              </p>
              <div className="space-y-4">
                {userTypes.map((type, index) => (
                  <div key={index}
                    className="flex items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(type.path)}
                  >
                    <div className="p-3 bg-slate-100 rounded-lg mr-4 text-slate-600">
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{type.title}</h4>
                      <p className="text-sm text-slate-500">{type.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-full min-h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-slate-900/20 z-10"></div>
              <img
                src={bgImage}
                alt="Dairy Farm Operations"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-20 flex flex-col justify-end p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  <span className="text-white font-semibold">Excellence in Agriculture</span>
                </div>
                <p className="text-white/80">Rated #1 Dairy Management System in Kenya</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-slate-900 text-white text-center px-6">
        <div className="max-w-4xl mx-auto">
          <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to modernize your farm?</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join thousands of successful farmers in Trans-Nzoia who are already using our platform.
          </p>
          <Button
            size="lg"
            className="h-16 px-10 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-full shadow-xl transition-all"
            onClick={() => navigate('/farmer/signup')}
          >
            Create Your Account Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <Milk className="w-5 h-5 text-white" />
              <span className="font-bold text-lg text-white tracking-tight">DAIRY FARMERS</span>
            </div>
            <p>© {new Date().getFullYear()} All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>

      <style>{`
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
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0; 
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px 0 rgba(74, 222, 128, 0.7);
            transform: scale(1.05);
          }
        }

        .login-btn-animated {
          animation: pulse-glow 2s infinite;
          background: linear-gradient(45deg, #16a34a, #22c55e);
          transition: all 0.3s ease;
        }

        .login-btn-animated:hover {
          animation: none;
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
        }

        @keyframes gradient-xy {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Landing;