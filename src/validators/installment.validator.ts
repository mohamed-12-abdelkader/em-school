import { z } from 'zod/v4';

/** Optional cash amount. Omitted = remaining balance (full pay). Partial is allowed. */
export const payInstallmentSchema = z.preprocess(
  (v) => (v && typeof v === 'object' ? v : {}),
  z.object({
    amount: z.coerce.number().positive().finite().optional(),
  }),
);
