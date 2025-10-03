import { Link } from "react-router-dom";
import { Card } from "@/components/ui/custom-card";
import { PictureImage } from '@/components/ui/PictureImage';
import { SkipLink } from '@/components/ui/SkipLink';
import { 
  Shield, 
  Users,
  Milk,
  Wheat,
  Sprout,
  Tractor,
  User,
  Lock,
  UserPlus
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      
      {/* Header */}
      <header className="fixed w-full top-0 z-50 bg-white shadow-lg" role="banner">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg" aria-hidden="true">
                <Milk className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-600">
                  DairyChain Pro
                </h1>
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <Wheat className="h-3 w-3" aria-hidden="true" />
                  Smart Agriculture Technology
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen pt-20" aria-labelledby="hero-heading">
        <div 
          className="absolute inset-0 responsive-bg hero-bg-mobile hero-bg-tablet hero-bg-desktop hero-bg-retina"
          role="img"
          aria-label="Dairy farm background"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/70 via-emerald-800/60 to-teal-900/70" />

        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <h1 id="hero-heading" className="text-5xl md:text-7xl font-bold mb-6 text-center">
              <span className="block text-white mb-2">
                Revolutionize Your
              </span>
              <span className="block text-emerald-400">
                Dairy Farm
              </span>
            </h1>

            <p className="text-xl text-white mb-12 max-w-3xl mx-auto text-center leading-relaxed">
              Harness the power of blockchain technology, AI insights, and smart verification 
              to eliminate fraud, boost productivity, and create a transparent dairy ecosystem.
            </p>

            {/* Portal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto mt-16">
              {/* Staff Portal Card */}
              <Card className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-8">
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 mx-auto">
                    <Shield className="h-8 w-8 text-blue-600" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
                    Staff Portal
                  </h2>
                  <p className="text-gray-600 text-center mb-8">
                    Access your professional dashboard and management tools
                  </p>
                  
                  <div className="space-y-4">
                    <Link to="/admin/login" className="block">
                      <button className="w-full px-6 py-3 text-lg font-semibold rounded-lg
                        bg-blue-600 text-white
                        hover:bg-blue-700 transition-all
                        shadow-lg hover:shadow-blue-500/50
                        flex items-center justify-center gap-2"
                        aria-label="Login as Admin">
                        <User className="h-5 w-5" aria-hidden="true" />
                        Login as Admin
                      </button>
                    </Link>
                    <Link to="/staff/login" className="block">
                      <button className="w-full px-6 py-3 text-lg font-semibold rounded-lg
                        bg-indigo-600 text-white
                        hover:bg-indigo-700 transition-all
                        shadow-lg hover:shadow-indigo-500/50
                        flex items-center justify-center gap-2"
                        aria-label="Login as Worker">
                        <User className="h-5 w-5" aria-hidden="true" />
                        Login as Worker
                      </button>
                    </Link>
                  </div>
                </div>
              </Card>

              {/* Farmer Portal Card */}
              <Card className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-8">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 mx-auto">
                    <Sprout className="h-8 w-8 text-green-600" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
                    Farmer Portal
                  </h2>
                  <p className="text-gray-600 text-center mb-8">
                    Manage your farm operations and deliveries
                  </p>
                  
                  <div className="space-y-4">
                    <Link to="/farmer/login" className="block">
                      <button className="w-full px-6 py-3 text-lg font-semibold rounded-lg
                        bg-green-600 text-white
                        hover:bg-green-700 transition-all
                        shadow-lg hover:shadow-green-500/50
                        flex items-center justify-center gap-2"
                        aria-label="Farmer Login">
                        <Lock className="h-5 w-5" aria-hidden="true" />
                        Farmer Login
                      </button>
                    </Link>
                    
                    <Link to="/farmer/register" className="block">
                      <button className="w-full px-6 py-3 text-lg font-semibold rounded-lg
                        bg-white text-green-700 border-2 border-green-600
                        hover:bg-green-50 transition-all
                        shadow-lg hover:shadow-green-500/30
                        flex items-center justify-center gap-2"
                        aria-label="Farmer Signup">
                        <UserPlus className="h-5 w-5" aria-hidden="true" />
                        Farmer Signup
                      </button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16">
              {[
                { icon: Users, value: "200+", label: "Active Farmers" },
                { icon: Tractor, value: "95%", label: "Success Rate" },
                { icon: Shield, value: "100%", label: "Secure" },
                { icon: Wheat, value: "24/7", label: "Support" }
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/90 backdrop-blur-sm rounded-lg p-6
                    shadow-lg hover:shadow-xl transition-all
                    hover:bg-white hover:scale-105"
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-2 text-emerald-600" aria-hidden="true" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-emerald-900 text-white py-20" aria-labelledby="features-heading">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 id="features-heading" className="text-4xl font-bold mb-6">
              Complete Agricultural Technology Suite
            </h2>
            <p className="text-lg text-emerald-100 max-w-3xl mx-auto">
              From smart verification to AI-powered insights, our platform integrates cutting-edge
              technology with traditional farming wisdom.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;