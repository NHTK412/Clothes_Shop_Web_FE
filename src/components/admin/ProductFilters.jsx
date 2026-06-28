const ProductFilters = ({ filters, setFilters, categories = [] }) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-sm flex flex-wrap items-center gap-sm mb-md">
      <div className="flex items-center gap-xs px-sm py-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Bộ lọc</span>
      </div>
      <div className="h-6 w-px bg-outline-variant mx-xs"></div>

      {/* Category Filter */}
      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        className="bg-transparent border-none font-label-sm text-label-sm text-on-surface focus:ring-0 cursor-pointer outline-none"
      >
        <option value="">Danh mục: Tất cả</option>
        {categories.map((category) => {
          const categoryValue = category.name ?? category.title ?? category.slug ?? category.id ?? category._id ?? category.categoryId ?? '';
          const categoryLabel = category.name ?? category.title ?? category.slug ?? `#${categoryValue}`;
          return (
            <option key={categoryValue || String(category.id ?? category._id ?? category.categoryId ?? category.slug ?? category.name ?? category.title)} value={String(categoryValue)}>
              {categoryLabel}
            </option>
          );
        })}
      </select>

      {/* Status Filter */}

      <div className="flex-1"></div>

      {/* Export Button */}
      <button className="flex items-center gap-xs px-sm py-2 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[20px]">file_download</span>
        <span className="font-label-sm text-label-sm">Xuất dữ liệu</span>
      </button>
    </div>
  );
};

export default ProductFilters;
