
import { db } from '../db';
import { paymentLinksTable } from '../db/schema';
import { type UploadPaymentProofInput, type PaymentLink } from '../schema';
import { eq } from 'drizzle-orm';

export const uploadPaymentProof = async (input: UploadPaymentProofInput): Promise<PaymentLink> => {
  try {
    // First, find the payment link by unique code
    const existingPaymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.unique_code, input.payment_link_code))
      .execute();

    if (existingPaymentLinks.length === 0) {
      throw new Error('Payment link not found');
    }

    const existingPaymentLink = existingPaymentLinks[0];

    // Validate that payment link is in 'pending' status
    if (existingPaymentLink.status !== 'pending') {
      throw new Error('Payment link is not in pending status');
    }

    // Update payment link with buyer info and payment proof
    const result = await db.update(paymentLinksTable)
      .set({
        buyer_name: input.buyer_name,
        buyer_email: input.buyer_email,
        payment_proof_url: input.payment_proof_url,
        status: 'uploaded',
        updated_at: new Date()
      })
      .where(eq(paymentLinksTable.unique_code, input.payment_link_code))
      .returning()
      .execute();

    const updatedPaymentLink = result[0];
    return updatedPaymentLink;
  } catch (error) {
    console.error('Upload payment proof failed:', error);
    throw error;
  }
};
