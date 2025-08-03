
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { downloadProduct } from '../handlers/download_product';

describe('downloadProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return file details for valid confirmed payment token', async () => {
    // Create a test product with file
    const product = await db.insert(productsTable)
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

    // Create a confirmed payment link with download token
    await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'TEST123',
        status: 'confirmed',
        payment_instructions: 'Test instructions',
        download_token: 'valid-download-token'
      })
      .execute();

    const result = await downloadProduct('valid-download-token');

    expect(result).not.toBeNull();
    expect(result!.file_url).toBe('https://example.com/file.pdf');
    expect(result!.file_name).toBe('test-file.pdf');
  });

  it('should return null for invalid token', async () => {
    const result = await downloadProduct('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for non-confirmed payment', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
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

    // Create a pending payment link
    await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'TEST123',
        status: 'pending',
        payment_instructions: 'Test instructions',
        download_token: 'pending-token'
      })
      .execute();

    const result = await downloadProduct('pending-token');
    expect(result).toBeNull();
  });

  it('should return null for product without file', async () => {
    // Create a test product without file
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        file_url: null,
        file_name: null,
        is_active: true
      })
      .returning()
      .execute();

    // Create a confirmed payment link
    await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'TEST123',
        status: 'confirmed',
        payment_instructions: 'Test instructions',
        download_token: 'no-file-token'
      })
      .execute();

    const result = await downloadProduct('no-file-token');
    expect(result).toBeNull();
  });

  it('should return null for expired payment', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
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

    // Create an expired payment link
    await db.insert(paymentLinksTable)
      .values({
        product_id: product[0].id,
        unique_code: 'TEST123',
        status: 'expired',
        payment_instructions: 'Test instructions',
        download_token: 'expired-token'
      })
      .execute();

    const result = await downloadProduct('expired-token');
    expect(result).toBeNull();
  });
});
