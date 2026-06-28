const ProductPagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageButtons = () => {
    const pages = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="px-md py-4 bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-md border-t border-outline-variant">
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Showing {startItem} to {endItem} of {totalItems} results
      </p>
      <div className="flex items-center gap-xs">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        {getPageButtons().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dots-${index}`} className="px-1 text-on-surface-variant">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-label-sm text-label-sm transition-all ${
                currentPage === page
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default ProductPagination;
