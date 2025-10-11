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
}).refine(() => {
  // All validation passes since bank fields are removed
  return true;
}, {
  message: "Validation passed",
  path: ["full_name"],
});

export type FarmerRegistrationInput = z.infer<typeof farmerRegistrationSchema>;
