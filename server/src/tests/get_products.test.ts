
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products with correct field types', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '19.99',
          file_url: 'http://example.com/file1.pdf',
          file_name: 'file1.pdf',
          is_active: true
        },
        {
          name: 'Product 2', 
          description: null,
          price: '29.99',
          file_url: null,
          file_name: null,
          is_active: false
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify field types and values
    const product1 = result[0];
    expect(product1.name).toEqual('Product 1');
    expect(product1.description).toEqual('Description 1');
    expect(product1.price).toEqual(19.99);
    expect(typeof product1.price).toBe('number');
    expect(product1.file_url).toEqual('http://example.com/file1.pdf');
    expect(product1.file_name).toEqual('file1.pdf');
    expect(product1.is_active).toBe(true);
    expect(product1.id).toBeDefined();
    expect(product1.created_at).toBeInstanceOf(Date);
    expect(product1.updated_at).toBeInstanceOf(Date);

    const product2 = result[1];
    expect(product2.name).toEqual('Product 2');
    expect(product2.description).toBeNull();
    expect(product2.price).toEqual(29.99);
    expect(typeof product2.price).toBe('number');
    expect(product2.file_url).toBeNull();
    expect(product2.file_name).toBeNull();
    expect(product2.is_active).toBe(false);
  });

  it('should return products ordered by active status first, then by creation date', async () => {
    // Create products with different active status and creation times
    const firstProduct = await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        description: 'Should appear last',
        price: '10.00',
        is_active: false
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondProduct = await db.insert(productsTable)
      .values({
        name: 'Active Product 1',
        description: 'Should appear second',
        price: '20.00',
        is_active: true
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdProduct = await db.insert(productsTable)
      .values({
        name: 'Active Product 2',
        description: 'Should appear first (newest active)',
        price: '30.00',
        is_active: true
      })
      .returning()
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);

    // Active products should come first, ordered by creation date (newest first)
    expect(result[0].name).toEqual('Active Product 2');
    expect(result[0].is_active).toBe(true);
    
    expect(result[1].name).toEqual('Active Product 1');
    expect(result[1].is_active).toBe(true);

    // Inactive products should come last
    expect(result[2].name).toEqual('Inactive Product');
    expect(result[2].is_active).toBe(false);

    // Verify creation order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle products with various price formats', async () => {
    // Create products with different price values
    await db.insert(productsTable)
      .values([
        {
          name: 'Free Product',
          description: 'Zero price',
          price: '0.00',
          is_active: true
        },
        {
          name: 'Expensive Product',
          description: 'High price',
          price: '999.99',
          is_active: true
        },
        {
          name: 'Rounded Product',
          description: 'Price with rounding (12.34 stored as precision 10, scale 2)',
          price: '12.34',
          is_active: true
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    
    // Verify price conversions
    const freeProduct = result.find(p => p.name === 'Free Product');
    expect(freeProduct?.price).toEqual(0);
    expect(typeof freeProduct?.price).toBe('number');

    const expensiveProduct = result.find(p => p.name === 'Expensive Product');
    expect(expensiveProduct?.price).toEqual(999.99);
    expect(typeof expensiveProduct?.price).toBe('number');

    const roundedProduct = result.find(p => p.name === 'Rounded Product');
    expect(roundedProduct?.price).toEqual(12.34);
    expect(typeof roundedProduct?.price).toBe('number');
  });
});
