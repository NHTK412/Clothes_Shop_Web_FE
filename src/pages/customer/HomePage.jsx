/* eslint-disable no-unused-vars */
import { notification } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import productsService from "../../services/ProductsService";
import Hero from "../../components/Hero";

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getCurrentPrice = (price, discount) => {
  const basePrice = Number(price || 0);
  const discountAmount = Number(discount || 0);
  return Math.max(basePrice - discountAmount, 0);
};

export default function HomePage() {
	const [hero, setHero] = useState({
		title: "Nâng tầm phong cách thượng lưu của bạn",
		subtitle:
			"Khám phá bộ sưu tập mới nhất với những thiết kế tinh xảo, chất liệu cao cấp dành riêng cho giới mộ điệu.",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuC7rNwlCd89F3SmH3-9dFHbsiWOKSVImwHrkgvXani47CAG-umgWyGg6VRZqbAGd_XXImNckYCdorP9H0d7-CRoaDIPbsX59BuXfE2LXcGbglH_6n2XbYg9MYEX1zUCmwcQbYCdVcYxJl8jvEA-LCdos9ySMSgV7tPIf8wSXhDqUNGdUnxJl7vppoBB2UpcrTrXAbK27lUG4adS98RxtnV7Xf9lEb8B0mcr7K6jdEb9HwmLw9v7r2DSyyrL_du24FOQSLmGFgZYkIev",
	});

	const [categories, setCategories] = useState([]);
	const [featured, setFeatured] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let mounted = true;
		async function load() {
			setLoading(true);
			try {
				const [cats, prods] = await Promise.all([
					productsService.getCategories(),
					productsService.getFeaturedProducts(),
				]);

				if (!mounted) return;
				setCategories(cats || []);
				setFeatured(prods || []);
			} catch (err) {
				setError(err.message || "Lỗi tải dữ liệu");
			} finally {
				if (mounted) setLoading(false);
			}
		}
		load();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		// micro interactions and sticky header (port of original script)
		const handleCardHover = (e) => {
			e.currentTarget.classList.add("shadow-xl");
		};
		const handleCardLeave = (e) => {
			e.currentTarget.classList.remove("shadow-xl");
		};

		const cards = Array.from(document.querySelectorAll(".group"));
		cards.forEach((c) => {
			c.addEventListener("mouseenter", handleCardHover);
			c.addEventListener("mouseleave", handleCardLeave);
		});

		const onScroll = () => {
			const header = document.querySelector("header");
			if (!header) return;
			if (window.scrollY > 50) {
				header.classList.add("bg-white/95", "backdrop-blur-md");
				header.classList.remove("bg-surface-container-lowest");
			} else {
				header.classList.remove("bg-white/95", "backdrop-blur-md");
				header.classList.add("bg-surface-container-lowest");
			}
		};
		window.addEventListener("scroll", onScroll);

		return () => {
			cards.forEach((c) => {
				c.removeEventListener("mouseenter", handleCardHover);
				c.removeEventListener("mouseleave", handleCardLeave);
			});
			window.removeEventListener("scroll", onScroll);
		};
	}, [featured]);

	return (
		<div>


			<main>
				{/* Hero */}
				<Hero hero={hero} />

				{/* Trust */}
				<section className="bg-surface-container-lowest py-lg border-b border-outline-variant">
					<div className="max-w-max-width mx-auto px-gutter grid grid-cols-1 md:grid-cols-3 gap-lg">
						<div className="flex items-center gap-sm">
							<span className="material-symbols-outlined text-primary text-4xl">local_shipping</span>
							<div>
								<h4 className="font-headline-sm text-headline-sm text-on-surface">Miễn phí giao hàng</h4>
								<p className="font-body-sm text-body-sm text-on-surface-variant">Cho mọi đơn hàng trên 2.000.000đ</p>
							</div>
						</div>
						<div className="flex items-center gap-sm">
							<span className="material-symbols-outlined text-primary text-4xl">support_agent</span>
							<div>
								<h4 className="font-headline-sm text-headline-sm text-on-surface">Hỗ trợ 24/7</h4>
								<p className="font-body-sm text-body-sm text-on-surface-variant">Đội ngũ chuyên nghiệp luôn sẵn sàng</p>
							</div>
						</div>
						<div className="flex items-center gap-sm">
							<span className="material-symbols-outlined text-primary text-4xl">verified_user</span>
							<div>
								<h4 className="font-headline-sm text-headline-sm text-on-surface">Thanh toán bảo mật</h4>
								<p className="font-body-sm text-body-sm text-on-surface-variant">Cam kết an toàn tuyệt đối 100%</p>
							</div>
						</div>
					</div>
				</section>

				{/* Category Spotlight */}
				<section className="py-xl max-w-max-width mx-auto px-gutter">
					<div className="flex flex-col md:flex-row gap-gutter h-auto md:h-[600px]">
						{Array.isArray(categories) && categories.length >= 3 ? (
							<>
								<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
									<img alt={categories[0].name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={categories[0].image} />
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-lg">
										<div className="text-white">
											<h3 className="font-headline-md text-headline-md mb-2">{categories[0].name}</h3>
											<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
										</div>
									</div>
								</div>
								<div className="flex-1 flex flex-col gap-gutter">
									<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
										<img alt={categories[1].name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={categories[1].image} />
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-lg">
											<div className="text-white">
												<h3 className="font-headline-md text-headline-md mb-2">{categories[1].name}</h3>
												<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
											</div>
										</div>
									</div>
									<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
										<img alt={categories[2].name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={categories[2].image} />
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-lg">
											<div className="text-white">
												<h3 className="font-headline-md text-headline-md mb-2">{categories[2].name}</h3>
												<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<>
								<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
									<img alt="Thời trang Nữ" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1jv8UoPjv77YvFoh_lCRlH_8qFxfWxaocWQBEQzpNsPqfwI98JQnuSUt3k7rnTXwXH6RALIoo-ex59wJ5k_0i4cZ4QblXYqBhl3d1wla8i1JA_8w4rR31kNSlf97AGMyOSqYfbHSR4GTUMkhBytKV_xbS0Jkra-1N4aam_L_F2wSP9fqmJWzQ1nWcnM_vScMXNpUv39HvPvNPBYbJgKRt3Nt63ZZqY3hcVuCiYgB1Wl70wMctZB17quwcgDuv-qx0ZVOKnAIVj1n_" />
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-end items-end p-lg">
										<div className="text-white">
											<h3 className="font-headline-md text-headline-md mb-2">Thời trang Nữ</h3>
											<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
										</div>
									</div>
								</div>
								<div className="flex-1 flex flex-col gap-gutter">
									<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
										<img alt="Thời trang Nam" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAB0Fx_N6pWcosOr-o9AOiOnwQPdMt5WDluWBKP9tkuusswuxU7n_97Jk511_jua128yH-OS4-O0z8RhGkck69I9SR3m4amucFplfO-CEehDJHpc0LTj3HeIXl9ZdeC9yQM1kOeAYB28s_u6vmX6FE38Weam_qw8S3zB1weps7hW1xAAz4NDcIFFfOZBTH__c6Wc0lrABrWlr4RAoWrpHcJzheA7ck4QteH8h-QjM5FOZPYMGrJzkR9DqR34FSETlrn5BqPBrlHfmHT" />
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-lg">
											<div className="text-white">
												<h3 className="font-headline-md text-headline-md mb-2">Thời trang Nam</h3>
												<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
											</div>
										</div>
									</div>
									<div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container">
										<img alt="Phụ kiện" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7kfP8hxwhqvWPl3eBUB0w61PYth9HLbyrJXJiHE8sJp56HeCus2HhSu42DFKV3qzb8Puswb8JRx7InKVC5DT7ZQ1kif-uMwBLbSoOQj21Z0S2VwSOKi-NDxsgeBJePGzeCx-8pNihSBwCpwHBOKQb0lR_boxueooJtEMrZk9w0BC3kBjdkRp4GB67YlGlOSQcd0dk3bKDarJzeo5RoQ8N5XMd83e2dUnz0UgEUypK6FXkbMc-yRjFeGDsruvQ4hoAwU56oAwEQpH1" />
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-lg">
											<div className="text-white">
												<h3 className="font-headline-md text-headline-md mb-2">Phụ kiện</h3>
												<a className="font-label-md text-label-md underline hover:text-primary-fixed transition-colors" href="#">Xem bộ sưu tập</a>
											</div>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</section>

				<section className="py-xl bg-surface-container-low">
					<div className="max-w-max-width mx-auto px-gutter">
						<div className="flex justify-between items-end mb-lg">
							<div>
								<h2 className="font-headline-md text-headline-md text-on-surface">Sản phẩm nổi bật</h2>
								<div className="w-12 h-1 bg-primary mt-2"></div>
							</div>
							<Link className="font-label-md text-label-md text-primary hover:underline" to="/products">Xem tất cả</Link>
						</div>

						{loading ? (
							<div>Đang tải...</div>
						) : error ? (
							<div className="text-red-600">{error}</div>
						) : (
							<div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
								{(Array.isArray(featured) ? featured.slice(0, 4) : []).map((p) => (
									<Link key={p.id} to={`/products/${p.id}`} className="group bg-surface-container-lowest border border-outline-variant hover:border-primary transition-all duration-300 rounded-lg overflow-hidden">
										<div className="relative overflow-hidden aspect-[3/4]">
											<img alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={p.image} />
											<button className="absolute bottom-4 right-4 bg-primary-container text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
												<span className="material-symbols-outlined">add_shopping_cart</span>
											</button>
										</div>
										<div className="p-sm text-center">
											<p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{p.category}</p>
											<h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{p.name}</h3>
											<div className="mt-2">
												{p.discountAmount > 0 && p.originalPrice > p.price && (
													<p className="text-body-sm text-secondary line-through">
														{Number(p.originalPrice || 0).toLocaleString("vi-VN")} VNĐ
													</p>
												)}
												<p className="font-body-md text-body-md font-bold text-primary">{p.priceDisplay}</p>
											</div>
										</div>
									</Link>
								))}
							</div>
						)}
					</div>
				</section>

				<section className="py-xl">
					<div className="max-w-max-width mx-auto px-gutter">
						<div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-primary-container">
							<div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-md text-white">
								<h2 className="font-display-lg text-display-lg mb-sm">Giảm giá mùa hè</h2>
								<p className="font-body-lg text-body-lg mb-lg opacity-90 max-w-2xl">Cơ hội sở hữu những thiết kế đẳng cấp với ưu đãi lên đến 50%. Áp dụng cho toàn bộ danh mục sản phẩm New Arrivals.</p>
								<div className="flex gap-sm">
									<div className="bg-white/20 backdrop-blur-md px-md py-sm rounded-lg border border-white/30"><span className="font-headline-md text-headline-md block">12</span><span className="font-label-sm text-label-sm uppercase">Ngày</span></div>
									<div className="bg-white/20 backdrop-blur-md px-md py-sm rounded-lg border border-white/30"><span className="font-headline-md text-headline-md block">08</span><span className="font-label-sm text-label-sm uppercase">Giờ</span></div>
									<div className="bg-white/20 backdrop-blur-md px-md py-sm rounded-lg border border-white/30"><span className="font-headline-md text-headline-md block">45</span><span className="font-label-sm text-label-sm uppercase">Phút</span></div>
								</div>
								<button className="mt-lg bg-white text-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-surface-container transition-all">Khám Phá Ngay</button>
							</div>
						</div>
					</div>
				</section>

				{/* <section className="py-xl bg-surface-container border-t border-outline-variant">
					<div className="max-w-max-width mx-auto px-gutter text-center">
						<h3 className="font-headline-md text-headline-md text-on-surface mb-sm">Trải nghiệm phong cách LUXE</h3>
						<p className="font-body-md text-body-md text-on-surface-variant mb-lg  mx-auto">Đăng ký để nhận thông tin về các bộ sưu tập giới hạn và ưu đãi độc quyền sớm nhất.</p>
						<form className="flex flex-col md:flex-row gap-xs mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn!') }}>
							<input className="flex-1 bg-white border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:border-primary transition-colors font-body-sm text-body-sm" placeholder="Email của bạn" type="email" />
							<button className="bg-primary text-white font-label-md text-label-md px-md py-sm rounded-lg whitespace-nowrap hover:bg-on-primary-fixed-variant transition-colors" type="submit">Đăng ký</button>
						</form>
					</div>
				</section> */}
			</main>


		</div>
	);
}
