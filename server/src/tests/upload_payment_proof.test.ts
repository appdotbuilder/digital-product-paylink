
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type UploadPaymentProofInput } from '../schema';
import { uploadPaymentProof } from '../handlers/upload_payment_proof';
import { eq } from 'drizzle-orm';

// Test input for uploading payment proof
const testInput: UploadPaymentProofInput = {
  payment_link_code: 'TEST123456',
  buyer_name: 'John Doe',
  buyer_email: 'john.doe@example.com',
  payment_proof_url: 'https://example.com/payment-proof.jpg'
};

describe('uploadPaymentProof', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload payment proof successfully', async () => {
    // Create prerequisite product first
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

    // Create payment link in pending status
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123456',
        status: 'pending',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      })
      .execute();

    const result = await uploadPaymentProof(testInput);

    // Verify updated fields
    expect(result.buyer_name).toEqual('John Doe');
    expect(result.buyer_email).toEqual('john.doe@example.com');
    expect(result.payment_proof_url).toEqual('https://example.com/payment-proof.jpg');
    expect(result.status).toEqual('uploaded');
    expect(result.unique_code).toEqual('TEST123456');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated payment link to database', async () => {
    // Create prerequisite product first
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

    // Create payment link in pending status
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123456',
        status: 'pending',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital'
      })
      .execute();

    await uploadPaymentProof(testInput);

    // Query database to verify changes were saved
    const paymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.unique_code, 'TEST123456'))
      .execute();

    expect(paymentLinks).toHaveLength(1);
    const paymentLink = paymentLinks[0];
    expect(paymentLink.buyer_name).toEqual('John Doe');
    expect(paymentLink.buyer_email).toEqual('john.doe@example.com');
    expect(paymentLink.payment_proof_url).toEqual('https://example.com/payment-proof.jpg');
    expect(paymentLink.status).toEqual('uploaded');
    expect(paymentLink.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when payment link not found', async () => {
    const invalidInput: UploadPaymentProofInput = {
      ...testInput,
      payment_link_code: 'NONEXISTENT'
    };

    expect(uploadPaymentProof(invalidInput)).rejects.toThrow(/payment link not found/i);
  });

  it('should throw error when payment link is not in pending status', async () => {
    // Create prerequisite product first
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

    // Create payment link in 'uploaded' status (not pending)
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123456',
        status: 'uploaded',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        buyer_name: 'Previous Buyer',
        buyer_email: 'previous@example.com',
        payment_proof_url: 'https://example.com/old-proof.jpg'
      })
      .execute();

    expect(uploadPaymentProof(testInput)).rejects.toThrow(/not in pending status/i);
  });

  it('should handle confirmed status payment link', async () => {
    // Create prerequisite product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '49.99',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create payment link in 'confirmed' status
    await db.insert(paymentLinksTable)
      .values({
        product_id: product.id,
        unique_code: 'TEST123456',
        status: 'confirmed',
        payment_instructions: 'Transfer ke Bank BCA 1234567890 a.n. Toko Digital',
        confirmed_at: new Date(),
        download_token: 'token123'
      })
      .execute();

    expect(uploadPaymentProof(testInput)).rejects.toThrow(/not in pending status/i);
  });
});
