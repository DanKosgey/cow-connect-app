import { supabase } from "./integrations/supabase/client";

async function testDatabaseConnection() {
  console.log("Testing database connection...");
  
  try {
    // Test a simple query to check if we can connect to the database
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
    
    console.log("Database connection test successful!");
    console.log("Sample data:", data);
    return true;
  } catch (error) {
    console.error("Database connection test failed with exception:", error);
    return false;
  }
}

// Run the test
testDatabaseConnection().then(success => {
  if (success) {
    console.log("✅ Database connection is working!");
  } else {
    console.log("❌ Database connection failed!");
  }
});