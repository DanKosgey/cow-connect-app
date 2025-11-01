import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const TestCreditTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        console.log("Attempting to fetch credit transactions...");
        
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .limit(5);

        console.log("Supabase response:", { data, error });

        if (error) {
          console.error("Supabase error:", error);
          setError(error.message);
        } else {
          setTransactions(data || []);
          console.log("Found transactions:", data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return <div>Loading transactions test...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Test Credit Transactions</h2>
      <p>Found {transactions.length} transactions</p>
      <pre>{JSON.stringify(transactions, null, 2)}</pre>
    </div>
  );
};

export default TestCreditTransactions;