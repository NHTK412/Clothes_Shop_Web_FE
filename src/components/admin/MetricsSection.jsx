const MetricCard = ({ icon, label, value, change, isPositive }) => {
  return (
    <div className="bg-white p-md rounded-xl border border-outline-variant hover:border-primary transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-start mb-sm">
        <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`text-label-sm font-bold px-2 py-1 rounded ${
          isPositive
            ? 'text-green-600 bg-green-50'
            : 'text-error bg-red-50'
        }`}>
          {change}
        </span>
      </div>
      <p className="text-on-surface-variant text-label-sm uppercase tracking-wider">{label}</p>
      <p className="text-headline-md font-bold mt-1">{value}</p>
    </div>
  );
};

const MetricsSection = ({ metrics = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white p-md rounded-xl border border-outline-variant animate-pulse h-32" />
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </section>
  );
};

export default MetricsSection;
