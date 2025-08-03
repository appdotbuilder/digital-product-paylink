
import { db } from '../db';
import { paymentLinksTable, productsTable } from '../db/schema';
import { type PaymentLinkWithProduct } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPaymentLink(code: string): Promise<PaymentLinkWithProduct | null> {
  try {
    // Query payment link with product details using join
    const results = await db.select()
      .from(paymentLinksTable)
      .innerJoin(productsTable, eq(paymentLinksTable.product_id, productsTable.id))
      .where(eq(paymentLinksTable.unique_code, code))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    
    // Convert numeric fields back to numbers
    const paymentLink = {
      ...result.payment_links,
      product: {
        ...result.products,
        price: parseFloat(result.products.price)
      }
    };

    return paymentLink;
  } catch (error) {
    console.error('Failed to get payment link:', error);
    throw error;
  }
}
