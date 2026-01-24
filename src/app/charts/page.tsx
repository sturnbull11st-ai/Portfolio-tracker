import { getPortfolio } from '@/lib/storage';
import { Investment } from '@/types';
import HistoryChart from '@/components/HistoryChart';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ChartsPage() {
    const data = await getPortfolio();
    const portfolios = data.portfolios;
    const exchangeRates = data.exchangeRates;

    // 1. Process all investments into objects with standardized histories
    const today = new Date().toISOString().split('T')[0];

    // Group all investments across all portfolios
    const allInvestments = portfolios.flatMap(p =>
        p.investments.map(inv => ({
            ...inv,
            portfolioId: p.id,
            fxFeePercent: p.fxFeePercent || 0
        }))
    );

    // Identify all unique dates across all histories
    const allDatesSet = new Set<string>();
    allInvestments.forEach(inv => {
        (inv.history || []).forEach(h => allDatesSet.add(h.date));
        allDatesSet.add(inv.buyDate);
        allDatesSet.add(today);
    });
    const sortedDates = Array.from(allDatesSet).sort();

    // 2. Calculate daily values for each portfolio and total overall
    // We'll calculate the GBP value of each portfolio on each relevant date
    const portfolioHistories: Record<string, { date: string, value: number }[]> = {};
    const totalHistory: { date: string, value: number }[] = [];

    sortedDates.forEach(date => {
        let dayTotalOverall = 0;

        portfolios.forEach(p => {
            let dayPortfolioTotal = p.cash || 0; // Assume cash is constant historically for simplicity

            p.investments.forEach(inv => {
                // Find correct price for this date
                // We use the last price known on or before this date
                const historyPoint = [...(inv.history || [])]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .find(h => h.date <= date);

                let price = 0;
                if (historyPoint) {
                    price = historyPoint.price;
                } else if (date >= inv.buyDate) {
                    // Fallback to buy price if it's after buy date but no history point yet
                    price = inv.quantity > 0 ? (inv.bookCost / inv.quantity) : 0;
                }

                if (price > 0 && date >= inv.buyDate) {
                    const marketRate = (inv.currency && inv.currency !== 'GBP') ? (exchangeRates[inv.currency] || 1) : 1;
                    const fxFee = p.fxFeePercent || 0;
                    const effectiveRate = inv.currency === 'GBP' ? 1 : marketRate * (1 - (fxFee / 100));
                    dayPortfolioTotal += inv.quantity * price * effectiveRate;
                }
            });

            if (!portfolioHistories[p.id]) portfolioHistories[p.id] = [];
            portfolioHistories[p.id].push({ date, value: dayPortfolioTotal });
            dayTotalOverall += dayPortfolioTotal;
        });

        totalHistory.push({ date, value: dayTotalOverall });
    });

    // 3. Convert to % Return charts
    const transformToPct = (history: { date: string, value: number }[]) => {
        // Find first date with value > 0 to set baseline
        const basePoint = history.find(h => h.value > 0);
        if (!basePoint) return [];

        return history
            .filter(h => h.date >= basePoint.date)
            .map(h => ({
                date: h.date,
                value: ((h.value - basePoint.value) / basePoint.value) * 100
            }));
    };

    const totalPctChart = transformToPct(totalHistory);

    const portfoliosWithCharts = portfolios.map(p => ({
        ...p,
        chartData: transformToPct(portfolioHistories[p.id])
    })).filter(p => p.chartData.length > 0);

    const individualCharts = allInvestments.map(inv => {
        let points = [...(inv.history || [])];
        if (points.length === 0 && inv.quantity > 0) {
            points.push({ date: inv.buyDate, price: inv.bookCost / inv.quantity });
        }
        if (inv.currentPrice && (points.length === 0 || points[points.length - 1].date < today)) {
            points.push({ date: today, price: inv.currentPrice });
        }
        points.sort((a, b) => a.date.localeCompare(b.date));

        const initial = points[0]?.price || 1;
        return {
            ...inv,
            chartData: points.map(p => ({
                date: p.date,
                value: ((p.price - initial) / initial) * 100
            }))
        };
    });

    return (
        <div className="container">
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeft size={20} /> Back to Dashboard
                </Link>
                <h1>Performance Over Time</h1>
            </header>

            <section className={styles.section}>
                <h2>Overall Portfolio Return (%)</h2>
                <div className={styles.mainChart}>
                    <HistoryChart data={totalPctChart} unit="%" height={300} />
                </div>
            </section>

            <section className={styles.section}>
                <h2>Returns by Portfolio</h2>
                <div className={styles.grid}>
                    {portfoliosWithCharts.map(p => (
                        <div key={p.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{p.name}</h3>
                            </div>
                            <HistoryChart data={p.chartData} unit="%" />
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2>Individual Investments</h2>
                <div className={styles.grid}>
                    {individualCharts.map((inv: any) => (
                        <div key={inv.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{inv.name}</h3>
                                <span className={styles.symbol}>{inv.symbol}</span>
                            </div>
                            <HistoryChart data={inv.chartData} unit="%" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
