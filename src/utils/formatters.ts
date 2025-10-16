export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}