import React, { useEffect, useState } from 'react';

const SupabaseDiagnostics: React.FC = () => {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [isProduction, setIsProduction] = useState<boolean>(false);

  useEffect(() => {
    // Check environment variables
    const vars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'NOT SET',
      NODE_ENV: import.meta.env.MODE || 'unknown',
      PROD: import.meta.env.PROD ? 'true' : 'false',
      DEV: import.meta.env.DEV ? 'true' : 'false'
    };
    
    setEnvVars(vars);
    setIsProduction(import.meta.env.PROD || false);
  }, []);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Supabase Environment Diagnostics</h3>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Environment:</span> {isProduction ? 'Production' : 'Development'}
        </div>
        
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="font-medium">{key}:</span>
            <span className={`font-mono text-sm ${value === 'NOT SET' ? 'text-red-600' : 'text-gray-800'}`}>
              {key.includes('KEY') ? '********' : value}
            </span>
          </div>
        ))}
      </div>
      
      {envVars.VITE_SUPABASE_URL === 'NOT SET' && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
          <strong className="text-red-800">ERROR:</strong> VITE_SUPABASE_URL is not set! 
          This will cause the app to fail connecting to Supabase.
        </div>
      )}
      
      {envVars.VITE_SUPABASE_PUBLISHABLE_KEY === 'NOT SET' && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
          <strong className="text-red-800">ERROR:</strong> VITE_SUPABASE_PUBLISHABLE_KEY is not set! 
          This will cause the app to fail connecting to Supabase.
        </div>
      )}
      
      {envVars.VITE_SUPABASE_URL?.includes('localhost') && !envVars.DEV?.includes('true') && (
        <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded">
          <strong className="text-orange-800">WARNING:</strong> Using localhost Supabase URL in what appears to be a production environment.
          This will not work in production deployments.
        </div>
      )}
    </div>
  );
};

export default SupabaseDiagnostics;