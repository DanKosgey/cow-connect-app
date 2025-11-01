import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const TestDataGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateTestData = async () => {
    try {
      setLoading(true);
      
      // First, check if we have any farmers
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id')
        .limit(1);

      if (farmersError) {
        throw new Error(`Error fetching farmers: ${farmersError.message}`);
      }

      if (!farmers || farmers.length === 0) {
        toast({
          title: "No Farmers",
          description: "No farmers found in the system. Please register farmers first.",
          variant: "destructive",
        });
        return;
      }

      const farmerId = farmers[0].id;
      
      // Insert a test credit transaction
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_granted',
          amount: 50000,
          balance_before: 0,
          balance_after: 50000,
          description: 'Test credit transaction for debugging',
          approval_status: 'approved'
        })
        .select();

      if (error) {
        throw new Error(`Error inserting test data: ${error.message}`);
      }

      toast({
        title: "Success",
        description: "Test credit transaction created successfully!",
      });

      console.log("Test data created:", data);
    } catch (error) {
      console.error("Error generating test data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate test data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h3 className="text-lg font-medium text-yellow-800 mb-2">Test Data Generator</h3>
      <p className="text-yellow-700 mb-4">
        Use this to generate test credit transactions for debugging the credit audit functionality.
      </p>
      <Button 
        onClick={generateTestData} 
        disabled={loading}
        variant="default"
      >
        {loading ? "Generating..." : "Generate Test Credit Transaction"}
      </Button>
    </div>
  );
};

export default TestDataGenerator;