import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDispute } from '@/hooks/useDispute';
import { useToastContext } from '@/components/ToastWrapper';

interface DisputeFormProps {
  collectionId: string;
  farmerId: string;
  onDisputeSubmitted: () => void;
}

export function DisputeForm({ collectionId, farmerId, onDisputeSubmitted }: DisputeFormProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { submitDispute, loading, error, success } = useDispute(farmerId);
  const toast = useToastContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !description.trim()) {
      toast.showError("Error", "Please fill in all fields");
      return;
    }

    const success = await submitDispute({
      collectionId,
      reason,
      description,
    });

    if (success) {
      toast.showSuccess("Success", "Dispute submitted successfully");
      setReason('');
      setDescription('');
      onDisputeSubmitted();
    } else {
      toast.showError("Error", error || "Failed to submit dispute");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Dispute *</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason (e.g., incorrect quantity, quality issues)"
          required
          aria-describedby="reason-help"
        />
        <p id="reason-help" className="text-sm text-gray-500">
          Briefly describe why you're disputing this collection
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Detailed Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide detailed information about the dispute..."
          rows={4}
          required
          aria-describedby="description-help"
        />
        <p id="description-help" className="text-sm text-gray-500">
          Include specific details, dates, and any supporting information
        </p>
      </div>
      
      <Button type="submit" disabled={loading} className="w-full" aria-label={loading ? "Submitting dispute..." : "Submit dispute"}>
        {loading ? "Submitting..." : "Submit Dispute"}
      </Button>
    </form>
  );
}