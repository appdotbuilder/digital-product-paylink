
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteProduct(id: number): Promise<boolean> {
  try {
    // Check if product exists
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (existingProducts.length === 0) {
      return false; // Product doesn't exist
    }

    // Check if product has any active payment links (pending, uploaded, or confirmed)
    const activePaymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.product_id, id))
      .execute();

    // Filter out expired payment links to check if there are any active ones
    const nonExpiredLinks = activePaymentLinks.filter(link => link.status !== 'expired');
    
    if (nonExpiredLinks.length > 0) {
      return false; // Cannot delete product with active payment links
    }

    // Delete any expired payment links first to avoid foreign key constraint violation
    await db.delete(paymentLinksTable)
      .where(
        and(
          eq(paymentLinksTable.product_id, id),
          eq(paymentLinksTable.status, 'expired')
        )
      )
      .execute();

    // Now delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return true; // Successfully deleted
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}
