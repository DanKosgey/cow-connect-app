import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Key, 
  Save, 
  RotateCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useCollectorAI } from '@/hooks/useCollectorAI';
import { useToast } from '@/hooks/use-toast';

const CollectorAISettings = () => {
  const { 
    apiKeys, 
    setApiKeys, 
    loading, 
    saving, 
    testing, 
    testResults, 
    updateTestResult,
    saveApiKeys, 
    testAllKeys
  } = useCollectorAI();
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    const result = await saveApiKeys();
    if (result?.success) {
      toast({
        title: 'Success',
        description: 'API keys saved successfully',
        variant: 'success'
      });
    } else {
      toast({
        title: 'Error',
        description: result?.error || 'Failed to save API keys',
        variant: 'error'
      });
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const getKeyErrorMessage = (keyName: string) => {
    const result = testResults[keyName];
    return result?.error || '';
  };

  const getKeyStatus = (keyName: string) => {
    const result = testResults[keyName];
    if (!result) return 'unknown';
    return result.valid ? 'valid' : 'invalid';
  };

  const handleTestKey = async (key: string, keyName: string) => {
    if (!key.trim()) {
      // Set error for empty key
      updateTestResult(keyName, { valid: false, error: 'Key is empty' });
      return;
    }

    try {
      // Import GoogleGenerativeAI dynamically
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      // Initialize Gemini AI with the provided API key
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Test with a simple prompt
      const result = await model.generateContent("Hello, this is a test to validate the API key.");
      const response = await result.response;
      const text = response.text();
      
      // If we get here, the key is valid
      updateTestResult(keyName, { valid: true });
      
      toast({
        title: 'Valid Key',
        description: `API key ${keyName} is valid`,
        variant: 'success'
      });
    } catch (error: any) {
      console.error('Error testing API key:', error);
      const errorMessage = error.message || 'Invalid API key';
      
      updateTestResult(keyName, { valid: false, error: errorMessage });
      
      toast({
        title: 'Invalid Key',
        description: `API key ${keyName} is invalid: ${errorMessage}`,
        variant: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading API keys...</span>
      </div>
    );
  }

  const keyFields = [
    { name: 'api_key_1', label: 'API Key 1' },
    { name: 'api_key_2', label: 'API Key 2' },
    { name: 'api_key_3', label: 'API Key 3' },
    { name: 'api_key_4', label: 'API Key 4' },
    { name: 'api_key_5', label: 'API Key 5' },
    { name: 'api_key_6', label: 'API Key 6' },
    { name: 'api_key_7', label: 'API Key 7' },
    { name: 'api_key_8', label: 'API Key 8' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Important Information
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Add your Gemini API keys below. The system will automatically rotate between keys when 
            quota limits are reached. You can add up to 8 keys for better reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyFields.map(({ name, label }) => {
            const keyStatus = getKeyStatus(name);
            return (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  {label}
                  {keyStatus === 'valid' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                  {keyStatus === 'invalid' && (
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={name}
                    type={showKeys[name] ? "text" : "password"}
                    value={(apiKeys as any)[name]}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [name]: e.target.value }))}
                    placeholder={`Enter ${label}`}
                    className={keyStatus === 'invalid' ? 'border-red-500' : ''}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleKeyVisibility(name)}
                  >
                    {showKeys[name] ? 'Hide' : 'Show'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => handleTestKey((apiKeys as any)[name], name)}
                    disabled={testing || !(apiKeys as any)[name]}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                </div>
                
                {getKeyErrorMessage(name) && (
                  <p className="text-sm text-destructive">
                    {getKeyErrorMessage(name)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Keys'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={testAllKeys}
            disabled={testing}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {testing ? 'Testing...' : 'Test All Keys'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectorAISettings;