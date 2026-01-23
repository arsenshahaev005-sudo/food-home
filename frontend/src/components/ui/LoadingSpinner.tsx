export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  className?: string;
  label?: string;
}

const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  label
}: LoadingSpinnerProps) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  const colorClasses: Record<string, string> = {
    primary: 'border-primary-200 border-t-primary',
    secondary: 'border-secondary-200 border-t-secondary',
    success: 'border-success-200 border-t-success',
    warning: 'border-warning-200 border-t-warning',
    error: 'border-error-200 border-t-error',
    gray: 'border-gray-200 border-t-gray-500'
  };

  const ariaLabel = label || 'Загрузка...';

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`} role="status" aria-live="polite" aria-label={ariaLabel}>
      <div
        className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-gray-600 animate-pulse">{label}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
