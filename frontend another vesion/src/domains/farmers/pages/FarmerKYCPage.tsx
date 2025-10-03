
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Camera,
  CheckCircle,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const FarmerKYC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nationalId: '',
    govIdFile: null,
    selfieFile: null
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-dairy-50">
      {/* Header */}
      <header className="bg-white border-b border-dairy-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-dairy-blue to-dairy-green rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dairy-900">Farmer KYC Registration</h1>
                <p className="text-sm text-dairy-600">Complete your verification to start delivering milk</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum 
                    ? 'bg-dairy-blue text-white' 
                    : 'bg-dairy-200 text-dairy-600'
                }`}>
                  {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNum ? 'bg-dairy-blue' : 'bg-dairy-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {step === 1 && (
            <Card className="border-dairy-200">
              <CardHeader>
                <CardTitle className="text-dairy-900 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>Enter your basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+254 700 000 000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Physical Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Your farm location"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-dairy-200">
              <CardHeader>
                <CardTitle className="text-dairy-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Government ID Verification
                </CardTitle>
                <CardDescription>Upload your national ID or passport</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nationalId">National ID Number</Label>
                  <Input 
                    id="nationalId" 
                    placeholder="Enter your ID number"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="govId">Upload Government ID</Label>
                  <div className="border-2 border-dashed border-dairy-300 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-dairy-400 mb-4" />
                    <p className="text-dairy-600">Click to upload or drag and drop</p>
                    <p className="text-sm text-dairy-500">PNG, JPG or PDF (max 5MB)</p>
                    <Input type="file" className="hidden" id="govId" accept=".jpg,.jpeg,.png,.pdf" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-dairy-200">
              <CardHeader>
                <CardTitle className="text-dairy-900 flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Selfie Verification
                </CardTitle>
                <CardDescription>Take a clear photo of yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-dairy-300 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 mx-auto text-dairy-400 mb-4" />
                  <p className="text-dairy-600">Take a selfie or upload photo</p>
                  <p className="text-sm text-dairy-500">Make sure your face is clearly visible</p>
                  <div className="flex space-x-4 mt-4 justify-center">
                    <Button variant="outline">Take Photo</Button>
                    <Button variant="outline">Upload File</Button>
                  </div>
                </div>
                <div className="bg-dairy-100 p-4 rounded-lg">
                  <h4 className="font-medium text-dairy-900 mb-2">Photo Guidelines:</h4>
                  <ul className="text-sm text-dairy-700 space-y-1">
                    <li>• Face should be clearly visible and well-lit</li>
                    <li>• No sunglasses or face coverings</li>
                    <li>• Look directly at the camera</li>
                    <li>• Ensure good image quality</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-dairy-200">
              <CardHeader>
                <CardTitle className="text-dairy-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-dairy-green" />
                  Application Submitted
                </CardTitle>
                <CardDescription>Your KYC application is under review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-dairy-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-dairy-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-dairy-900 mb-2">
                    Application Under Review
                  </h3>
                  <p className="text-dairy-600">
                    We'll review your documents and notify you within 24-48 hours via SMS and email.
                  </p>
                </div>

                <div className="border border-dairy-200 rounded-lg p-4">
                  <h4 className="font-medium text-dairy-900 mb-3">Application Summary:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dairy-600">Name:</span>
                      <span className="text-dairy-900">{formData.name || 'John Doe'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dairy-600">Phone:</span>
                      <span className="text-dairy-900">{formData.phone || '+254 700 123 456'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dairy-600">Email:</span>
                      <span className="text-dairy-900">{formData.email || 'john@example.com'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dairy-600">Status:</span>
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-dairy-100 p-4 rounded-lg">
                  <h4 className="font-medium text-dairy-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-dairy-700 space-y-1">
                    <li>• Our team will verify your documents</li>
                    <li>• You'll receive approval notification</li>
                    <li>• Your membership card will be generated</li>
                    <li>• You can start delivering milk immediately</li>
                  </ul>
                </div>

                <div className="flex space-x-4">
                  <Link to="/farmer" className="flex-1">
                    <Button className="w-full bg-dairy-blue hover:bg-dairy-blue/90">
                      Go to Farmer Portal
                    </Button>
                  </Link>
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {step < 4 && (
            <div className="flex justify-between mt-8">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              <Button 
                onClick={handleNext}
                className="bg-dairy-blue hover:bg-dairy-blue/90"
              >
                {step === 3 ? 'Submit Application' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerKYC;
