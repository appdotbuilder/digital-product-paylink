
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { getPendingPayments } from '../handlers/get_pending_payments';

describe('getPendingPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pending payments exist', async () => {
    const result = await getPendingPayments();
    expect(result).toEqual([]);
  });

  it('should return payment links with uploaded status and product details', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link with uploaded status
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'uploaded',
        payment_proof_url: 'https://example.com/proof.jpg',
        payment_instructions: 'Transfer to account 123'
      })
      .execute();

    const result = await getPendingPayments();

    expect(result).toHaveLength(1);
    
    const paymentLink = result[0];
    expect(paymentLink.unique_code).toEqual('TEST123');
    expect(paymentLink.buyer_name).toEqual('John Doe');
    expect(paymentLink.buyer_email).toEqual('john@example.com');
    expect(paymentLink.status).toEqual('uploaded');
    expect(paymentLink.payment_proof_url).toEqual('https://example.com/proof.jpg');
    
    // Verify product details are included
    expect(paymentLink.product).toBeDefined();
    expect(paymentLink.product.name).toEqual('Test Product');
    expect(paymentLink.product.description).toEqual('A test product');
    expect(paymentLink.product.price).toEqual(19.99);
    expect(typeof paymentLink.product.price).toEqual('number');
    expect(paymentLink.product.is_active).toEqual(true);
  });

  it('should only return payment links with uploaded status', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment links with different statuses
    await db.insert(paymentLinksTable)
      .values([
        {
          product_id: product.id,
          unique_code: 'PENDING123',
          status: 'pending',
          payment_instructions: 'Transfer pending'
        },
        {
          product_id: product.id,
          unique_code: 'UPLOADED123',
          status: 'uploaded',
          payment_proof_url: 'https://example.com/proof.jpg',
          payment_instructions: 'Transfer uploaded'
        },
        {
          product_id: product.id,
          unique_code: 'CONFIRMED123',
          status: 'confirmed',
          payment_instructions: 'Transfer confirmed'
        }
      ])
      .execute();

    const result = await getPendingPayments();

    expect(result).toHaveLength(1);
    expect(result[0].unique_code).toEqual('UPLOADED123');
    expect(result[0].status).toEqual('uploaded');
  });

  it('should return results ordered by creation date descending', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '39.99',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create multiple payment links with uploaded status
    await db.insert(paymentLinksTable)
      .values([
        {
          product_id: product.id,
          unique_code: 'FIRST123',
          status: 'uploaded',
          payment_instructions: 'First payment'
        },
        {
          product_id: product.id,
          unique_code: 'SECOND123',
          status: 'uploaded',
          payment_instructions: 'Second payment'
        }
      ])
      .execute();

    const result = await getPendingPayments();

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date descending (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    
    // Verify both have correct status and product details
    result.forEach(paymentLink => {
      expect(paymentLink.status).toEqual('uploaded');
      expect(paymentLink.product).toBeDefined();
      expect(paymentLink.product.name).toEqual('Test Product');
      expect(typeof paymentLink.product.price).toEqual('number');
    });
  });
});
