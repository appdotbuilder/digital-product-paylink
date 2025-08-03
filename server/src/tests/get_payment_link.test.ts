
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { getPaymentLink } from '../handlers/get_payment_link';

describe('getPaymentLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return payment link with product details when found', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test-file.pdf',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create test payment link
    const paymentLinkResult = await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'pending',
        payment_instructions: 'Please transfer to account 123-456-789',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      })
      .returning()
      .execute();

    const paymentLink = paymentLinkResult[0];

    // Test the handler
    const result = await getPaymentLink('TEST123');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(paymentLink.id);
    expect(result!.unique_code).toEqual('TEST123');
    expect(result!.buyer_name).toEqual('John Doe');
    expect(result!.buyer_email).toEqual('john@example.com');
    expect(result!.status).toEqual('pending');
    expect(result!.payment_instructions).toEqual('Please transfer to account 123-456-789');
    expect(result!.product_id).toEqual(product.id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.expires_at).toBeInstanceOf(Date);

    // Verify product details are included
    expect(result!.product).toBeDefined();
    expect(result!.product.id).toEqual(product.id);
    expect(result!.product.name).toEqual('Test Product');
    expect(result!.product.description).toEqual('A test product');
    expect(result!.product.price).toEqual(29.99);
    expect(typeof result!.product.price).toEqual('number');
    expect(result!.product.file_url).toEqual('https://example.com/file.pdf');
    expect(result!.product.file_name).toEqual('test-file.pdf');
    expect(result!.product.is_active).toEqual(true);
    expect(result!.product.created_at).toBeInstanceOf(Date);
    expect(result!.product.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when payment link not found', async () => {
    const result = await getPaymentLink('NONEXISTENT');

    expect(result).toBeNull();
  });

  it('should handle different payment statuses', async () => {
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

    // Create payment link with 'uploaded' status
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'UPLOADED123',
        buyer_name: 'Jane Doe',
        buyer_email: 'jane@example.com',
        status: 'uploaded',
        payment_proof_url: 'https://example.com/proof.jpg',
        payment_instructions: 'Payment proof uploaded',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .returning()
      .execute();

    const result = await getPaymentLink('UPLOADED123');

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('uploaded');
    expect(result!.payment_proof_url).toEqual('https://example.com/proof.jpg');
    expect(result!.buyer_name).toEqual('Jane Doe');
    expect(result!.buyer_email).toEqual('jane@example.com');
  });

  it('should handle expired payment links', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '15.50',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create expired payment link
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'EXPIRED123',
        status: 'expired',
        payment_instructions: 'Transfer to account 123',
        expires_at: pastDate
      })
      .returning()
      .execute();

    const result = await getPaymentLink('EXPIRED123');

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('expired');
    expect(result!.expires_at).toBeInstanceOf(Date);
    expect(result!.expires_at!.getTime()).toBeLessThan(Date.now());
  });
});
