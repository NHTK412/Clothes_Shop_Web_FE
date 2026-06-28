const PageHeader = ({ timeRange, setTimeRange }) => {
  return (
    <section className="flex flex-col md:flex-row md:items-end justify-between gap-md">
      <div>
        <h2 className="font-display-lg md:font-headline-md text-on-surface font-bold">Dashboard Tổng quan</h2>
        <p className="text-on-surface-variant font-body-sm">Chào mừng bạn trở lại, đây là hiệu suất của cửa hàng hôm nay.</p>
      </div>
      <div className="flex items-center gap-sm bg-white border border-outline-variant p-2 rounded-lg">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border-none bg-transparent font-label-md focus:ring-0 cursor-pointer outline-none"
        >
          <option value="7days">7 ngày qua</option>
          <option value="30days">30 ngày qua</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>
    </section>
  );
};

export default PageHeader;
