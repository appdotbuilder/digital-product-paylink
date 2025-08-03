
import { db } from '../db';
import { paymentLinksTable, productsTable } from '../db/schema';
import { type PaymentLinkWithProduct } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPendingPayments(): Promise<PaymentLinkWithProduct[]> {
  try {
    const results = await db.select()
      .from(paymentLinksTable)
      .innerJoin(productsTable, eq(paymentLinksTable.product_id, productsTable.id))
      .where(eq(paymentLinksTable.status, 'uploaded'))
      .orderBy(desc(paymentLinksTable.created_at))
      .execute();

    return results.map(result => ({
      // Payment link data
      id: result.payment_links.id,
      product_id: result.payment_links.product_id,
      unique_code: result.payment_links.unique_code,
      buyer_name: result.payment_links.buyer_name,
      buyer_email: result.payment_links.buyer_email,
      status: result.payment_links.status,
      payment_proof_url: result.payment_links.payment_proof_url,
      payment_instructions: result.payment_links.payment_instructions,
      expires_at: result.payment_links.expires_at,
      confirmed_at: result.payment_links.confirmed_at,
      download_token: result.payment_links.download_token,
      created_at: result.payment_links.created_at,
      updated_at: result.payment_links.updated_at,
      // Product data
      product: {
        id: result.products.id,
        name: result.products.name,
        description: result.products.description,
        price: parseFloat(result.products.price), // Convert numeric to number
        file_url: result.products.file_url,
        file_name: result.products.file_name,
        is_active: result.products.is_active,
        created_at: result.products.created_at,
        updated_at: result.products.updated_at
      }
    }));
  } catch (error) {
    console.error('Get pending payments failed:', error);
    throw error;
  }
}
