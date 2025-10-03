import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  Milk, 
  Users, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  Award,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const FarmerLandingPage = () => {
  const features = [
    {
      icon: <Milk className="h-8 w-8 text-green-600" />,
      title: "Easy Milk Collection",
      description: "Record your daily milk deliveries with just a few taps"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-600" />,
      title: "Real-time Tracking",
      description: "Monitor your collections, payments, and earnings in real-time"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-600" />,
      title: "Secure Payments",
      description: "Get paid directly to your mobile money or bank account"
    },
    {
      icon: <Smartphone className="h-8 w-8 text-green-600" />,
      title: "Mobile Friendly",
      description: "Works perfectly on your smartphone, even with slow internet"
    }
  ];

  const testimonials = [
    {
      name: "John Kamau",
      farm: "Kamau Family Farm",
      quote: "This system has made milk collection so much easier. I get paid faster and can track all my deliveries.",
      rating: 5
    },
    {
      name: "Mary Wanjiru",
      farm: "Wanjiru Dairy",
      quote: "The mobile app is very simple to use. Even my elderly father can record collections without any problems.",
      rating: 5
    },
    {
      name: "David Ochieng",
      farm: "Ochieng Brothers Farm",
      quote: "The quality tracking feature helps me improve my milk production. My earnings have increased by 20%.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Your <span className="text-green-600">Dairy</span> Collection Made Simple
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-2xl">
                Join thousands of farmers who are revolutionizing their milk collection process with our intuitive mobile platform. 
                Get paid faster, track your deliveries, and grow your business.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link to="/farmer/register">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/farmer/login">
                  <Button size="lg" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 px-8 py-3 text-lg">
                    Farmer Login
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-green-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Milk className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900">DairyChain Pro</div>
                      <div className="text-sm text-gray-500">Farmer Portal</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Today</div>
                    <div className="text-sm font-medium text-gray-900">15 Jan 2024</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Milk className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">Morning Collection</div>
                        <div className="text-sm text-gray-500">8:30 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">45.2 L</div>
                      <div className="text-sm text-green-600">Grade A</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">Payment Received</div>
                        <div className="text-sm text-gray-500">From Dairy Co-op</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">KSh 2,260</div>
                      <div className="text-sm text-blue-600">Completed</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Today</span>
                    <span className="font-semibold text-gray-900">45.2 L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Designed for Farmers, Built for Success</h2>
            <p className="mt-4 text-xl text-gray-600">
              Everything you need to manage your dairy business efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-green-100 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Trusted by Thousands of Farmers</h2>
            <p className="mt-4 text-xl text-gray-600">
              Hear from farmers who have transformed their dairy business
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Award key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.farm}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Dairy Business?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers who are already using our platform to grow their business
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/farmer/register">
              <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 px-8 py-3 text-lg">
                Sign Up Free
              </Button>
            </Link>
            <Link to="/farmer/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg">
                Login to Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Milk className="h-6 w-6 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold">DairyChain Pro</span>
              </div>
              <p className="mt-4 text-gray-400">
                Empowering dairy farmers with technology to grow their business.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/farmer/login" className="hover:text-white">Farmer Login</Link></li>
                <li><Link to="/farmer/register" className="hover:text-white">Register</Link></li>
                <li><Link to="/farmer/support" className="hover:text-white">Support</Link></li>
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Farmer Guide</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Training</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@dairychain.com</li>
                <li>+254 700 000 000</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 DairyChain Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FarmerLandingPage;