import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { notification } from 'antd';
import Cookies from 'js-cookie';
import ProductsService from '../../services/ProductsService';
import CategoryService from '../../services/CategoryService';
import AttributeService from '../../services/AttributeService';
import ProfileService from '../../services/ProfileService';

const EMPTY_FILTERS = {
  q: '',
  category: '',
  min_price: '',
  max_price: '',
  promotionId: '',
  attribute_value_ids: [],
};

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN')}₫`;

const getAttributeValues = (attribute) => {
  const values = attribute?.attribute_values ?? attribute?.attributeValues ?? [];
  return Array.isArray(values) ? values : [];
};

const getMetaData = (value) => {
  try {
    return typeof value?.meta_data === 'string'
      ? JSON.parse(value.meta_data || '{}')
      : value?.meta_data ?? {};
  } catch {
    return {};
  }
};

const flattenCategories = (items = []) => {
  const result = new Map();
  const visit = (category, level = 0) => {
    if (category?.id === null || category?.id === undefined) return;
    const key = String(category.id);
    const current = result.get(key);
    result.set(key, {
      ...current,
      ...category,
      level: Math.min(current?.level ?? level, level),
    });
    (category.children ?? []).forEach((child) => visit(child, level + 1));
  };
  items.forEach((category) => visit(category));
  return [...result.values()].sort((a, b) => {
    if (a.parent_id === b.parent_id) return a.name.localeCompare(b.name, 'vi');
    if (!a.parent_id) return -1;
    if (!b.parent_id) return 1;
    return Number(a.id) - Number(b.id);
  });
};

const filtersFromSearchParams = (searchParams) => ({
  ...EMPTY_FILTERS,
  q: searchParams.get('q') ?? '',
  category: searchParams.get('category') ?? '',
  min_price: searchParams.get('min_price') ?? '',
  max_price: searchParams.get('max_price') ?? '',
  promotionId: searchParams.get('promotionId') ?? '',
  attribute_value_ids: (searchParams.get('attribute_value_ids') ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0),
});

const ProductCard = ({
  product,
  favoriteUpdating,
  onToggleFavorite,
}) => {
  const basePrice = Number(product.price ?? 0);
  const discountAmount = Number(product.discount_price ?? 0);
  const currentPrice = Math.max(basePrice - discountAmount, 0);
  const hasDiscount =
    discountAmount > 0 && basePrice > 0 && discountAmount <= basePrice;
  const totalStock = Array.isArray(product.variants)
    ? product.variants.reduce(
        (total, variant) => total + Number(variant.stock ?? 0),
        0
      )
    : Number(product.stock ?? 0);

  return (
    <Link
      to={`/products/${product.id}`}
      className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          aria-label={
            product.isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'
          }
          disabled={favoriteUpdating}
          onClick={(event) => onToggleFavorite(event, product)}
          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm backdrop-blur transition disabled:opacity-50 ${
            product.isFavorite
              ? 'border-red-400 text-red-600'
              : 'border-white text-on-surface-variant hover:text-red-500'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: product.isFavorite
                ? "'FILL' 1"
                : "'FILL' 0",
            }}
          >
            favorite
          </span>
        </button>
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-error px-2.5 py-1 text-xs font-bold text-on-error">
            Giảm {Math.round((discountAmount / basePrice) * 100)}%
          </span>
        )}
        {totalStock <= 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">
            Tạm hết hàng
          </div>
        )}
      </div>
      <div className="p-3 text-center sm:p-4">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {product.category || 'Thời trang'}
        </p>
        <h2 className="mt-1 line-clamp-2 min-h-10 font-semibold text-on-surface">
          {product.name}
        </h2>
        {hasDiscount ? (
          <div className="mt-2">
            <p className="text-xs text-on-surface-variant line-through">
              {formatCurrency(basePrice)}
            </p>
            <p className="font-bold text-error">{formatCurrency(currentPrice)}</p>
          </div>
        ) : (
          <p className="mt-2 font-bold text-primary">
            {formatCurrency(basePrice)}
          </p>
        )}
      </div>
    </Link>
  );
};

const FilteredProductListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    // The initial URL is intentionally read once; Apply controls later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [sort, setSort] = useState(searchParams.get('sort') ?? '');
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get('page') ?? 1))
  );
  const [perPage, setPerPage] = useState(
    Math.max(1, Number(searchParams.get('per_page') ?? 12))
  );
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDataLoading, setFilterDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

  const requestParams = useMemo(
    () => ({
      per_page: perPage,
      page,
      sort: sort || undefined,
      q: appliedFilters.q || undefined,
      category: appliedFilters.category || undefined,
      min_price: appliedFilters.min_price || undefined,
      max_price: appliedFilters.max_price || undefined,
      promotionId: appliedFilters.promotionId || undefined,
      attribute_value_ids: appliedFilters.attribute_value_ids,
    }),
    [appliedFilters, page, perPage, sort]
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      CategoryService.getCategories({ per_page: 0 }),
      AttributeService.getAllAttributes(),
    ])
      .then(([categoryResponse, attributeResponse]) => {
        if (!mounted) return;
        setCategories(flattenCategories(categoryResponse.items));
        setAttributes(
          Array.isArray(attributeResponse) ? attributeResponse : []
        );
      })
      .catch(() => {
        if (!mounted) return;
        setCategories([]);
        setAttributes([]);
      })
      .finally(() => {
        if (mounted) setFilterDataLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    ProductsService.getProducts(requestParams)
      .then((response) => {
        if (!mounted) return;
        setProducts(
          response.items.map((product) => ({
            ...product,
            isFavorite:
              product.isFavorite || favoriteIds.has(String(product.id)),
          }))
        );
        setPagination(response.pagination);
        setError('');
      })
      .catch((requestError) => {
        if (!mounted) return;
        setProducts([]);
        setPagination(null);
        setError(
          requestError?.response?.data?.message ||
            'Không thể tải danh sách sản phẩm.'
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [requestParams, favoriteIds]);

  useEffect(() => {
    let mounted = true;
    if (!Cookies.get('access_token')) return undefined;

    ProfileService.getProfile()
      .then((profile) => ProductsService.getUserFavorites(profile?.id))
      .then((favorites) => {
        if (mounted) {
          setFavoriteIds(ProductsService.getFavoriteProductIds(favorites));
        }
      })
      .catch(() => {
        if (mounted) setFavoriteIds(new Set());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateDraft = (field, value) => {
    setDraftFilters((previous) => ({ ...previous, [field]: value }));
  };

  const toggleAttributeValue = (id, siblingIds) => {
    setDraftFilters((previous) => {
      const selected = previous.attribute_value_ids.includes(id);
      return {
        ...previous,
        attribute_value_ids: selected
          ? previous.attribute_value_ids.filter((value) => value !== id)
          : [
              ...previous.attribute_value_ids.filter(
                (value) => !siblingIds.includes(value)
              ),
              id,
            ],
      };
    });
  };

  const syncUrl = (
    filters,
    nextSort = sort,
    nextPage = 1,
    nextPerPage = perPage
  ) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.promotionId) params.set('promotionId', filters.promotionId);
    if (filters.attribute_value_ids.length) {
      params.set(
        'attribute_value_ids',
        filters.attribute_value_ids.join(',')
      );
    }
    if (nextSort) params.set('sort', nextSort);
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextPerPage !== 12) params.set('per_page', String(nextPerPage));
    setSearchParams(params, { replace: true });
  };

  const applyFilters = (event) => {
    event?.preventDefault();
    const minPrice = Number(draftFilters.min_price || 0);
    const maxPrice = Number(draftFilters.max_price || 0);
    if (
      draftFilters.min_price &&
      draftFilters.max_price &&
      minPrice > maxPrice
    ) {
      notification.warning({
        message: 'Khoảng giá chưa hợp lệ',
        description: 'Giá tối thiểu không được lớn hơn giá tối đa.',
      });
      return;
    }
    const nextFilters = {
      ...draftFilters,
      q: draftFilters.q.trim(),
    };
    setLoading(true);
    setPage(1);
    setAppliedFilters(nextFilters);
    syncUrl(nextFilters, sort, 1);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setLoading(true);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSort('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const changeSort = (value) => {
    setLoading(true);
    setSort(value);
    setPage(1);
    syncUrl(appliedFilters, value, 1);
  };

  const changePage = (nextPage) => {
    const totalPages = pagination?.totalPages ?? 1;
    if (loading || nextPage < 1 || nextPage > totalPages) return;
    setLoading(true);
    setPage(nextPage);
    syncUrl(appliedFilters, sort, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFavorite = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();
    if (!Cookies.get('access_token')) {
      notification.warning({ message: 'Vui lòng đăng nhập để lưu yêu thích.' });
      navigate('/login');
      return;
    }
    if (favoriteUpdatingId) return;

    const nextFavorite = !product.isFavorite;
    setFavoriteUpdatingId(product.id);
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, isFavorite: nextFavorite }
          : item
      )
    );
    try {
      if (nextFavorite) await ProductsService.addFavorite(product.id);
      else await ProductsService.removeFavorite(product.id);
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (nextFavorite) next.add(String(product.id));
        else next.delete(String(product.id));
        return next;
      });
    } catch (favoriteError) {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, isFavorite: !nextFavorite }
            : item
        )
      );
      notification.error({
        message: 'Không thể cập nhật yêu thích',
        description:
          favoriteError?.response?.data?.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setFavoriteUpdatingId(null);
    }
  };

  const totalItems = pagination?.totalItems ?? products.length;
  const totalPages = pagination?.totalPages ?? 1;
  const activeFilterCount =
    Number(Boolean(appliedFilters.q)) +
    Number(Boolean(appliedFilters.category)) +
    Number(Boolean(appliedFilters.min_price || appliedFilters.max_price)) +
    Number(Boolean(appliedFilters.promotionId)) +
    appliedFilters.attribute_value_ids.length;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-max-width px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Cửa hàng
            </p>
            <h1 className="mt-2 text-3xl font-bold text-on-surface sm:text-4xl">
              Danh sách sản phẩm
            </h1>
            <p className="mt-2 text-on-surface-variant">
              {loading ? 'Đang cập nhật...' : `${totalItems} sản phẩm phù hợp`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="product-sort" className="text-sm text-on-surface-variant">
              Sắp xếp
            </label>
            <select
              id="product-sort"
              value={sort}
              onChange={(event) => changeSort(event.target.value)}
              className="min-w-44 rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Mặc định</option>
              <option value="price">Giá thấp đến cao</option>
              <option value="-price">Giá cao đến thấp</option>
              <option value="-created_at">Mới nhất</option>
              <option value="created_at">Cũ nhất</option>
              <option value="name">Tên A–Z</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-4 py-3 font-medium md:hidden"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined">tune</span>
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="material-symbols-outlined">
            {filtersOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
            <form
              onSubmit={applyFilters}
              className="space-y-6 rounded-2xl border border-outline-variant bg-white p-5 md:sticky md:top-24"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-on-surface">Bộ lọc</h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-semibold text-error hover:underline"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Tìm kiếm</span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-outline">
                    search
                  </span>
                  <input
                    value={draftFilters.q}
                    onChange={(event) => updateDraft('q', event.target.value)}
                    placeholder="Tên, mô tả, SKU..."
                    className="w-full rounded-lg border border-outline-variant py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Danh mục</span>
                <select
                  value={draftFilters.category}
                  onChange={(event) =>
                    updateDraft('category', event.target.value)
                  }
                  disabled={filterDataLoading}
                  className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.level > 0 ? '— ' : ''}
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium">Khoảng giá</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={draftFilters.min_price}
                    onChange={(event) =>
                      updateDraft('min_price', event.target.value)
                    }
                    placeholder="Từ"
                    className="min-w-0 rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    value={draftFilters.max_price}
                    onChange={(event) =>
                      updateDraft('max_price', event.target.value)
                    }
                    placeholder="Đến"
                    className="min-w-0 rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {attributes.map((attribute) => {
                const values = getAttributeValues(attribute);
                if (values.length === 0) return null;
                const siblingIds = values.map((value) => Number(value.id));
                return (
                  <fieldset key={attribute.id} className="space-y-2">
                    <legend className="text-sm font-medium">
                      {attribute.display_name || attribute.name}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => {
                        const id = Number(value.id);
                        const selected =
                          draftFilters.attribute_value_ids.includes(id);
                        const meta = getMetaData(value);
                        const hex = meta.hex || meta.color;
                        return (
                          <button
                            key={value.id}
                            type="button"
                            onClick={() =>
                              toggleAttributeValue(id, siblingIds)
                            }
                            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                              selected
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant bg-white hover:border-primary'
                            }`}
                          >
                            {hex && (
                              <span
                                className="h-5 w-5 rounded-full border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            )}
                            {value.display_value || value.value}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg border border-outline-variant px-3 py-2.5 text-sm font-medium"
                >
                  Đặt lại
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-on-primary"
                >
                  Áp dụng
                </button>
              </div>
            </form>
          </aside>

          <section className="min-w-0">
            {error ? (
              <div className="rounded-2xl border border-error/30 bg-error-container/30 p-8 text-center text-error">
                <span className="material-symbols-outlined text-5xl">
                  cloud_off
                </span>
                <p className="mt-3">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setAppliedFilters({ ...appliedFilters });
                  }}
                  className="mt-5 rounded-full bg-primary px-5 py-2.5 font-medium text-on-primary"
                >
                  Thử lại
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {Array.from({ length: perPage }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-outline-variant bg-white"
                  >
                    <div className="aspect-[3/4] animate-pulse bg-surface-container-high" />
                    <div className="space-y-2 p-4">
                      <div className="mx-auto h-3 w-20 animate-pulse rounded bg-surface-container-high" />
                      <div className="h-5 animate-pulse rounded bg-surface-container-high" />
                      <div className="mx-auto h-5 w-24 animate-pulse rounded bg-surface-container-high" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-white p-10 text-center">
                <span className="material-symbols-outlined text-6xl text-outline">
                  search_off
                </span>
                <h2 className="mt-3 text-xl font-semibold">
                  Không tìm thấy sản phẩm
                </h2>
                <p className="mt-2 text-on-surface-variant">
                  Thử bỏ bớt thuộc tính hoặc mở rộng khoảng giá.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-full bg-primary px-6 py-3 font-medium text-on-primary"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      favoriteUpdating={favoriteUpdatingId === product.id}
                      onToggleFavorite={handleFavorite}
                    />
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-outline-variant pt-6 sm:flex-row">
                  <p className="text-sm text-on-surface-variant">
                    Trang {pagination?.page ?? page}/{totalPages} · {totalItems}{' '}
                    kết quả
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => changePage(page - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined">
                        chevron_left
                      </span>
                    </button>
                    {Array.from(
                      { length: Math.min(totalPages, 5) },
                      (_, index) => {
                        const start = Math.max(
                          1,
                          Math.min(page - 2, totalPages - 4)
                        );
                        return start + index;
                      }
                    ).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => changePage(pageNumber)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold ${
                          pageNumber === page
                            ? 'bg-primary text-on-primary'
                            : 'border border-outline-variant'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={page >= totalPages || loading}
                      onClick={() => changePage(page + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    </button>
                  </div>
                  <select
                    value={perPage}
                    onChange={(event) => {
                      const nextPerPage = Number(event.target.value);
                      setLoading(true);
                      setPerPage(nextPerPage);
                      setPage(1);
                      syncUrl(appliedFilters, sort, 1, nextPerPage);
                    }}
                    className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm"
                  >
                    <option value="12">12 / trang</option>
                    <option value="20">20 / trang</option>
                    <option value="40">40 / trang</option>
                  </select>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default FilteredProductListPage;
