
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

const testProduct: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing deletion',
  price: 29.99,
  file_url: 'https://example.com/file.pdf',
  file_name: 'test-file.pdf',
  is_active: true
};

const createTestProduct = async () => {
  const result = await db.insert(productsTable)
    .values({
      name: testProduct.name,
      description: testProduct.description,
      price: testProduct.price.toString(),
      file_url: testProduct.file_url,
      file_name: testProduct.file_name,
      is_active: testProduct.is_active
    })
    .returning()
    .execute();
  
  return result[0];
};

const createTestPaymentLink = async (productId: number, status: 'pending' | 'uploaded' | 'confirmed' | 'expired' = 'pending') => {
  const result = await db.insert(paymentLinksTable)
    .values({
      product_id: productId,
      unique_code: `TEST_${Date.now()}_${Math.random()}`,
      status: status,
      payment_instructions: 'Test payment instructions',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing product with no payment links', async () => {
    const product = await createTestProduct();
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(true);
    
    // Verify product is deleted from database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(0);
  });

  it('should return false for non-existent product', async () => {
    const result = await deleteProduct(99999);
    
    expect(result).toBe(false);
  });

  it('should delete product with only expired payment links', async () => {
    const product = await createTestProduct();
    const paymentLink = await createTestPaymentLink(product.id, 'expired');
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(true);
    
    // Verify product is deleted from database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(0);

    // Verify expired payment link is also deleted
    const paymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.id, paymentLink.id))
      .execute();
    
    expect(paymentLinks).toHaveLength(0);
  });

  it('should not delete product with pending payment links', async () => {
    const product = await createTestProduct();
    await createTestPaymentLink(product.id, 'pending');
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(false);
    
    // Verify product still exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
  });

  it('should not delete product with uploaded payment links', async () => {
    const product = await createTestProduct();
    await createTestPaymentLink(product.id, 'uploaded');
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(false);
    
    // Verify product still exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(1);
  });

  it('should not delete product with confirmed payment links', async () => {
    const product = await createTestProduct();
    await createTestPaymentLink(product.id, 'confirmed');
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(false);
    
    // Verify product still exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(1);
  });

  it('should not delete product with mixed active and expired payment links', async () => {
    const product = await createTestProduct();
    await createTestPaymentLink(product.id, 'expired');
    await createTestPaymentLink(product.id, 'pending');
    
    const result = await deleteProduct(product.id);
    
    expect(result).toBe(false);
    
    // Verify product still exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    
    expect(products).toHaveLength(1);

    // Verify both payment links still exist
    const paymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.product_id, product.id))
      .execute();
    
    expect(paymentLinks).toHaveLength(2);
  });
});
