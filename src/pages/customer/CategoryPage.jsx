import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductsService from "../../services/ProductsService";

const fallbackImages = [
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1495121605193-b116b5b9c7a9?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1495121605197-d06e217d9ee0?auto=format&fit=crop&w=1600&q=80",
];

const normalizeCategory = (category) => {
  if (!category) return { id: null, name: "Danh mục" };

  return {
    id: category.id ?? category._id ?? category.category_id ?? category.slug ?? category.name,
    name: category.name ?? category.title ?? "Danh mục",
    description: category.description ?? category.meta_description ?? "Khám phá sản phẩm theo danh mục",
    image: category.image ?? category.cover ?? null,
  };
};

const buildCards = (categories) => {
  const normalized = categories.map(normalizeCategory);

  return normalized.map((category, index) => ({
    ...category,
    image: category.image || fallbackImages[index % fallbackImages.length],
    url: `/products?category=${encodeURIComponent(category.id ?? category.name)}`,
  }));
};

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await ProductsService.getCategories({ per_page: 1000 });
        const items = Array.isArray(response)
          ? response
          : response?.data?.items || response?.data || response?.items || [];
        setCategories(buildCards(items));
      } catch {
        setError("Không thể tải danh mục. Vui lòng thử lại sau.");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const heroCards = categories.slice(0, 4);
  const displayHeroCards = [0, 1, 2, 3].map((index) => {
    const category = heroCards[index];
    if (category) return category;
    const defaultNames = ["Thời trang Nữ", "Thời trang Nam", "Phụ kiện", "Giày dép"];
    const defaultDescriptions = [
      "Những lựa chọn tinh tế cho phái đẹp.",
      "Phong cách nam tính, hiện đại.",
      "Phụ kiện hoàn thiện mọi outfit.",
      "Giày dép phù hợp cho mọi dịp.",
    ];
    return {
      id: `placeholder-${index}`,
      name: defaultNames[index],
      description: defaultDescriptions[index],
      image: fallbackImages[index % fallbackImages.length],
      url: "/products",
    };
  });

  return (
    <main className="bg-surface-container-lowest text-on-surface">
      <section className="py-10">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[32px] border border-outline-variant bg-surface-container-high p-8 shadow-sm">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Khám phá các danh mục mới
              </span>
              <h1 className="mt-6 text-display-lg font-semibold tracking-tight text-on-surface">
                Tìm sản phẩm phù hợp với phong cách của bạn.
              </h1>
              <p className="mt-4 max-w-2xl text-body-lg leading-8 text-secondary">
                Duyệt qua bộ sưu tập danh mục thời trang được cập nhật liên tục và chọn phong cách mà bạn yêu thích.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
                >
                  Mua sắm ngay
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-full border border-outline-variant bg-transparent px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary"
                >
                  Xem toàn bộ cửa hàng
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {displayHeroCards.slice(0, 2).map((category) => (
                <Link
                  key={category.id}
                  to={category.url}
                  className="group relative overflow-hidden rounded-[32px] border border-outline-variant bg-surface-container-high shadow-sm min-h-[260px]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url('${category.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent opacity-95" />
                  <div className="relative flex h-full flex-col justify-end p-8">
                    <span className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {category.name}
                    </span>
                    <h2 className="text-headline-sm font-semibold text-on-surface">
                      {category.description}
                    </h2>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:text-primary/90">
                      Khám phá
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] mt-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {displayHeroCards.slice(2, 4).map((category) => (
                <Link
                  key={category.id}
                  to={category.url}
                  className="group relative overflow-hidden rounded-[32px] border border-outline-variant bg-surface-container-high shadow-sm min-h-[260px]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url('${category.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent opacity-95" />
                  <div className="relative flex h-full flex-col justify-end p-8">
                    <span className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {category.name}
                    </span>
                    <h2 className="text-headline-sm font-semibold text-on-surface">
                      {category.description}
                    </h2>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:text-primary/90">
                      Khám phá
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="rounded-[32px] border border-outline-variant bg-surface-container-high p-8 shadow-sm">
              <span className="inline-flex items-center rounded-full bg-background px-4 py-2 text-sm font-semibold text-primary">
                Danh mục nổi bật
              </span>
              <h2 className="mt-6 text-display-small font-semibold text-on-surface">
                {categories.length ? categories[0].name : "Danh mục thời trang"}
              </h2>
              <p className="mt-4 text-body-lg leading-8 text-secondary">
                Chọn một danh mục để thu hẹp tìm kiếm và khám phá những sản phẩm phù hợp nhất với phong cách của bạn.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {(categories.length ? categories.slice(0, 4) : displayHeroCards).map((category) => (
                  <Link
                    key={category.id}
                    to={category.url}
                    className="inline-flex items-center justify-center rounded-full border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-outline-variant bg-surface-container-high p-8 shadow-sm mt-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Danh sách danh mục</p>
                <h2 className="mt-4 text-headline-small font-semibold text-on-surface">Tất cả danh mục</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">{categories.length} mục</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading && <p className="text-body-lg text-secondary">Đang tải danh mục...</p>}
              {error && <p className="text-body-lg text-error">{error}</p>}
              {!loading && !error && categories.length === 0 && (
                <p className="text-body-lg text-secondary">Không có danh mục để hiển thị.</p>
              )}
              {!loading && !error && (categories.length > 0 ? categories : displayHeroCards).map((category) => (
                <Link
                  key={category.id}
                  to={category.url}
                  className="group overflow-hidden rounded-[24px] border border-outline-variant bg-surface-container-low shadow-sm transition hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-200">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/80">Danh mục</p>
                    <h3 className="mt-2 text-headline-small font-semibold text-on-surface">{category.name}</h3>
                    <p className="mt-3 text-body-sm text-secondary line-clamp-2">{category.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CategoryPage;
