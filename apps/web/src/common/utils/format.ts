export function toTitleCase(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCompactCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(value);
}

export function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | null): string {
	if (!value) return 'Open-ended';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Open-ended';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}
