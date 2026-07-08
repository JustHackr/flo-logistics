import { z } from "zod";

export const optimizeRouteRequestSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(200),
  dryRun: z.boolean().optional().default(true),
  maxStopsPerRoute: z
    .number()
    .int()
    .positive()
    .optional()
    .default(15),
  routeStartAt: z.coerce.date().optional(),
});

export type OptimizeRouteRequest = z.infer<
  typeof optimizeRouteRequestSchema
>;

