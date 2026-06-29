const PageHeader = ({
  actions,
  eyebrow,
  timeRange,
  setTimeRange,
  title = 'Tổng quan',
  subtitle = 'Chào mừng bạn trở lại, đây là hiệu suất của cửa hàng hôm nay.',
}) => {
  const showTimeRange = timeRange != null && typeof setTimeRange === 'function';

  return (
    <header className="flex flex-col justify-between gap-md md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-sm font-medium text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="font-headline-md text-headline-md text-on-background">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions || showTimeRange ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
          {showTimeRange ? (
            <div className="flex items-center gap-sm rounded-lg border border-outline-variant bg-white p-2">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">calendar_today</span>
              <select
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
                className="cursor-pointer border-none bg-transparent font-label-md outline-none focus:ring-0"
              >
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};

export default PageHeader;
