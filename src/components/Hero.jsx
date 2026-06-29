import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const MOCK_BANNERS = [
  {
    eyebrow: "Bộ sưu tập mới",
    title: "Thanh lịch trong từng khoảnh khắc",
    subtitle:
      "Những thiết kế tối giản, hiện đại giúp bạn tự tin từ công sở đến những cuộc hẹn cuối tuần.",
    image: "https://picsum.photos/seed/fashion-banner-modern/1920/1080",
    cta: "Khám phá ngay",
    to: "/products",
  },
  {
    eyebrow: "Ưu đãi theo mùa",
    title: "Phong cách mới, cảm hứng mới",
    subtitle:
      "Làm mới tủ đồ với chất liệu thoải mái, phom dáng tinh tế và bảng màu dễ phối cho mọi ngày.",
    image: "https://picsum.photos/seed/fashion-banner-premium/1920/1080",
    cta: "Mua sắm ngay",
    to: "/products",
  },
];

export default function Hero({ hero }) {
  const banners = useMemo(
    () => [
      {
        eyebrow: "Phong cách thượng lưu",
        title: hero?.title || "Nâng tầm phong cách thượng lưu của bạn",
        subtitle:
          hero?.subtitle ||
          "Khám phá bộ sưu tập mới nhất với những thiết kế tinh xảo, chất liệu cao cấp dành riêng cho giới mộ điệu.",
        image: hero?.image || "https://picsum.photos/seed/fashion-banner-main/1920/1080",
        cta: "Mua sắm ngay",
        to: "/products",
      },
      ...MOCK_BANNERS,
    ],
    [hero]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
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
          key={banner.image}
          alt=""
          aria-hidden={index !== activeIndex}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
            index === activeIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
          src={banner.image}
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
              {activeBanner.eyebrow}
            </span>
            <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.12] text-white sm:text-5xl lg:text-6xl">
              {activeBanner.title}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-7 text-white sm:text-lg">
              {activeBanner.subtitle}
            </p>
            <div className="pt-sm">
              <Link
                to={activeBanner.to}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary-container px-lg py-sm font-label-md text-label-md text-white shadow-lg shadow-primary-container/20 transition-all duration-300 hover:bg-primary active:scale-95 sm:w-auto"
              >
                {activeBanner.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>

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
            key={banner.title}
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
    </section>
  );
}
