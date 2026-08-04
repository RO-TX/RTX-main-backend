import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const orderIdParam = z.object({ orderId: objectId });

export const webhookSecretParam = z.object({ secret: z.string().min(1) });

// Delhivery's push payload — field presence/casing isn't fully documented,
// so everything is optional and unknown extra keys are kept rather than
// stripped (their docs say "consume all scans", not hard-validate them).
export const webhookBodySchema = z
  .object({
    AWB: z.string().optional(),
    Status: z.string().optional(),
    StatusDateTime: z.string().optional(),
    StatusType: z.string().optional(),
    StatusLocation: z.string().optional(),
    Instructions: z.string().optional(),
  })
  .passthrough();
