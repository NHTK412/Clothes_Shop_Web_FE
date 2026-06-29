import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryService from '../../services/CategoryService';

const normalizeCategory = (category, inheritedParentId = null) => ({
  ...category,
  id: Number(category.id),
  name: category.name || 'Danh mục',
  image: category.image || '',
  parent_id: category.parent_id ?? inheritedParentId,
  children: Array.isArray(category.children) ? category.children : [],
});

const buildCategoryHierarchy = (items = []) => {
  const categoryMap = new Map();

  const visit = (category, inheritedParentId = null) => {
    if (category?.id === null || category?.id === undefined) return;
    const normalized = normalizeCategory(category, inheritedParentId);
    const key = String(normalized.id);
    const existing = categoryMap.get(key);
    categoryMap.set(key, {
      ...existing,
      ...normalized,
      children:
        normalized.children.length > 0
          ? normalized.children
          : existing?.children ?? [],
    });
    normalized.children.forEach((child) => visit(child, normalized.id));
  };

  items.forEach((category) => visit(category));
  const categories = [...categoryMap.values()];

  return categories
    .filter(
      (category) =>
        !category.parent_id || !categoryMap.has(String(category.parent_id))
    )
    .map((parent) => ({
      ...parent,
      children: categories
        .filter(
          (category) =>
            String(category.parent_id ?? '') === String(parent.id)
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

const CategoryImage = ({ category, className = '' }) =>
  category.image ? (
    <img
      src={category.image}
      alt={category.name}
      className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${className}`}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-high text-outline">
      <span className="material-symbols-outlined text-5xl">category</span>
    </div>
  );

const CustomerCategoryPage = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    CategoryService.getCategories({ per_page: 20, page })
      .then((response) => {
        if (!mounted) return;
        setItems(response.items);
        setPagination(response.pagination);
        setError('');
      })
      .catch((requestError) => {
        if (!mounted) return;
        setItems([]);
        setPagination(null);
        setError(
          requestError?.response?.data?.message ||
            'Không thể tải danh mục. Vui lòng thử lại sau.'
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, refreshKey]);

  const hierarchy = useMemo(() => buildCategoryHierarchy(items), [items]);
  const childCount = hierarchy.reduce(
    (total, category) => total + category.children.length,
    0
  );
  const featuredCategory = hierarchy[0] ?? null;

  const changePage = (nextPage) => {
    if (
      loading ||
      nextPage < 1 ||
      nextPage > (pagination?.totalPages ?? 1) ||
      nextPage === page
    ) {
      return;
    }
    setLoading(true);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retry = () => {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface">
  

      <section className="mx-auto max-w-max-width px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Danh mục sản phẩm
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Mua sắm theo nhóm
            </h2>
            <p className="mt-2 text-on-surface-variant">
              {hierarchy.length} danh mục chính · {childCount} danh mục con
            </p>
          </div>
          {pagination && (
            <p className="text-sm text-on-surface-variant">
              Trang {pagination.page}/{pagination.totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-96 animate-pulse rounded-2xl bg-surface-container-high"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-error/30 bg-error-container/30 p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-error">
              cloud_off
            </span>
            <p className="mt-3 text-error">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 rounded-full bg-primary px-6 py-3 font-medium text-on-primary"
            >
              Thử lại
            </button>
          </div>
        ) : hierarchy.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
            Chưa có danh mục nào để hiển thị.
          </div>
        ) : (
          <div className="space-y-8">
            {hierarchy.map((category) => (
              <article
                key={category.id}
                className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm"
              >
                <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                  <Link
                    to={`/products?category=${category.id}`}
                    className="group relative min-h-[280px] overflow-hidden sm:min-h-[340px]"
                  >
                    <CategoryImage category={category} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                        Danh mục chính
                      </p>
                      <h3 className="mt-2 text-3xl font-bold">{category.name}</h3>
                      <p className="mt-2 text-sm text-white/80">
                        {category.children.length} danh mục con
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                        Xem tất cả
                        <span className="material-symbols-outlined text-lg">
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  </Link>

                  <div className="p-4 sm:p-6">
                    {category.children.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {category.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/products?category=${child.id}`}
                            className="group overflow-hidden rounded-xl border border-outline-variant bg-surface transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                          >
                            <div className="h-40 overflow-hidden bg-surface-container-high sm:h-44">
                              <CategoryImage category={child} />
                            </div>
                            <div className="flex items-center justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-on-surface">
                                  {child.name}
                                </p>
                                <p className="mt-1 text-xs text-on-surface-variant">
                                  Khám phá sản phẩm
                                </p>
                              </div>
                              <span className="material-symbols-outlined shrink-0 text-primary">
                                arrow_forward
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant p-8 text-center">
                        <span className="material-symbols-outlined text-5xl text-outline">
                          inventory_2
                        </span>
                        <p className="mt-3 font-medium">
                          Xem sản phẩm trong {category.name}
                        </p>
                        <Link
                          to={`/products?category=${category.id}`}
                          className="mt-5 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary"
                        >
                          Mở danh mục
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {(pagination?.totalPages ?? 1) > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => changePage(page - 1)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-outline-variant px-5 text-sm font-medium disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">
                chevron_left
              </span>
              Trước
            </button>
            <span className="text-sm font-medium text-on-surface-variant">
              {page}/{pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => changePage(page + 1)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-outline-variant px-5 text-sm font-medium disabled:opacity-40"
            >
              Sau
              <span className="material-symbols-outlined text-lg">
                chevron_right
              </span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default CustomerCategoryPage;
