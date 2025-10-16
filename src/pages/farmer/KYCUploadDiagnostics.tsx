import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Home, Milk } from "lucide-react";
import { diagnoseKYCUpload } from "@/utils/kycUploadDiagnostics";

const KYCUploadDiagnostics = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/farmer/login');
    }
  }, [user, loading, navigate]);

  const runDiagnostics = async () => {
    if (!user) return;
    
    setIsRunning(true);
    setDiagnosticsResult(null);
    
    try {
      const result = await diagnoseKYCUpload(user.id);
      setDiagnosticsResult(result);
    } catch (error) {
      console.error('Diagnostics error:', error);
      setDiagnosticsResult({ success: false, error: 'Failed to run diagnostics' });
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Milk className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/farmer/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              KYC Upload <span className="text-primary">Diagnostics</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Diagnose issues with KYC document uploads
            </p>
          </div>

          <Card className="shadow-lg border-border mb-6">
            <CardHeader>
              <CardTitle>Run Diagnostics</CardTitle>
              <CardDescription>
                Test KYC document upload functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">What this test does:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Checks user authentication status</li>
                  <li>• Tests access to kyc-documents bucket</li>
                  <li>• Attempts to upload a small test file</li>
                  <li>• Verifies cleanup of test files</li>
                </ul>
              </div>

              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  'Run Diagnostics'
                )}
              </Button>

              {diagnosticsResult && (
                <div className="mt-6 p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Results:</h3>
                  <div className={`p-3 rounded ${diagnosticsResult.success ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                    <p className={`font-medium ${diagnosticsResult.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                      {diagnosticsResult.success ? '✅ Success' : '❌ Failed'}
                    </p>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {diagnosticsResult.message || diagnosticsResult.error}
                    </p>
                    {diagnosticsResult.details && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                        {JSON.stringify(diagnosticsResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/farmer/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCUploadDiagnostics;