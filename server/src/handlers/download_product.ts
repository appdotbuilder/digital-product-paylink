
import { db } from '../db';
import { paymentLinksTable, productsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function downloadProduct(token: string): Promise<{ file_url: string; file_name: string } | null> {
  try {
    // Query payment link with product details using the download token
    const results = await db.select({
      file_url: productsTable.file_url,
      file_name: productsTable.file_name,
      status: paymentLinksTable.status,
      download_token: paymentLinksTable.download_token
    })
    .from(paymentLinksTable)
    .innerJoin(productsTable, eq(paymentLinksTable.product_id, productsTable.id))
    .where(
      and(
        eq(paymentLinksTable.download_token, token),
        eq(paymentLinksTable.status, 'confirmed')
      )
    )
    .execute();

    // Return null if no valid payment link found
    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    // Return null if product has no file
    if (!result.file_url || !result.file_name) {
      return null;
    }

    return {
      file_url: result.file_url,
      file_name: result.file_name
    };
  } catch (error) {
    console.error('Download product failed:', error);
    throw error;
  }
}
