
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProductById } from '../handlers/get_product_by_id';

// Test input for creating a product
const testProductInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  price: 29.99,
  file_url: 'https://example.com/file.pdf',
  file_name: 'test-file.pdf',
  is_active: true
};

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return product when found', async () => {
    // Create test product first
    const insertResult = await db.insert(productsTable)
      .values({
        name: testProductInput.name,
        description: testProductInput.description,
        price: testProductInput.price.toString(),
        file_url: testProductInput.file_url,
        file_name: testProductInput.file_name,
        is_active: testProductInput.is_active
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Test retrieval
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.description).toEqual(testProductInput.description);
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toBe('number');
    expect(result!.file_url).toEqual(testProductInput.file_url);
    expect(result!.file_name).toEqual(testProductInput.file_name);
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when product not found', async () => {
    const result = await getProductById(999);
    expect(result).toBeNull();
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create product with decimal price
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Price Test Product',
        description: 'Testing price conversion',
        price: '199.95', // Insert as string
        file_url: null,
        file_name: null,
        is_active: true
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Retrieve and verify numeric conversion
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(199.95);
    expect(typeof result!.price).toBe('number');
  });

  it('should handle products with null optional fields', async () => {
    // Create product with null optional fields
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        description: null,
        price: '10.00',
        file_url: null,
        file_name: null,
        is_active: false
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Test retrieval
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Product');
    expect(result!.description).toBeNull();
    expect(result!.file_url).toBeNull();
    expect(result!.file_name).toBeNull();
    expect(result!.is_active).toBe(false);
    expect(result!.price).toEqual(10.00);
    expect(typeof result!.price).toBe('number');
  });
});
