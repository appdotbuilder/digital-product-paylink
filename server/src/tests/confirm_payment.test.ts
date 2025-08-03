
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type ConfirmPaymentInput } from '../schema';
import { confirmPayment } from '../handlers/confirm_payment';
import { eq } from 'drizzle-orm';

describe('confirmPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should confirm payment and generate download token', async () => {
    // Create test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test-file.pdf',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link in 'uploaded' status
    const paymentLinkResult = await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'uploaded',
        payment_proof_url: 'https://example.com/proof.jpg',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      })
      .returning()
      .execute();

    const paymentLink = paymentLinkResult[0];

    const input: ConfirmPaymentInput = {
      payment_link_id: paymentLink.id
    };

    const result = await confirmPayment(input);

    // Verify result fields
    expect(result.id).toBe(paymentLink.id);
    expect(result.status).toBe('confirmed');
    expect(result.confirmed_at).toBeInstanceOf(Date);
    expect(result.download_token).toBeDefined();
    expect(result.download_token).not.toBeNull();
    expect(typeof result.download_token).toBe('string');
    expect(result.download_token!.length).toBe(64); // 32 bytes as hex = 64 characters
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify other fields remain unchanged
    expect(result.product_id).toBe(paymentLink.product_id);
    expect(result.unique_code).toBe(paymentLink.unique_code);
    expect(result.buyer_name).toBe(paymentLink.buyer_name);
    expect(result.buyer_email).toBe(paymentLink.buyer_email);
    expect(result.payment_proof_url).toBe(paymentLink.payment_proof_url);
  });

  it('should save confirmed payment to database', async () => {
    // Create test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test-file.pdf',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link in 'uploaded' status
    const paymentLinkResult = await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'uploaded',
        payment_proof_url: 'https://example.com/proof.jpg',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .returning()
      .execute();

    const paymentLink = paymentLinkResult[0];

    const input: ConfirmPaymentInput = {
      payment_link_id: paymentLink.id
    };

    const result = await confirmPayment(input);

    // Query database to verify changes were saved
    const savedPaymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.id, result.id))
      .execute();

    expect(savedPaymentLinks).toHaveLength(1);

    const saved = savedPaymentLinks[0];
    expect(saved.status).toBe('confirmed');
    expect(saved.confirmed_at).toBeInstanceOf(Date);
    expect(saved.download_token).toBeDefined();
    expect(saved.download_token).not.toBeNull();
    expect(saved.download_token!.length).toBe(64);
    expect(saved.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when payment link does not exist', async () => {
    const input: ConfirmPaymentInput = {
      payment_link_id: 999 // Non-existent ID
    };

    await expect(confirmPayment(input)).rejects.toThrow(/payment link not found/i);
  });

  it('should throw error when payment link is not in uploaded status', async () => {
    // Create test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test-file.pdf',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link in 'pending' status (not 'uploaded')
    const paymentLinkResult = await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'pending', // Wrong status
        payment_proof_url: null,
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .returning()
      .execute();

    const paymentLink = paymentLinkResult[0];

    const input: ConfirmPaymentInput = {
      payment_link_id: paymentLink.id
    };

    await expect(confirmPayment(input)).rejects.toThrow(/cannot confirm payment with status 'pending'/i);
  });

  it('should throw error when payment link is already confirmed', async () => {
    // Create test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        file_url: 'https://example.com/file.pdf',
        file_name: 'test-file.pdf',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link already in 'confirmed' status
    const paymentLinkResult = await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123',
        buyer_name: 'John Doe',
        buyer_email: 'john@example.com',
        status: 'confirmed', // Already confirmed
        payment_proof_url: 'https://example.com/proof.jpg',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        confirmed_at: new Date(),
        download_token: 'existing_token'
      })
      .returning()
      .execute();

    const paymentLink = paymentLinkResult[0];

    const input: ConfirmPaymentInput = {
      payment_link_id: paymentLink.id
    };

    await expect(confirmPayment(input)).rejects.toThrow(/cannot confirm payment with status 'confirmed'/i);
  });
});
