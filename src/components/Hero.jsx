import { useEffect, useMemo, useState } from "react";
import BannerService from "../services/BannerService";

export default function Hero({ hero }) {
  const fallbackBanner = useMemo(() => ({
    id: "fallback",
    label: "Phong cách thượng lưu",
    title: hero?.title || "Nâng tầm phong cách thượng lưu của bạn",
    description:
      hero?.subtitle ||
      "Khám phá bộ sưu tập mới nhất với những thiết kế tinh xảo, chất liệu cao cấp dành riêng cho giới mộ điệu.",
    image_url: hero?.image || "https://picsum.photos/seed/fashion-banner-main/1920/1080",
  }), [hero]);
  const [banners, setBanners] = useState([fallbackBanner]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadBanners = async () => {
      try {
        const response = await BannerService.getBanners();
        if (!mounted) return;
        setBanners(response.items.length > 0 ? response.items : [fallbackBanner]);
        setActiveIndex(0);
      } catch {
        if (mounted) setBanners([fallbackBanner]);
      }
    };

    loadBanners();
    return () => {
      mounted = false;
    };
  }, [fallbackBanner]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const changeSlide = (direction) => {
    setActiveIndex((index) =>
      (index + direction + banners.length) % banners.length
    );
  };

  const activeBanner = banners[activeIndex];

  return (
    <section
      className="group relative min-h-[560px] overflow-hidden sm:min-h-[620px] lg:h-[80vh] lg:min-h-[680px]"
      aria-roledescription="carousel"
      aria-label="Banner nổi bật"
    >
      {banners.map((banner, index) => (
        <img
          key={banner.id ?? banner.image_url}
          alt=""
          aria-hidden={index !== activeIndex}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
            index === activeIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
          src={banner.image_url}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent">
        <div className="mx-auto flex h-full max-w-max-width items-center px-4 sm:px-6 lg:px-10">
          <div
            key={activeIndex}
            className="max-w-3xl animate-[fadeIn_500ms_ease-out] space-y-5 py-16 sm:space-y-6"
            aria-live="polite"
          >
            <span className="inline-block bg-primary-container px-4 py-2 font-label-sm text-label-sm uppercase tracking-[0.2em] text-white sm:px-5">
              {activeBanner.label}
            </span>
            <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.12] text-white sm:text-5xl lg:text-6xl">
              {activeBanner.title}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-7 text-white sm:text-lg">
              {activeBanner.description}
            </p>

          </div>
        </div>
      </div>

      {banners.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => changeSlide(-1)}
            aria-label="Banner trước"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex lg:left-6 lg:opacity-0 lg:group-hover:opacity-100"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => changeSlide(1)}
            aria-label="Banner tiếp theo"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex lg:right-6 lg:opacity-0 lg:group-hover:opacity-100"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:bottom-7">
            {banners.map((banner, index) => (
              <button
                key={banner.id ?? banner.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Chuyển đến banner ${index + 1}`}
                aria-current={index === activeIndex}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
