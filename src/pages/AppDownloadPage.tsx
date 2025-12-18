import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Download, 
  Bell,
  BarChart3,
  Users,
  Calendar,
  Camera,
  MapPin,
  Shield,
  Zap,
  Mail,
  CheckCircle,
  Star,
  Leaf,
  TrendingUp,
  CreditCard,
  Cloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AppDownloadPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would send this to your backend
    console.log('Email submitted:', email);
    setSubscribed(true);
    // Reset form after submission
    setEmail('');
  };

  const keyFeatures = [
    {
      icon: <Bell className="h-8 w-8 text-primary" />,
      title: "Real-time Notifications",
      description: "Get instant alerts for collections, payments, and important updates."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Smart Analytics",
      description: "Track your performance with detailed charts and insights."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Farmer Management",
      description: "Easily manage farmer profiles, collections, and communications."
    },
    {
      icon: <Calendar className="h-8 w-8 text-primary" />,
      title: "Schedule Management",
      description: "Plan and organize your collection schedules efficiently."
    },
    {
      icon: <Camera className="h-8 w-8 text-primary" />,
      title: "Photo Documentation",
      description: "Capture and store collection photos directly from your device."
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "GPS Tracking",
      description: "Navigate to collection points with built-in map integration."
    }
  ];

  const platformBenefits = [
    {
      icon: <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />,
      title: "Mobile App",
      description: "Available for iOS and Android",
      details: "Take your dairy farming management on the go with our feature-rich mobile application.",
      devicePreview: "bg-gray-200 border-2 border-dashed rounded-xl w-16 h-32 mx-auto"
    },
    {
      icon: <Tablet className="h-12 w-12 text-primary mx-auto mb-4" />,
      title: "Tablet App",
      description: "Optimized for tablets",
      details: "Perfect for in-field data entry with a larger interface designed for productivity.",
      devicePreview: "bg-gray-200 border-2 border-dashed rounded-xl w-24 h-32 mx-auto"
    },
    {
      icon: <Laptop className="h-12 w-12 text-primary mx-auto mb-4" />,
      title: "Desktop App",
      description: "For office and administrative use",
      details: "Full-featured desktop application for comprehensive farm management and reporting.",
      devicePreview: "bg-gray-200 border-2 border-dashed rounded-xl w-32 h-24 mx-auto"
    }
  ];

  const creditSystemFeatures = [
    "Easy credit application and approval process",
    "Transparent credit tracking and management",
    "Flexible repayment options",
    "Real-time credit balance updates",
    "Automated payment reminders",
    "Detailed transaction history"
  ];

  const benefits = [
    "Increase your productivity and efficiency",
    "Make better business decisions with data insights",
    "Improve communication with farmers",
    "Streamline collection and payment processes",
    "Reduce paperwork with digital documentation",
    "Access your data anytime, anywhere"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Leaf className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Dairy Farmers of Trans Nzoia Mobile & Desktop Apps</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Coming Soon to Your Devices - Experience the Future of Dairy Farming Management
          </p>
        </div>

        {/* Platform Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {platformBenefits.map((platform, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                {platform.icon}
                <CardTitle>{platform.title}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {platform.details}
                </p>
                <div className={platform.devicePreview} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {keyFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    {feature.icon}
                    <h3 className="text-lg font-semibold mt-4 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Credit System */}
        <div className="mb-16">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CreditCard className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Integrated Credit Management</CardTitle>
              <CardDescription>
                Manage credit applications, approvals, and repayments seamlessly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creditSystemFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Why You'll Love Our Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security & Reliability */}
        <div className="mb-16">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Shield className="h-10 w-10 text-primary mr-3" />
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Secure & Reliable</CardTitle>
              <CardDescription className="text-center">
                Built with enterprise-grade security and 99.9% uptime guarantee
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Your data is protected with end-to-end encryption and regular security audits.
                We ensure maximum uptime so you can focus on what matters most.
              </p>
              <div className="flex justify-center space-x-4">
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
                <span className="ml-2 text-gray-600">4.9/5 from 200+ users</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Signup */}
        <div className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Be the First to Know</CardTitle>
              <CardDescription className="text-center">
                Sign up for updates on our app release
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscribed ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You for Subscribing!</h3>
                  <p className="text-gray-600">
                    We'll notify you as soon as the apps are available for download.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <Button type="submit" className="whitespace-nowrap">
                      Notify Me
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}