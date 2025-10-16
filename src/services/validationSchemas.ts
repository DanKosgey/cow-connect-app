import { z } from 'zod';

// Common validation patterns
const KENYAN_PHONE_REGEX = /^\+254[1-9]\d{8}$/;
const NATIONAL_ID_REGEX = /^[A-Z0-9]{6,8}$/i;

// Shared type utilities
export type ValidationResult<T> = {
  isValid: boolean;
  data?: T;
  errors?: string[];
  error?: string;
};

// Base schemas
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .transform(email => email.toLowerCase().trim());

export const phoneSchema = z.string()
  .regex(KENYAN_PHONE_REGEX, 'Must be a valid Kenyan phone number (+254...)')
  .transform(phone => phone.trim());

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must include uppercase letter')
  .regex(/[a-z]/, 'Must include lowercase letter')
  .regex(/[0-9]/, 'Must include number')
  .regex(/[^A-Za-z0-9]/, 'Must include special character');

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .transform(name => name.trim())
  .refine(name => /^[a-zA-Z\s'-]+$/.test(name), {
    message: 'Name can only contain letters, spaces, hyphens and apostrophes'
  });

export const idNumberSchema = z.string()
  .regex(NATIONAL_ID_REGEX, 'Invalid ID number format')
  .transform(id => id.toUpperCase().trim());

// Document schemas
export const documentSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, {
      message: 'File must be less than 5MB'
    })
    .refine(file => ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type), {
      message: 'File must be JPEG or PNG'
    })
});

// Farm details schemas
export const breedSchema = z.object({
  breedName: z.string().min(1, 'Breed name is required'),
  count: z.number().min(1, 'Must have at least 1 cow')
});

export const farmDetailsSchema = z.object({
  numberOfCows: z.number()
    .min(1, 'Must have at least 1 cow')
    .max(10000, 'Number seems unusually high, please verify'),
  
  cowBreeds: z.array(breedSchema)
    .min(1, 'At least one breed is required')
    .refine(breeds => {
      const totalCows = breeds.reduce((sum, breed) => sum + breed.count, 0);
      return totalCows > 0;
    }, {
      message: 'Total number of cows must be greater than 0'
    }),
  
  breedingMethod: z.enum(['male_bull', 'artificial_insemination', 'both'], {
    errorMap: () => ({ message: 'Invalid breeding method selected' })
  }),
  
  feedingType: z.enum(['zero_grazing', 'field_grazing', 'mixed'], {
    errorMap: () => ({ message: 'Invalid feeding type selected' })
  }),
  
  farmLocation: z.string()
    .min(3, 'Farm location is required')
    .max(200, 'Location description too long')
});

// Complete registration data schema
export const farmerRegistrationSchema = z.object({
  // Personal Information
  email: emailSchema,
  phone: phoneSchema,
  fullName: nameSchema,
  age: z.number()
    .min(18, 'Must be at least 18 years old')
    .max(100, 'Age seems incorrect, please verify'),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Invalid gender selected' })
  }),
  idNumber: idNumberSchema,
  
  // Authentication
  password: passwordSchema,
  confirmPassword: z.string(),
  
  // Farm Details
  farmDetails: farmDetailsSchema,
  
  // KYC Documents
  documents: z.object({
    idFront: documentSchema,
    idBack: documentSchema,
    selfie: documentSchema
  }).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Helper function to validate data against a schema
export async function validateData<T extends z.ZodType<any, any>>(
  schema: T,
  data: unknown,
  options?: { partial?: boolean }
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const validatedData = options?.partial
      ? await schema.partial().parseAsync(data)
      : await schema.parseAsync(data);
    
    return {
      isValid: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return {
        isValid: false,
        errors,
        error: errors[0]
      };
    }
    return {
      isValid: false,
      error: 'Validation failed'
    };
  }
}