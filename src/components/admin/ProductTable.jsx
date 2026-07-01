import AdminActionButton from './AdminActionButton';

const ProductTable = ({ products = [], onEdit, onDelete, onView, sortConfig, onSort }) => {
  const getStockValue = (product) => {
    const directStock = product.stock ?? product.available_stock ?? product.in_stock;
    if (typeof directStock === 'number' && !Number.isNaN(directStock)) {
      return directStock;
    }

    if (typeof directStock === 'boolean') {
      return directStock ? 1 : 0;
    }

    const variantStock = Array.isArray(product.variants)
      ? product.variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0)
      : 0;

    const numericStock = Number(directStock);
    return !Number.isNaN(numericStock) ? numericStock : variantStock;
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `${amount.toLocaleString('vi-VN')}₫`;
  };

  const getCurrentPrice = (price, discount) => {
    const basePrice = Number(price || 0);
    const discountAmount = Number(discount || 0);
    return Math.max(basePrice - discountAmount, 0);
  };

  const getDiscountAmount = (price, discount) => {
    const basePrice = Number(price || 0);
    const discountAmount = Number(discount || 0);
    return discountAmount > 0 && discountAmount <= basePrice ? discountAmount : 0;
  };

  const formatPrice = (product) => {
    const basePrice = product.price ?? product.original_price ?? product.list_price ?? null;
    const discountAmount = product.discount_price ?? product.sale_price ?? null;
    const currentPrice = getCurrentPrice(basePrice, discountAmount);
    const visibleDiscount = getDiscountAmount(basePrice, discountAmount);
    return {
      basePrice: basePrice != null && !isNaN(Number(basePrice)) ? formatCurrency(basePrice) : 'Không có',
      discountAmount: visibleDiscount ? formatCurrency(visibleDiscount) : '0₫',
      currentPrice: isNaN(currentPrice) ? 'Không có' : formatCurrency(currentPrice),
      hasDiscount: visibleDiscount > 0,
    };
  };

  const renderSortHeader = (key, label) => {
    const active = sortConfig?.key === key;
    const icon = active
      ? sortConfig.direction === 'asc'
        ? 'arrow_upward'
        : 'arrow_downward'
      : 'unfold_more';

    return (
      <button
        type="button"
        onClick={() => onSort?.(key)}
        className="inline-flex items-center gap-1 text-left font-semibold text-on-surface transition-colors hover:text-primary"
      >
        <span>{label}</span>
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      </button>
    );
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {renderSortHeader('name', 'Sản phẩm')}
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {renderSortHeader('category', 'Danh mục')}
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {renderSortHeader('price', 'Giá')}
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {renderSortHeader('stock', 'Tồn kho')}
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface-container-low transition-colors duration-150">
                <td className="px-md py-4">
                  <div className="flex items-center gap-md">
                    <div className="w-12 h-12 rounded bg-surface-container shrink-0 overflow-hidden border border-outline-variant">
                      <img
                        alt={product.name}
                        className="w-full h-full object-cover"
                        src={product.image}
                      />
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{product.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-md py-4 font-body-sm text-body-sm text-on-surface">
                  {product.category}
                </td>
                <td className="px-md py-4 font-body-sm text-body-sm text-on-surface font-semibold">
                  {(() => {
                    const price = formatPrice(product);
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant">Giá gốc:</span>
                          <span>{price.basePrice}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant">Giảm giá:</span>
                          <span className="text-error">{price.discountAmount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant">Giá hiện tại:</span>
                          <span className="font-semibold">{price.currentPrice}</span>
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-md py-4 font-body-sm text-body-sm text-on-surface">
                  {(() => {
                    const stockValue = getStockValue(product);
                    return stockValue === 0 ? (
                      <span className="text-error">Hết hàng</span>
                    ) : (
                      `Còn ${stockValue} sản phẩm`
                    );
                  })()}
                </td>
                <td className="px-md py-4 text-right">
                  <div className="flex items-center justify-end gap-xs">
                    <AdminActionButton
                      icon="visibility"
                      label="Xem chi tiết"
                      onClick={() => onView(product.id)}
                    />
                    <AdminActionButton
                      icon="edit"
                      label="Chỉnh sửa"
                      onClick={() => onEdit(product.id)}
                    />
                    <AdminActionButton
                      icon="delete"
                      label="Xóa"
                      tone="danger"
                      onClick={() => onDelete(product.id, product.name)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
