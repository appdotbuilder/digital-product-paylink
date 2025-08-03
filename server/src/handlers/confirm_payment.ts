
import { db } from '../db';
import { paymentLinksTable } from '../db/schema';
import { type ConfirmPaymentInput, type PaymentLink } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function confirmPayment(input: ConfirmPaymentInput): Promise<PaymentLink> {
  try {
    // First, check if payment link exists and is in 'uploaded' status
    const existingPaymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.id, input.payment_link_id))
      .execute();

    if (existingPaymentLinks.length === 0) {
      throw new Error('Payment link not found');
    }

    const paymentLink = existingPaymentLinks[0];

    if (paymentLink.status !== 'uploaded') {
      throw new Error(`Cannot confirm payment with status '${paymentLink.status}'. Payment must be in 'uploaded' status.`);
    }

    // Generate secure download token
    const downloadToken = randomBytes(32).toString('hex');

    // Update payment link to confirmed status
    const result = await db.update(paymentLinksTable)
      .set({
        status: 'confirmed',
        confirmed_at: new Date(),
        download_token: downloadToken,
        updated_at: new Date()
      })
      .where(eq(paymentLinksTable.id, input.payment_link_id))
      .returning()
      .execute();

    const updatedPaymentLink = result[0];

    // Return the updated payment link (no numeric conversions needed for PaymentLink)
    return updatedPaymentLink;
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    throw error;
  }
}
