const RevenueTrend = ({ revenueData = [] }) => {
  const values = revenueData.length > 0 ? revenueData : Array.from({ length: 12 }, (_, index) => ({ label: `T${index + 1}`, total: 0 }));
  const numericValues = values.map((item) => Number(item.total || 0));
  const maxValue = Math.max(...numericValues, 1);
  const chartHeight = 320; // Fixed px height for calculation

  return (
    <div className="lg:col-span-2 bg-white p-lg rounded-xl border border-outline-variant">
      <div className="flex justify-between items-center mb-lg">
        <h3 className="font-headline-sm text-on-surface">Xu hướng doanh thu</h3>
        <div className="flex items-center gap-xs">
          <span className="w-3 h-3 bg-primary rounded-full"></span>
          <span className="text-label-sm">Theo tháng</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg bg-surface-variant/30 p-3 sm:p-4">
        <div style={{ height: `${chartHeight}px` }} className="flex min-w-[620px] items-end justify-between gap-3 px-2">
          {values.map((item, index) => {
            const numValue = Number(item.total || 0);
            const barHeight = maxValue > 0 ? Math.max((numValue / maxValue) * chartHeight * 0.85, 8) : 8;
            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end gap-2">
                <span className="text-xs font-semibold text-on-surface-variant h-4">
                  {numValue > 0 ? `${(numValue / 1000000).toFixed(1)}M` : '-'}
                </span>
                <div
                  className={`w-full max-w-10 rounded-t-md shadow-md transition-all ${
                    numValue === 0 ? 'bg-surface-variant' : 'bg-primary hover:bg-blue-600 hover:shadow-lg'
                  }`}
                  style={{ height: `${barHeight}px` }}
                  title={`${item.label}: ${numValue.toLocaleString('vi-VN')}₫`}
                />
                <span className="text-xs font-medium text-on-surface-variant">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-sm text-xs text-on-surface-variant text-right px-4">
        Tổng cột: {values.reduce((sum, item) => sum + Number(item.total || 0), 0).toLocaleString('vi-VN')}₫
      </div>
    </div>
  );
};

const SalesCategoryChart = ({ categoryData = [], categoryTotal = 0, categoryProductTotal = 0 }) => {
  const totalCategories = categoryTotal || categoryData.length || 1;
  const totalProducts = categoryProductTotal || categoryData.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
  const categories = categoryData.map((item) => ({
    ...item,
    percentage: Math.round((item.count || 1) / totalProducts * 100),
    color: item.name.includes('Áo') ? 'bg-primary' : item.name.includes('Phụ') ? 'bg-primary-container' : 'bg-secondary-container',
  }));

  const displayTotal = totalCategories;

  return (
    <div className="bg-white p-md rounded-xl border border-outline-variant flex flex-col">
      <h3 className="font-headline-sm text-on-surface mb-md">Danh mục sản phẩm</h3>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-48 h-48 rounded-full border-16 border-primary border-t-primary-container border-r-secondary-container relative flex items-center justify-center">
          <div className="text-center">
            <p className="text-headline-sm font-bold">{displayTotal}</p>
            <p className="text-label-sm text-on-surface-variant">Danh mục</p>
          </div>
        </div>
      </div>
      <div className="mt-md space-y-sm">
        {categories.length > 0 ? categories.map((category) => (
          <div key={category.id ?? category.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 ${category.color} rounded-full`}></span>
              <div>
                <p className="text-label-md">{category.name}</p>
                <p className="text-sm text-on-surface-variant">{category.count ? `${category.count} sản phẩm` : '1 sản phẩm'}</p>
              </div>
            </div>
            <span className="font-bold">{category.percentage}%</span>
          </div>
        )) : (
          <p className="text-sm text-on-surface-variant">Chưa có dữ liệu danh mục.</p>
        )}
      </div>
    </div>
  );
};

const ChartsSection = ({ revenueData = [], categoryData = [], categoryTotal = 0, categoryProductTotal = 0 }) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
      <RevenueTrend revenueData={revenueData} />
      <SalesCategoryChart
        categoryData={categoryData}
        categoryTotal={categoryTotal}
        categoryProductTotal={categoryProductTotal}
      />
    </section>
  );
};

export default ChartsSection;
