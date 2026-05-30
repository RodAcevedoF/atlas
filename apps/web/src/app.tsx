import { useEffect, useState } from 'react';
import './app.css';
import { useMarketRepository } from './providers.tsx';
import type {
	MarketCategory,
	MarketRecord,
	MarketStatus,
} from './repositories/market-repository.ts';
import {
	loadMarketDashboard,
	type MarketDashboardData,
} from './use-cases/load-market-dashboard.ts';
import { syncMarketSnapshot } from './use-cases/sync-market-snapshot.ts';

const CATEGORY_OPTIONS: Array<{ label: string; value: MarketCategory }> = [
	{ label: 'Politics', value: 'politics' },
	{ label: 'Crypto', value: 'crypto' },
	{ label: 'Sports', value: 'sports' },
	{ label: 'Economics', value: 'economics' },
	{ label: 'Science', value: 'science' },
	{ label: 'Culture', value: 'culture' },
	{ label: 'Other', value: 'other' },
];

const STATUS_OPTIONS: Array<{ label: string; value: MarketStatus }> = [
	{ label: 'Active', value: 'active' },
	{ label: 'Closed', value: 'closed' },
	{ label: 'Resolved', value: 'resolved' },
];

const REGION_CARDS = [
	'North America',
	'Latin America',
	'Europe',
	'Middle East',
	'Africa',
	'Asia-Pacific',
];

function formatCompactCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(value);
}

