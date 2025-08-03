
import { z } from 'zod';

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  file_url: z.string().nullable(),
  file_name: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Payment link schema
export const paymentLinkSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  unique_code: z.string(),
  buyer_name: z.string().nullable(),
  buyer_email: z.string().nullable(),
  status: z.enum(['pending', 'uploaded', 'confirmed', 'expired']),
  payment_proof_url: z.string().nullable(),
  payment_instructions: z.string(),
  expires_at: z.coerce.date().nullable(),
  confirmed_at: z.coerce.date().nullable(),
  download_token: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PaymentLink = z.infer<typeof paymentLinkSchema>;

// Admin user schema
export const adminSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  created_at: z.coerce.date()
});

export type Admin = z.infer<typeof adminSchema>;

// Input schemas for creating products
export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  file_url: z.string().nullable(),
  file_name: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Input schema for generating payment link
export const generatePaymentLinkInputSchema = z.object({
  product_id: z.number(),
  buyer_name: z.string().optional(),
  buyer_email: z.string().email().optional(),
  expires_in_hours: z.number().positive().default(24)
});

export type GeneratePaymentLinkInput = z.infer<typeof generatePaymentLinkInputSchema>;

// Input schema for uploading payment proof
export const uploadPaymentProofInputSchema = z.object({
  payment_link_code: z.string(),
  buyer_name: z.string().min(1),
  buyer_email: z.string().email(),
  payment_proof_url: z.string().url()
});

export type UploadPaymentProofInput = z.infer<typeof uploadPaymentProofInputSchema>;

// Input schema for confirming payment
export const confirmPaymentInputSchema = z.object({
  payment_link_id: z.number()
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentInputSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  total_products: z.number(),
  total_sales: z.number(),
  pending_payments: z.number(),
  total_revenue: z.number(),
  recent_payments: z.array(paymentLinkSchema)
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Payment link with product details
export const paymentLinkWithProductSchema = paymentLinkSchema.extend({
  product: productSchema
});

export type PaymentLinkWithProduct = z.infer<typeof paymentLinkWithProductSchema>;
