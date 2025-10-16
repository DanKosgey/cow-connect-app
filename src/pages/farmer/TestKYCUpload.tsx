import React from 'react';
import { useNavigate } from 'react-router-dom';

const TestKYCUpload = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test KYC Upload Navigation</h1>
      <button 
        onClick={() => navigate('/farmer/kyc-upload')}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Go to KYC Upload Page
      </button>
    </div>
  );
};

export default TestKYCUpload;