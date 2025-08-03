
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type GeneratePaymentLinkInput, type CreateProductInput } from '../schema';
import { generatePaymentLink } from '../handlers/generate_payment_link';
import { eq } from 'drizzle-orm';

describe('generatePaymentLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProductId: number;

  beforeEach(async () => {
    // Create a test product first
    const productInput: CreateProductInput = {
      name: 'Test Product',
      description: 'A product for testing',
      price: 29.99,
      file_url: 'https://example.com/file.pdf',
      file_name: 'test-file.pdf',
      is_active: true
    };

    const productResult = await db.insert(productsTable)
      .values({
        name: productInput.name,
        description: productInput.description,
        price: productInput.price.toString(),
        file_url: productInput.file_url,
        file_name: productInput.file_name,
        is_active: productInput.is_active
      })
      .returning()
      .execute();

    testProductId = productResult[0].id;
  });

  it('should generate a payment link with minimal input', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: testProductId,
      expires_in_hours: 24
    };

    const result = await generatePaymentLink(input);

    expect(result.id).toBeDefined();
    expect(result.product_id).toEqual(testProductId);
    expect(result.unique_code).toBeDefined();
    expect(typeof result.unique_code).toBe('string');
    expect(result.unique_code.length).toBeGreaterThan(0);
    expect(result.buyer_name).toBeNull();
    expect(result.buyer_email).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.payment_instructions).toEqual('Transfer ke Bank BCA 1234567890 a.n. Toko Digital');
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.confirmed_at).toBeNull();
    expect(result.download_token).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should generate a payment link with buyer information', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: testProductId,
      buyer_name: 'John Doe',
      buyer_email: 'john@example.com',
      expires_in_hours: 48
    };

    const result = await generatePaymentLink(input);

    expect(result.product_id).toEqual(testProductId);
    expect(result.buyer_name).toEqual('John Doe');
    expect(result.buyer_email).toEqual('john@example.com');
    expect(result.unique_code).toBeDefined();
    expect(result.status).toEqual('pending');
  });

  it('should save payment link to database', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: testProductId,
      buyer_name: 'Jane Smith',
      buyer_email: 'jane@example.com',
      expires_in_hours: 12
    };

    const result = await generatePaymentLink(input);

    const paymentLinks = await db.select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.id, result.id))
      .execute();

    expect(paymentLinks).toHaveLength(1);
    expect(paymentLinks[0].product_id).toEqual(testProductId);
    expect(paymentLinks[0].buyer_name).toEqual('Jane Smith');
    expect(paymentLinks[0].buyer_email).toEqual('jane@example.com');
    expect(paymentLinks[0].unique_code).toEqual(result.unique_code);
    expect(paymentLinks[0].status).toEqual('pending');
  });

  it('should set correct expiration time', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: testProductId,
      expires_in_hours: 6
    };

    const beforeGeneration = new Date();
    const result = await generatePaymentLink(input);
    const afterGeneration = new Date();

    expect(result.expires_at).toBeInstanceOf(Date);
    
    // Check that expiration is approximately 6 hours from now
    const expectedExpiry = new Date(beforeGeneration.getTime() + 6 * 60 * 60 * 1000);
    const maxExpectedExpiry = new Date(afterGeneration.getTime() + 6 * 60 * 60 * 1000);
    
    expect(result.expires_at!.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime());
    expect(result.expires_at!.getTime()).toBeLessThanOrEqual(maxExpectedExpiry.getTime());
  });

  it('should generate unique codes', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: testProductId,
      expires_in_hours: 24
    };

    const result1 = await generatePaymentLink(input);
    const result2 = await generatePaymentLink(input);

    expect(result1.unique_code).not.toEqual(result2.unique_code);
    expect(result1.unique_code.length).toBeGreaterThan(0);
    expect(result2.unique_code.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent product', async () => {
    const input: GeneratePaymentLinkInput = {
      product_id: 99999,
      expires_in_hours: 24
    };

    expect(generatePaymentLink(input)).rejects.toThrow(/product not found/i);
  });

  it('should throw error for inactive product', async () => {
    // Create an inactive product
    const inactiveProductResult = await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        description: 'This product is inactive',
        price: '19.99',
        is_active: false
      })
      .returning()
      .execute();

    const input: GeneratePaymentLinkInput = {
      product_id: inactiveProductResult[0].id,
      expires_in_hours: 24
    };

    expect(generatePaymentLink(input)).rejects.toThrow(/product is not active/i);
  });
});
