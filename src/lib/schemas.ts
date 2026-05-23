import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  warehouseId: z.string().cuid("Invalid warehouse ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
});

export const ConfirmReservationSchema = z.object({
  reservationId: z.string().cuid("Invalid reservation ID"),
});

export const CancelReservationSchema = z.object({
  reservationId: z.string().cuid("Invalid reservation ID"),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type ConfirmReservationInput = z.infer<typeof ConfirmReservationSchema>;
export type CancelReservationInput = z.infer<typeof CancelReservationSchema>;
