
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type GeneratePaymentLinkInput, type PaymentLink } from '../schema';
import { eq } from 'drizzle-orm';

export const generatePaymentLink = async (input: GeneratePaymentLinkInput): Promise<PaymentLink> => {
  try {
    // First, verify that the product exists and is active
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error('Product not found');
    }

    if (!product[0].is_active) {
      throw new Error('Product is not active');
    }

    // Generate unique code (8 characters, uppercase alphanumeric)
    const uniqueCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + input.expires_in_hours * 60 * 60 * 1000);

    // Insert payment link record
    const result = await db.insert(paymentLinksTable)
      .values({
        product_id: input.product_id,
        unique_code: uniqueCode,
        buyer_name: input.buyer_name || null,
        buyer_email: input.buyer_email || null,
        status: 'pending',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: expiresAt
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Payment link generation failed:', error);
    throw error;
  }
};
