import { z } from 'zod';

// Collection form validation schema
export const collectionSchema = z.object({
  volume: z.number().min(0.1).max(1000),
  temperature: z.number().min(0).max(50),
  fat_content: z.number().min(0).max(10).optional(),
  protein_content: z.number().min(0).max(10).optional(),
  ph_level: z.number().min(6.0).max(7.5).optional(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  notes: z.string().optional(),
});

export type CollectionFormData = z.infer<typeof collectionSchema>;