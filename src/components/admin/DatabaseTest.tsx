import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DatabaseTest = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testDatabaseAccess = async () => {
      try {
        setLoading(true);
        console.log("Testing database access...");
        
        // Test 1: Check if we can access the credit_transactions table
        console.log("Test 1: Accessing credit_transactions table...");
        const { data: transactions, error: transactionsError } = await supabase
          .from('credit_transactions')
          .select('count()');

        console.log("Transactions count result:", { transactions, transactionsError });

        // Test 2: Check if we can access the farmers table
        console.log("Test 2: Accessing farmers table...");
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select('count()');

        console.log("Farmers count result:", { farmers, farmersError });

        // Test 3: Check current user
        console.log("Test 3: Getting current user...");
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Current user:", user);

        // Test 4: Check user role
        console.log("Test 4: Checking user role...");
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user?.id);

        console.log("User roles result:", { userRoles, rolesError });

        setResult({
          transactions: transactionsError ? `Error: ${transactionsError.message}` : transactions,
          farmers: farmersError ? `Error: ${farmersError.message}` : farmers,
          user: user,
          userRoles: rolesError ? `Error: ${rolesError.message}` : userRoles
        });
      } catch (err) {
        console.error("Database test error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    testDatabaseAccess();
  }, []);

  if (loading) {
    return <div>Testing database access...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Database Access Test</h2>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
};

export default DatabaseTest;