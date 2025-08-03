
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { desc, asc } from 'drizzle-orm';

export async function getProducts(): Promise<Product[]> {
  try {
    // Fetch all products, ordered by active status first, then by creation date (newest first)
    const results = await db.select()
      .from(productsTable)
      .orderBy(desc(productsTable.is_active), desc(productsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}
