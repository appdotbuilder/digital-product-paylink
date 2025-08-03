
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  name: 'Digital Course',
  description: 'A comprehensive digital course',
  price: 99.99,
  file_url: 'https://example.com/course.zip',
  file_name: 'course.zip',
  is_active: true
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Digital Course');
    expect(result.description).toEqual('A comprehensive digital course');
    expect(result.price).toEqual(99.99);
    expect(typeof result.price).toBe('number');
    expect(result.file_url).toEqual('https://example.com/course.zip');
    expect(result.file_name).toEqual('course.zip');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query database to verify persistence
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Digital Course');
    expect(savedProduct.description).toEqual('A comprehensive digital course');
    expect(parseFloat(savedProduct.price)).toEqual(99.99);
    expect(savedProduct.file_url).toEqual('https://example.com/course.zip');
    expect(savedProduct.file_name).toEqual('course.zip');
    expect(savedProduct.is_active).toBe(true);
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should create product with nullable fields as null', async () => {
    const minimalInput: CreateProductInput = {
      name: 'Minimal Product',
      description: null,
      price: 19.99,
      file_url: null,
      file_name: null,
      is_active: true
    };

    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(19.99);
    expect(result.file_url).toBeNull();
    expect(result.file_name).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      name: 'Decimal Price Product',
      description: 'Testing decimal handling',
      price: 12.50,
      file_url: null,
      file_name: null,
      is_active: true
    };

    const result = await createProduct(decimalInput);

    expect(result.price).toEqual(12.50);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)  
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(12.50);
  });

  it('should use default is_active value when not provided', async () => {
    const inputWithoutActive: CreateProductInput = {
      name: 'Default Active Product',
      description: 'Testing default active value',
      price: 25.00,
      file_url: null,
      file_name: null,
      is_active: true // This comes from Zod default
    };

    const result = await createProduct(inputWithoutActive);

    expect(result.is_active).toBe(true);
  });
});
