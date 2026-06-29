const ProductFilters = ({ filters, setFilters, categories = [] }) => {
  return (
    <div className="mb-md flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-sm">
      <div className="flex items-center gap-xs px-sm py-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Bộ lọc</span>
      </div>
      <div className="mx-xs hidden h-6 w-px bg-outline-variant sm:block"></div>

      {/* Category Filter */}
      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        className="w-full cursor-pointer rounded-lg border border-outline-variant bg-transparent px-sm font-label-sm text-label-sm text-on-surface outline-none focus:ring-0 sm:w-auto sm:border-none sm:px-0"
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

      <div className="hidden flex-1 sm:block"></div>

      {/* Export Button */}
      <button className="flex w-full items-center justify-center gap-xs px-sm py-2 text-on-surface-variant transition-colors hover:text-primary sm:w-auto">
        <span className="material-symbols-outlined text-[20px]">file_download</span>
        <span className="font-label-sm text-label-sm">Xuất dữ liệu</span>
      </button>
    </div>
  );
};

export default ProductFilters;
