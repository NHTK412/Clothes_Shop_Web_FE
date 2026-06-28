import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import ProductFilters from '../../components/admin/ProductFilters';
import ProductTable from '../../components/admin/ProductTable';
import ProductPagination from '../../components/admin/ProductPagination';
import AddProductModal from '../../components/admin/AddProductModal';
import ConfirmModal from '../../components/admin/ConfirmModal';
import ProductsService from '../../services/ProductsService';

const normalizeCategoryValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (typeof value === 'object') {
    return String(value.name ?? value.title ?? value.slug ?? value.id ?? value._id ?? value.categoryId ?? '').trim();
  }
  return null;
};

const getProductCategoryIdentifiers = (product) => {
  const identifiers = [];

  if (!product) return identifiers;

  if (product.category) {
    const normalized = normalizeCategoryValue(product.category);
    if (normalized) identifiers.push(normalized);
  }

  if (Array.isArray(product.categories)) {
    product.categories.forEach((cat) => {
      const normalized = normalizeCategoryValue(cat);
      if (normalized) identifiers.push(normalized);
    });
  }

  return Array.from(new Set(identifiers.map((item) => item.toLowerCase())));
};

const AdminProductListPage = () => {
  const [activeMenu, setActiveMenu] = useState('products');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({
    category: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: null, productName: '' });

  const fetchCategories = async () => {
    try {
      const categoriesResult = await ProductsService.getCategories();
      setCategories(Array.isArray(categoriesResult) ? categoriesResult : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ProductsService.getAllProducts({
        per_page: 100,
        page: 1,
      });
      
      if (response.success || response.data) {
        const productsData = response.data?.items || response.data || [];
        setAllProducts(Array.isArray(productsData) ? productsData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
      }
    } catch (err) {
      setError('Lỗi tải sản phẩm: ' + (err.message || 'Vui lòng thử lại'));
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products and categories from API
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products
  const sortProductList = (list, config) => {
    if (!config?.key) return list;
    return [...list].sort((a, b) => {
      const getValue = (item) => {
        switch (config.key) {
          case 'name':
            return String(item.name ?? item.title ?? '').toLowerCase();
          case 'category':
            return normalizeCategoryValue(item.category).toLowerCase();
          case 'price': {
            const basePrice = Number(item.price ?? item.original_price ?? item.list_price ?? 0);
            const discount = Number(item.discount_price ?? item.sale_price ?? 0);
            return Math.max(basePrice - discount, 0);
          }
          case 'stock': {
            const stock = item.stock ?? item.available_stock ?? item.in_stock;
            if (typeof stock === 'number' && !Number.isNaN(stock)) return stock;
            if (typeof stock === 'boolean') return stock ? 1 : 0;
            if (Array.isArray(item.variants)) {
              return item.variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0);
            }
            return Number(stock) || 0;
          }
          default:
            return '';
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return config.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return config.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  useEffect(() => {
    let filtered = allProducts;

    if (filters.category) {
      const normalizedFilter = String(filters.category).toLowerCase();
      filtered = filtered.filter((product) => {
        const ids = getProductCategoryIdentifiers(product);
        return ids.some((value) => value === normalizedFilter || value.includes(normalizedFilter));
      });
    }

    const sorted = sortProductList(filtered, sortConfig);
    setProducts(sorted);
    setCurrentPage(1);
  }, [filters, allProducts, sortConfig]);

  const navigate = useNavigate();
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddProduct = () => {
    setIsModalOpen(true);
  };

  const handleProductAdded = (newProduct) => {
    setAllProducts((prev) => [newProduct, ...prev]);
    fetchProducts();
  };

  const handleEditProduct = (id) => {
    navigate(`/admin/products/${id}/edit`);
  };

  const handleDeleteProduct = (id, productName) => {
    setDeleteConfirm({ isOpen: true, productId: id, productName: productName || '' });
  };

  const confirmDeleteProduct = async () => {
    const { productId, productName } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
    if (!productId) return;

    try {
      setIsLoading(true);
      await ProductsService.deleteProduct(productId);
      setAllProducts((prev) => prev.filter((p) => p.id !== productId));
      notification.success({
        message: 'Xóa sản phẩm thành công',
        description: `Sản phẩm ${productName || ''} đã được xóa.`,
      });
    } catch (err) {
      notification.error({
        message: 'Lỗi xóa sản phẩm',
        description: err.response?.data?.message || err.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeleteProduct = () => {
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
  };

  const handleViewProduct = (id) => {
    navigate(`/admin/products/${id}`);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <AdminHeader />

        {/* Main Content Area */}
        <main className="pt-16 min-h-screen bg-surface">
          <div className="p-lg max-w-[1280px] mx-auto w-full">
            {/* Error Alert */}
            {error && (
              <div className="mb-md p-md bg-error-container text-on-error-container rounded-lg text-body-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-lg gap-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-background">Products</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {products.length} items in your catalog
                </p>
              </div>
              <button
                onClick={handleAddProduct}
                disabled={isLoading}
                className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              >
                <span className="material-symbols-outlined mr-xs text-[20px]">add</span>
                Add Product
              </button>
            </div>

            {/* Filters Section */}
            <ProductFilters filters={filters} setFilters={setFilters} categories={categories} />

            {/* Loading State */}
            {isLoading && products.length === 0 ? (
              <div className="text-center py-lg text-on-surface-variant">
                <p className="text-body-md">Đang tải sản phẩm...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-lg text-on-surface-variant">
                <p className="text-body-md">Không tìm thấy sản phẩm nào</p>
              </div>
            ) : (
              <>
                {/* Products Table */}
                <ProductTable
                  products={paginatedProducts}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onView={handleViewProduct}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <ConfirmModal
                  isOpen={deleteConfirm.isOpen}
                  title="Xác nhận xóa sản phẩm"
                  message={`Bạn có chắc chắn muốn xóa sản phẩm ${deleteConfirm.productName || ''}?`}
                  confirmText="Xóa"
                  cancelText="Hủy"
                  isDangerous
                  onConfirm={confirmDeleteProduct}
                  onCancel={cancelDeleteProduct}
                />

                {/* Pagination */}
                <ProductPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={products.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
};

export default AdminProductListPage;
