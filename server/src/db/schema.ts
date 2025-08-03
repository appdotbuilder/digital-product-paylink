
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for payment status
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'uploaded', 'confirmed', 'expired']);

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  file_url: text('file_url'),
  file_name: text('file_name'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Payment links table
export const paymentLinksTable = pgTable('payment_links', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  unique_code: text('unique_code').notNull().unique(),
  buyer_name: text('buyer_name'),
  buyer_email: text('buyer_email'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  payment_proof_url: text('payment_proof_url'),
  payment_instructions: text('payment_instructions').notNull(),
  expires_at: timestamp('expires_at'),
  confirmed_at: timestamp('confirmed_at'),
  download_token: text('download_token'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Admin users table
export const adminsTable = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  paymentLinks: many(paymentLinksTable)
}));

export const paymentLinksRelations = relations(paymentLinksTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [paymentLinksTable.product_id],
    references: [productsTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  products: productsTable,
  paymentLinks: paymentLinksTable,
  admins: adminsTable
};
