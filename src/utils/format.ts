export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateInput(date: string): string {
  if (!date) return '';
  return date.split('T')[0];
}

export function generateQuoteNumber(prefix: string, num: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(num).padStart(4, '0')}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
