import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getLatestAIInstructions, updateAIInstructions } from '@/services/ai/gemini-service';

const AdminAIInstructionsPage = () => {
  const [instructions, setInstructions] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.8');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAIInstructions();
  }, []);

  const fetchAIInstructions = async () => {
    try {
      setLoading(true);
      const aiInstructions = await getLatestAIInstructions();

      setInstructions(aiInstructions.instructions);
      setModelName(aiInstructions.modelName);
      setConfidenceThreshold(aiInstructions.confidenceThreshold.toString());
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI instructions',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = async () => {
    try {
      setSaving(true);

      const result = await updateAIInstructions(
        instructions,
        modelName,
        parseFloat(confidenceThreshold)
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to save AI instructions');
      }

      toast({
        title: 'Success',
        description: 'AI instructions saved successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving AI instructions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI instructions: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Instructions</h1>
          <p className="text-muted-foreground">
            Configure instructions for the AI verification system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Verification Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model-name">
                AI Model
              </Label>
              <select
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Stable & Fast)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental (Fastest)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Capable)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest (Auto-updated)</option>
              </select>
              <p className="text-sm text-muted-foreground">
                Choose the AI model for verification. Gemini 2.5 Flash is recommended for production (stable, fast, excellent vision).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence-threshold">
                Confidence Threshold
              </Label>
              <input
                id="confidence-threshold"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-sm text-muted-foreground">
                Minimum confidence score (0.1-1.0) required for automatic verification. Lower values mean stricter verification.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">
                Instructions for AI Model
              </Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="Enter instructions for the AI model..."
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Guidelines:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Be specific about what the AI should look for in collection photos</li>
                <li>Include examples of valid and invalid collections</li>
                <li>Define thresholds for confidence scores</li>
                <li>Specify when to flag collections for human review</li>
                <li>Keep instructions clear and concise</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveInstructions}
                disabled={saving}
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Instructions'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAIInstructionsPage;