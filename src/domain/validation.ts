import { z } from 'zod';

export const locationInputSchema = z.object({
    locationName: z.string().trim().min(1, "Location name is required").max(100, "Location name is too long"),
    city: z.string().trim().min(1, "City is required").max(100, "City name is too long"),
    state: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1, "Country is required").max(100, "Country name is too long")
}).strict();

export const idParamSchema = z.object({
    id: z.uuid("Provided ID must be a valid UUID")
});


