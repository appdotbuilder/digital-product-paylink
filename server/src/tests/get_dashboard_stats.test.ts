
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no data exists', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_products).toEqual(0);
    expect(stats.total_sales).toEqual(0);
    expect(stats.pending_payments).toEqual(0);
    expect(stats.total_revenue).toEqual(0);
    expect(stats.recent_payments).toHaveLength(0);
  });

  it('should calculate correct stats with sample data', async () => {
    // Create test products
    const product1 = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'Test product 1',
        price: '29.99',
        is_active: true
      })
      .returning()
      .execute();

    const product2 = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Test product 2',
        price: '49.99',
        is_active: true
      })
      .returning()
      .execute();

    // Create inactive product (should not be counted)
    await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        description: 'Inactive test product',
        price: '19.99',
        is_active: false
      })
      .returning()
      .execute();

    // Create payment links with different statuses
    await db.insert(paymentLinksTable)
      .values({
        product_id: product1[0].id,
        unique_code: 'CODE1',
        status: 'confirmed',
        payment_instructions: 'Test instructions',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com'
      })
      .execute();

    await db.insert(paymentLinksTable)
      .values({
        product_id: product2[0].id,
        unique_code: 'CODE2',
        status: 'confirmed',
        payment_instructions: 'Test instructions',
        buyer_name: 'Jane Smith',
        buyer_email: 'jane@example.com'
      })
      .execute();

    await db.insert(paymentLinksTable)
      .values({
        product_id: product1[0].id,
        unique_code: 'CODE3',
        status: 'uploaded',
        payment_instructions: 'Test instructions',
        buyer_name: 'Bob Wilson',
        buyer_email: 'bob@example.com'
      })
      .execute();

    await db.insert(paymentLinksTable)
      .values({
        product_id: product2[0].id,
        unique_code: 'CODE4',
        status: 'pending',
        payment_instructions: 'Test instructions'
      })
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_products).toEqual(2); // Only active products
    expect(stats.total_sales).toEqual(2); // Only confirmed payments
    expect(stats.pending_payments).toEqual(1); // Only uploaded status
    expect(stats.total_revenue).toEqual(79.98); // 29.99 + 49.99 from confirmed sales
    expect(stats.recent_payments).toHaveLength(4);
  });

  it('should return recent payments in descending order by creation date', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test product',
        price: '29.99',
        is_active: true
      })
      .returning()
      .execute();

    // Create multiple payment links
    const payment1 = await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'FIRST',
        status: 'pending',
        payment_instructions: 'Test instructions'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const payment2 = await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'SECOND',
        status: 'confirmed',
        payment_instructions: 'Test instructions'
      })
      .returning()
      .execute();

    const stats = await getDashboardStats();

    expect(stats.recent_payments).toHaveLength(2);
    // Most recent should be first
    expect(stats.recent_payments[0].unique_code).toEqual('SECOND');
    expect(stats.recent_payments[1].unique_code).toEqual('FIRST');
    expect(stats.recent_payments[0].created_at >= stats.recent_payments[1].created_at).toBe(true);
  });

  it('should limit recent payments to 10 entries', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test product',
        price: '29.99',
        is_active: true
      })
      .returning()
      .execute();

    // Create 12 payment links
    for (let i = 1; i <= 12; i++) {
      await db.insert(paymentLinksTable)
        .values({
          product_id: product[0].id,
          unique_code: `CODE${i}`,
          status: 'pending',
          payment_instructions: 'Test instructions'
        })
        .execute();
    }

    const stats = await getDashboardStats();

    expect(stats.recent_payments).toHaveLength(10);
  });
});
