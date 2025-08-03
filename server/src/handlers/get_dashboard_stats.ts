
import { db } from '../db';
import { productsTable, paymentLinksTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, sum, desc } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total products count
    const totalProductsResult = await db.select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.is_active, true))
      .execute();
    
    const total_products = totalProductsResult[0]?.count || 0;

    // Get total confirmed sales count
    const totalSalesResult = await db.select({ count: count() })
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.status, 'confirmed'))
      .execute();
    
    const total_sales = totalSalesResult[0]?.count || 0;

    // Get pending payments count
    const pendingPaymentsResult = await db.select({ count: count() })
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.status, 'uploaded'))
      .execute();
    
    const pending_payments = pendingPaymentsResult[0]?.count || 0;

    // Calculate total revenue from confirmed payments
    const revenueResult = await db.select({ 
      total_revenue: sum(productsTable.price) 
    })
      .from(paymentLinksTable)
      .innerJoin(productsTable, eq(paymentLinksTable.product_id, productsTable.id))
      .where(eq(paymentLinksTable.status, 'confirmed'))
      .execute();
    
    const total_revenue = revenueResult[0]?.total_revenue 
      ? parseFloat(revenueResult[0].total_revenue) 
      : 0;

    // Get recent payment links (last 10)
    const recentPaymentsResult = await db.select()
      .from(paymentLinksTable)
      .orderBy(desc(paymentLinksTable.created_at))
      .limit(10)
      .execute();

    // Convert numeric fields for recent payments
    const recent_payments = recentPaymentsResult.map(payment => ({
      ...payment,
      // No numeric fields to convert in payment links table
    }));

    return {
      total_products,
      total_sales,
      pending_payments,
      total_revenue,
      recent_payments
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}
