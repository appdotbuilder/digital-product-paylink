
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  generatePaymentLinkInputSchema,
  uploadPaymentProofInputSchema,
  confirmPaymentInputSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProductById } from './handlers/get_product_by_id';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { generatePaymentLink } from './handlers/generate_payment_link';
import { getPaymentLink } from './handlers/get_payment_link';
import { uploadPaymentProof } from './handlers/upload_payment_proof';
import { confirmPayment } from './handlers/confirm_payment';
import { getPendingPayments } from './handlers/get_pending_payments';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { downloadProduct } from './handlers/download_product';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProductById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),

  // Payment link routes
  generatePaymentLink: publicProcedure
    .input(generatePaymentLinkInputSchema)
    .mutation(({ input }) => generatePaymentLink(input)),

  getPaymentLink: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => getPaymentLink(input.code)),

  uploadPaymentProof: publicProcedure
    .input(uploadPaymentProofInputSchema)
    .mutation(({ input }) => uploadPaymentProof(input)),

  // Admin routes
  confirmPayment: publicProcedure
    .input(confirmPaymentInputSchema)
    .mutation(({ input }) => confirmPayment(input)),

  getPendingPayments: publicProcedure
    .query(() => getPendingPayments()),

  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Download route
  downloadProduct: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => downloadProduct(input.token)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Payment Link TRPC server listening at port: ${port}`);
}

start();
