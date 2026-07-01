const TONE_CLASSES = {
  default: 'text-outline hover:bg-surface-container hover:text-primary',
  success: 'text-outline hover:bg-emerald-50 hover:text-emerald-600',
  danger: 'text-outline hover:bg-error-container/40 hover:text-error',
};

const AdminActionButton = ({
  icon,
  label,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    title={label}
    aria-label={label}
    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASSES[tone] ?? TONE_CLASSES.default} ${className}`}
    {...props}
  >
    <span className="material-symbols-outlined text-[20px] leading-none">
      {icon}
    </span>
  </button>
);

export default AdminActionButton;
