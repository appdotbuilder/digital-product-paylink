
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, PaymentLinkWithProduct, DashboardStats, GeneratePaymentLinkInput } from '../../server/src/schema';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentLinkWithProduct[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    description: null,
    price: 0,
    file_url: null,
    file_name: null,
    is_active: true
  });

  // Payment link form state
  const [paymentLinkForm, setPaymentLinkForm] = useState<GeneratePaymentLinkInput>({
    product_id: 0,
    buyer_name: undefined,
    buyer_email: undefined,
    expires_in_hours: 24
  });

  const [generatedPaymentLink, setGeneratedPaymentLink] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [productsData, pendingData, statsData] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getPendingPayments.query(),
        trpc.getDashboardStats.query()
      ]);
      setProducts(productsData);
      setPendingPayments(pendingData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newProduct = await trpc.createProduct.mutate(productForm);
      setProducts((prev: Product[]) => [...prev, newProduct]);
      setProductForm({
        name: '',
        description: null,
        price: 0,
        file_url: null,
        file_name: null,
        is_active: true
      });
      setIsProductDialogOpen(false);
      await loadData(); // Refresh dashboard stats
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsLoading(true);
    try {
      const updatedProduct = await trpc.updateProduct.mutate({
        id: selectedProduct.id,
        ...productForm
      });
      setProducts((prev: Product[]) => 
        prev.map((p: Product) => p.id === selectedProduct.id ? updatedProduct : p)
      );
      setSelectedProduct(null);
      setIsProductDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await trpc.deleteProduct.mutate({ id: productId });
      setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));
      await loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleGeneratePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const paymentLink = await trpc.generatePaymentLink.mutate(paymentLinkForm);
      setGeneratedPaymentLink(`${window.location.origin}/payment/${paymentLink.unique_code}`);
      setPaymentLinkForm({
        product_id: 0,
        buyer_name: undefined,
        buyer_email: undefined,
        expires_in_hours: 24
      });
    } catch (error) {
      console.error('Failed to generate payment link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentLinkId: number) => {
    try {
      await trpc.confirmPayment.mutate({ payment_link_id: paymentLinkId });
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Failed to confirm payment:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      file_url: product.file_url,
      file_name: product.file_name,
      is_active: product.is_active
    });
    setIsProductDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setProductForm({
      name: '',
      description: null,
      price: 0,
      file_url: null,
      file_name: null,
      is_active: true
    });
    setIsProductDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'uploaded': return 'default';
      case 'confirmed': return 'default';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'uploaded': return 'text-blue-600';
      case 'confirmed': return 'text-green-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">💳 Payment Link Manager</h1>
          <p className="text-orange-100 text-lg">Kelola produk digital dan link pembayaran Anda</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              📦 Produk
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              💰 Pembayaran
            </TabsTrigger>
            <TabsTrigger value="links" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              🔗 Link Baru
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">Total Produk</CardTitle>
                  <div className="text-2xl">📦</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">
                    {dashboardStats?.total_products || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">Total Penjualan</CardTitle>
                  <div className="text-2xl">📈</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">
                    {dashboardStats?.total_sales || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-800">Menunggu Konfirmasi</CardTitle>
                  <div className="text-2xl">⏳</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-900">
                    {dashboardStats?.pending_payments || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">Total Revenue</CardTitle>
                  <div className="text-2xl">💎</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    Rp {dashboardStats?.total_revenue?.toLocaleString('id-ID') || '0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">🔔 Pembayaran Terbaru</CardTitle>
                <CardDescription>Status pembayaran yang perlu perhatian</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardStats?.recent_payments?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Belum ada pembayaran terbaru</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardStats?.recent_payments?.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{payment.buyer_name || 'Nama tidak tersedia'}</p>
                          <p className="text-sm text-gray-600">{payment.buyer_email || 'Email tidak tersedia'}</p>
                          <p className="text-xs text-gray-500">
                            {payment.created_at.toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(payment.status)} className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">📦 Manajemen Produk</h2>
              <Button onClick={openCreateDialog} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                ➕ Tambah Produk
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 text-lg">Belum ada produk. Tambahkan produk pertama Anda!</p>
                </div>
              ) : (
                products.map((product: Product) => (
                  <Card key={product.id} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                        </Badge>
                      </div>
                      {product.description && (
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-gradient bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                          Rp {product.price.toLocaleString('id-ID')}
                        </div>
                        
                        {product.file_name && (
                          <div className="text-sm text-gray-600">
                            📄 File: {product.file_name}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Dibuat: {product.created_at.toLocaleDateString('id-ID')}
                        </div>
                        
                        <Separator />
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => openEditDialog(product)}
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                          >
                            ✏️ Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">🗑️</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Yakin ingin menghapus "{product.name}"? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">💰 Konfirmasi Pembayaran</h2>
            
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>📋 Menunggu Konfirmasi</CardTitle>
                <CardDescription>Pembayaran yang telah mengupload bukti transfer</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💤</div>
                    <p className="text-gray-500 text-lg">Tidak ada pembayaran yang menunggu konfirmasi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPayments.map((payment: PaymentLinkWithProduct) => (
                      <div key={payment.id} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-800">
                              📦 {payment.product.name}
                            </h3>
                            <p className="text-gray-600 mb-2">
                              💰 Rp {payment.product.price.toLocaleString('id-ID')}
                            </p>
                            
                            <Separator className="my-4" />
                            
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">👤 Nama:</span> {payment.buyer_name || 'Tidak tersedia'}</p>
                              <p><span className="font-medium">📧 Email:</span> {payment.buyer_email || 'Tidak tersedia'}</p>
                              <p><span className="font-medium">🔗 Kode:</span> {payment.unique_code}</p>
                              <p><span className="font-medium">📅 Dibuat:</span> {payment.created_at.toLocaleDateString('id-ID')}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {payment.payment_proof_url && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">📎 Bukti Pembayaran:</Label>
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => window.open(payment.payment_proof_url!, '_blank')}
                                    className="w-full"
                                  >
                                    👁️ Lihat Bukti Transfer
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleConfirmPayment(payment.id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                              >
                                ✅ Konfirmasi
                              </Button>
                              <Button variant="outline" className="flex-1">
                                ❌ Tolak
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Payment Link Tab */}
          <TabsContent value="links" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">🔗 Generate Payment Link</h2>
            
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>✨ Buat Link Pembayaran Baru</CardTitle>
                <CardDescription>Pilih produk dan buat link pembayaran unik</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGeneratePaymentLink} className="space-y-6">
                  <div>
                    <Label htmlFor="product-select">📦 Pilih Produk</Label>
                    <select
                      id="product-select"
                      value={paymentLinkForm.product_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPaymentLinkForm((prev: GeneratePaymentLinkInput) => ({
                          ...prev,
                          product_id: parseInt(e.target.value) || 0
                        }))
                      }
                      className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option value={0}>Pilih produk...</option>
                      {products.filter((p: Product) => p.is_active).map((product: Product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - Rp {product.price.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyer-name">👤 Nama Pembeli (Opsional)</Label>
                      <Input
                        id="buyer-name"
                        value={paymentLinkForm.buyer_name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentLinkForm((prev: GeneratePaymentLinkInput) => ({
                            ...prev,
                            buyer_name: e.target.value || undefined
                          }))
                        }
                        placeholder="Nama pembeli"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="buyer-email">📧 Email Pembeli (Opsional)</Label>
                      <Input
                        id="buyer-email"
                        type="email"
                        value={paymentLinkForm.buyer_email || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentLinkForm((prev: GeneratePaymentLinkInput) => ({
                            ...prev,
                            buyer_email: e.target.value || undefined
                          }))
                        }
                        placeholder="email@example.com"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expires-hours">⏰ Berlaku Selama (Jam)</Label>
                    <Input
                      id="expires-hours"
                      type="number"
                      value={paymentLinkForm.expires_in_hours}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentLinkForm((prev: GeneratePaymentLinkInput) => ({
                          ...prev,
                          expires_in_hours: parseInt(e.target.value) || 24
                        }))
                      }
                      min="1"
                      max="168"
                      className="mt-2"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || paymentLinkForm.product_id === 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 py-3"
                  >
                    {isLoading ? '🔄 Membuat...' : '🚀 Generate Payment Link'}
                  </Button>
                </form>

                {generatedPaymentLink && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">🎉 Link Berhasil Dibuat!</h3>
                    <div className="flex gap-2">
                      <Input 
                        value={generatedPaymentLink} 
                        readOnly 
                        className="bg-white"
                      />
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPaymentLink);
                          // You could add a toast notification here
                        }}
                        variant="outline"
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct ? 'Update informasi produk' : 'Buat produk digital baru'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={selectedProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
              <div>
                <Label htmlFor="product-name">📦 Nama Produk</Label>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nama produk"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="product-description">📝 Deskripsi</Label>
                <Textarea
                  id="product-description"
                  value={productForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setProductForm((prev: CreateProductInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  placeholder="Deskripsi produk (opsional)"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="product-price">💰 Harga</Label>
                <Input
                  id="product-price"
                  type="number"
                  value={productForm.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProductForm((prev: CreateProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="file-url">🔗 URL File</Label>
                <Input
                  id="file-url"
                  value={productForm.file_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProductForm((prev: CreateProductInput) => ({ ...prev, file_url: e.target.value || null }))
                  }
                  placeholder="https://example.com/file.pdf"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="file-name">📄 Nama File</Label>
                <Input
                  id="file-name"
                  value={productForm.file_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProductForm((prev: CreateProductInput) => ({ ...prev, file_name: e.target.value || null }))
                  }
                  placeholder="file.pdf"
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={productForm.is_active}
                  onCheckedChange={(checked: boolean) =>
                    setProductForm((prev: CreateProductInput) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is-active">✅ Produk Aktif</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProductDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                >
                  {isLoading ? '🔄 Menyimpan...' : (selectedProduct ?  '💾 Update' : '✨ Buat')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
