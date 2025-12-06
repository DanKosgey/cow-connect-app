import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Save, 
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AISettingsPanel = () => {
  const { toast } = useToast();
  const [instructions, setInstructions] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState('0.7');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to a database or localStorage
      localStorage.setItem('aiAgentSettings', JSON.stringify({
        instructions,
        modelName,
        temperature: parseFloat(temperature)
      }));
      
      toast({
        title: 'Settings Saved',
        description: 'AI agent settings have been saved successfully',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save AI agent settings',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setInstructions('');
    setModelName('gemini-2.5-flash');
    setTemperature('0.7');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Agent Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800">Custom Instructions</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Configure how your personal AI assistant behaves. These instructions will guide 
                the AI in providing responses tailored to your needs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Custom Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter custom instructions for your AI assistant. For example: 'Always be concise and helpful. Focus on dairy farming best practices.'"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model Name</Label>
              <Input
                id="model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Enter model name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="Enter temperature (0-1)"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISettingsPanel;