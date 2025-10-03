import { z } from 'zod';

export const farmerRegistrationSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name should only contain letters'),

  phone_number: z.string()
    .regex(/^\+254[17]\d{8}$/, 'Invalid Kenyan phone number. Format: +254712345678'),

  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  physical_address: z.string()
    .max(1000, 'Address is too long')
    .optional()
    .or(z.literal('')),

  gps_latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),

  gps_longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),

  bank_account_name: z.string()
    .max(255, 'Account name is too long')
    .optional()
    .or(z.literal('')),

  bank_account_number: z.string()
    .max(50, 'Account number is too long')
    .optional()
    .or(z.literal('')),

  bank_name: z.string()
    .max(100, 'Bank name is too long')
    .optional()
    .or(z.literal('')),

  bank_branch: z.string()
    .max(100, 'Branch name is too long')
    .optional()
    .or(z.literal('')),
}).refine((data) => {
  // If any bank field is filled, all bank fields are required
  const bankFields = [
    data.bank_account_name,
    data.bank_account_number,
    data.bank_name,
    data.bank_branch,
  ];
  const hasAnyBankInfo = bankFields.some(field => field && field.length > 0);
  const hasAllBankInfo = bankFields.every(field => field && field.length > 0);
  
  if (hasAnyBankInfo && !hasAllBankInfo) {
    return false;
  }
  return true;
}, {
  message: "All bank details are required if any bank information is provided",
  path: ["bank_account_name"], // This will show the error under the account name field
});

export type FarmerRegistrationInput = z.infer<typeof farmerRegistrationSchema>;
