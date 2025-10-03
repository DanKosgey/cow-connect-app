import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { farmerRegistrationSchema, FarmerRegistrationInput } from '@/schemas/farmerRegistration.schema';

import { useAuth } from '@/contexts/AuthContext';

const FarmerRegistration: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const { session } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FarmerRegistrationInput>({
    resolver: zodResolver(farmerRegistrationSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: FarmerRegistrationInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const response = await fetch('/api/farmers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'Registration failed');
      }
      setSubmitSuccess(result.message);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Register New Farmer
        </h1>
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{submitSuccess}</p>
          </div>
        )}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Personal Information
            </h2>
            {/* Full Name */}
            <div className="mb-4">
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                {...register('full_name')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter full name"
                aria-invalid={errors.full_name ? 'true' : 'false'}
                aria-describedby={errors.full_name ? 'full_name-error' : undefined}
              />
              {errors.full_name && (
                <p id="full_name-error" className="mt-1 text-sm text-red-600">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            {/* Phone Number */}
            <div className="mb-4">
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone_number"
                type="tel"
                {...register('phone_number')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone_number ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="+254712345678"
                aria-invalid={errors.phone_number ? 'true' : 'false'}
                aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
              />
              {errors.phone_number && (
                <p id="phone_number-error" className="mt-1 text-sm text-red-600">
                  {errors.phone_number.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Format: +254712345678 (Kenyan number)
              </p>
            </div>
            {/* Email (Optional) */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (Optional)
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="farmer@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            {/* Physical Address */}
            <div className="mb-4">
              <label htmlFor="physical_address" className="block text-sm font-medium text-gray-700 mb-2">
                Physical Address
              </label>
              <textarea
                id="physical_address"
                {...register('physical_address')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter farm location/address"
              />
            </div>
          </div>
          {/* GPS Coordinates Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Location Coordinates (Optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latitude */}
              <div>
                <label htmlFor="gps_latitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  id="gps_latitude"
                  type="number"
                  step="0.000001"
                  {...register('gps_latitude', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="-1.286389"
                />
              </div>
              {/* Longitude */}
              <div>
                <label htmlFor="gps_longitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  id="gps_longitude"
                  type="number"
                  step="0.000001"
                  {...register('gps_longitude', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="36.817223"
                />
              </div>
            </div>
          </div>
          {/* Bank Details Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Bank Account Details (Optional)
            </h2>
            {/* Bank Account Name */}
            <div className="mb-4">
              <label htmlFor="bank_account_name" className="block text-sm font-medium text-gray-700 mb-2">
                Account Name
              </label>
              <input
                id="bank_account_name"
                type="text"
                {...register('bank_account_name')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Account holder name"
              />
            </div>
            {/* Bank Account Number */}
            <div className="mb-4">
              <label htmlFor="bank_account_number" className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                id="bank_account_number"
                type="text"
                {...register('bank_account_number')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account number"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Name */}
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  id="bank_name"
                  type="text"
                  {...register('bank_name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Equity Bank"
                />
              </div>
              {/* Bank Branch */}
              <div>
                <label htmlFor="bank_branch" className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <input
                  id="bank_branch"
                  type="text"
                  {...register('bank_branch')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Nairobi Branch"
                />
              </div>
            </div>
          </div>
          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`px-8 py-2 text-white rounded-lg transition-colors ${isSubmitting || !isValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register Farmer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmerRegistration;
