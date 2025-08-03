
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a product directly in the database
const createTestProduct = async (input: CreateProductInput) => {
  const result = await db.insert(productsTable)
    .values({
      name: input.name,
      description: input.description,
      price: input.price.toString(),
      file_url: input.file_url,
      file_name: input.file_name,
      is_active: input.is_active
    })
    .returning()
    .execute();

  const product = result[0];
  return {
    ...product,
    price: parseFloat(product.price)
  };
};

// Test product input for setup
const testProductInput: CreateProductInput = {
  name: 'Original Product',
  description: 'Original description',
  price: 29.99,
  file_url: 'https://example.com/original.pdf',
  file_name: 'original.pdf',
  is_active: true
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product name', async () => {
    // Create initial product
    const created = await createTestProduct(testProductInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual(created.description); // Unchanged
    expect(result.price).toEqual(created.price); // Unchanged
    expect(result.is_active).toEqual(created.is_active); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true); // Should be newer
  });

  it('should update multiple fields', async () => {
    // Create initial product
    const created = await createTestProduct(testProductInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'New Name',
      description: 'New description',
      price: 39.99,
      is_active: false
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('New Name');
    expect(result.description).toEqual('New description');
    expect(result.price).toEqual(39.99);
    expect(typeof result.price).toEqual('number'); // Verify numeric conversion
    expect(result.is_active).toEqual(false);
    expect(result.file_url).toEqual(created.file_url); // Unchanged
    expect(result.file_name).toEqual(created.file_name); // Unchanged
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update nullable fields', async () => {
    // Create initial product
    const created = await createTestProduct(testProductInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      description: null,
      file_url: null,
      file_name: null
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.description).toBeNull();
    expect(result.file_url).toBeNull();
    expect(result.file_name).toBeNull();
    expect(result.name).toEqual(created.name); // Unchanged
    expect(result.price).toEqual(created.price); // Unchanged
  });

  it('should save updated product to database', async () => {
    // Create initial product
    const created = await createTestProduct(testProductInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'Database Updated Name',
      price: 49.99
    };

    await updateProduct(updateInput);

    // Verify changes in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, created.id))
      .execute();

    expect(products).toHaveLength(1);
    const dbProduct = products[0];
    expect(dbProduct.name).toEqual('Database Updated Name');
    expect(parseFloat(dbProduct.price)).toEqual(49.99);
    expect(dbProduct.description).toEqual(testProductInput.description); // Unchanged
    expect(dbProduct.updated_at).toBeInstanceOf(Date);
    expect(dbProduct.updated_at > created.updated_at).toBe(true);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 999, // Non-existent ID
      name: 'This should fail'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create initial product
    const created = await createTestProduct(testProductInput);

    // Update only price
    const updateInput: UpdateProductInput = {
      id: created.id,
      price: 99.99
    };

    const result = await updateProduct(updateInput);

    // Only price and updated_at should change
    expect(result.price).toEqual(99.99);
    expect(result.name).toEqual(created.name);
    expect(result.description).toEqual(created.description);
    expect(result.file_url).toEqual(created.file_url);
    expect(result.file_name).toEqual(created.file_name);
    expect(result.is_active).toEqual(created.is_active);
    expect(result.updated_at > created.updated_at).toBe(true);
  });
});
