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

export const routePolylineRequestSchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .min(2)
    .max(50),
  departTime: z.coerce.date().optional(),
});

export type RoutePolylineRequest = z.infer<typeof routePolylineRequestSchema>;