function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null): string {
	if (!value) return 'Open-ended';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Open-ended';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}

function topOutcomeLabel(market: MarketRecord): string {
	const topOutcome = [...market.outcomes].sort(
		(left, right) => right.price - left.price,
	)[0];
	if (!topOutcome) return 'No outcome pricing yet';
	return `${topOutcome.name} ${formatPercent(topOutcome.price)}`;
}

export function App() {
	const repository = useMarketRepository();
	const [category, setCategory] = useState<MarketCategory | ''>('');
	const [status, setStatus] = useState<MarketStatus | ''>('active');
	const [dashboard, setDashboard] = useState<MarketDashboardData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function run(): Promise<void> {
			setIsLoading(true);
			setError(null);

			try {
				const result = await loadMarketDashboard(repository, {
					markets: {
						status: status || undefined,
						category: category || undefined,
						limit: 24,
					},
					events: { limit: 6 },
				});
				if (!cancelled) setDashboard(result);
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error ?
							loadError.message
						:	'Failed to load dashboard',
					);
				}
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}

		void run();

		return () => {
			cancelled = true;
		};
	}, [category, repository, refreshKey, status]);

	async function handleSync(): Promise<void> {
		setIsSyncing(true);
		setError(null);

		try {
			const result = await syncMarketSnapshot(repository, {
				categories: category ? [category] : undefined,
				maxMarkets: 100,
			});
			setSyncMessage(`Synced ${result.upserted} markets from Polymarket.`);
			setRefreshKey((value) => value + 1);
		} catch (syncError) {
			setError(
				syncError instanceof Error ?
					syncError.message
				:	'Failed to sync market snapshot',
			);
		} finally {
			setIsSyncing(false);
		}
	}

	const categorySummary = dashboard?.categorySummary.slice(0, 5) ?? [];
	const markets = dashboard?.markets ?? [];
	const events = dashboard?.events ?? [];

	return (
		<main className='appShell'>
			<div className='dashboard'>
				<section className='hero'>
					<article className='panel'>
						<div className='eyebrow'>Atlas / Market Pulse MVP</div>
						<h1 className='heroTitle'>
							See where prediction markets are concentrating attention.
						</h1>
						<p className='heroLead'>
							This release gives you a read-side market pulse over stored
							Polymarket data: active questions, event clusters, category
							volume, and a clean path toward regional mapping.
						</p>

						<div className='heroActions'>
							<button
								className='actionButton'
								onClick={() => void handleSync()}
								disabled={isSyncing}>
								{isSyncing ? 'Syncing snapshot...' : 'Sync latest markets'}
							</button>
							<div className='hint'>
								{syncMessage ??
									'Use the sync action to pull fresh Gamma markets into MongoDB.'}
							</div>
						</div>

						<div className='filters'>
							<select
								className='filterSelect'
								value={status}
								onChange={(event) =>
									setStatus(event.target.value as MarketStatus | '')
								}>
								<option value=''>All statuses</option>
								{STATUS_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>

							<select
								className='filterSelect'
								value={category}
								onChange={(event) =>
									setCategory(event.target.value as MarketCategory | '')
								}>
								<option value=''>All categories</option>
								{CATEGORY_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</article>

					<aside className='heroAside'>
						<article className='panel mapCard'>
							<div className='sectionLabel'>Geo map next</div>
							<p className='bodyCopy'>
								The world-map view needs one more layer: derived region tags on
								events and markets. This panel marks the target surface for the
								next iteration without pretending you already have country-level
								sentiment data.
							</p>

							<div className='mapGrid'>
								{REGION_CARDS.map((region) => (
									<div className='mapRegion' key={region}>
										<div className='meta'>Planned region</div>
										<strong>{region}</strong>
									</div>
								))}
							</div>
						</article>
					</aside>
				</section>

				{error ?
					<div className='errorBanner'>{error}</div>
				:	null}

				<section className='stats'>
					<article className='panel'>
						<div className='statLabel'>Active markets</div>
						<div className='statValue'>
							{isLoading ? '...' : (dashboard?.activeMarketCount ?? 0)}
						</div>
					</article>
					<article className='panel'>
						<div className='statLabel'>Tracked volume</div>
						<div className='statValue'>
							{isLoading ?
								'...'
							:	formatCompactCurrency(dashboard?.totalVolumeUsd ?? 0)}
						</div>
					</article>
					<article className='panel'>
						<div className='statLabel'>Tracked liquidity</div>
						<div className='statValue'>
							{isLoading ?
								'...'
							:	formatCompactCurrency(dashboard?.totalLiquidityUsd ?? 0)}
						</div>
					</article>
				</section>

				<section className='contentGrid'>
					<article className='panel'>
						<div className='sectionLabel'>Markets</div>
						<p className='bodyCopy'>
							Read-side view over stored markets. The dashboard stays useful
							even before the AI analysis modules land.
						</p>

						<div className='tableWrap'>
							<table className='marketTable'>
								<thead>
									<tr>
										<th>Market</th>
										<th>Category</th>
										<th>Status</th>
										<th>Top outcome</th>
										<th>Volume</th>
										<th>Resolves</th>
									</tr>
								</thead>
								<tbody>
									{markets.length > 0 ?
										markets.map((market) => (
											<tr key={market.id}>
												<td>
													<p className='marketTitle'>{market.title}</p>
													<p className='marketDescription'>
														{market.description || 'No description'}
													</p>
												</td>
												<td>
													<span className='chip'>{market.category}</span>
												</td>
												<td>
													<span className='badge' data-status={market.status}>
														{market.status}
													</span>
												</td>
												<td>{topOutcomeLabel(market)}</td>
												<td>{formatCompactCurrency(market.volumeUsd)}</td>
												<td>{formatDate(market.resolvesAt)}</td>
											</tr>
										))
									:	<tr>
											<td colSpan={6} className='muted'>
												{isLoading ?
													'Loading markets...'
												:	'No markets stored yet. Use Sync latest markets to populate the dashboard.'
												}
											</td>
										</tr>
									}
								</tbody>
							</table>
						</div>
					</article>

					<div className='stack'>
						<article className='panel'>
							<div className='sectionLabel'>Category pulse</div>
							<div className='stack' style={{ marginTop: 16 }}>
								{categorySummary.length > 0 ?
									categorySummary.map((entry) => (
										<div className='summaryCard' key={entry.category}>
											<div className='summaryRow'>
												<div>
													<div className='meta'>{entry.count} markets</div>
													<h3 className='summaryTitle'>{entry.category}</h3>
												</div>
												<strong>
													{formatCompactCurrency(entry.volumeUsd)}
												</strong>
											</div>
										</div>
									))
								:	<div className='muted'>No category summary yet.</div>}
							</div>
						</article>

						<article className='panel'>
							<div className='sectionLabel'>Events</div>
							<div className='stack' style={{ marginTop: 16 }}>
								{events.length > 0 ?
									events.map((event) => (
										<article className='eventCard' key={event.id}>
											<div className='badgeRow'>
												<span className='chip'>{event.category}</span>
												<span className='chip'>
													{event.marketIds.length} linked markets
												</span>
											</div>
											<h3 className='eventTitle'>{event.title}</h3>
											<p className='bodyCopy'>
												{event.description || 'No event description available.'}
											</p>
										</article>
									))
								:	<div className='muted'>
										{isLoading ?
											'Loading events...'
										:	'No events stored yet. The sync action now persists events during ingestion.'
										}
									</div>
								}
							</div>
						</article>
					</div>
				</section>
			</div>
		</main>
	);
}
