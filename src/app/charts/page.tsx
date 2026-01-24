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

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

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
    });
    allDatesSet.add(today);
    const sortedDates = Array.from(allDatesSet).sort();

    // 1. Calculate History
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

    // 2. Aggregate Charts Data (Starts from today)
    const filterFromToday = (history: { date: string, value: number }[]) => {
        return history.filter(h => h.date >= today);
    };

    const calculateWeeklyChange = (history: { date: string, value: number }[]) => {
        const current = history[history.length - 1]?.value || 0;
        const weekAgoPoint = [...history].reverse().find(h => h.date <= sevenDaysAgoStr) || history[0];
        const weekAgoValue = weekAgoPoint?.value || 0;

        if (weekAgoValue === 0) return 0;
        return ((current - weekAgoValue) / weekAgoValue) * 100;
    };

    const totalGBPChart = filterFromToday(totalHistory);
    const totalWeeklyChange = calculateWeeklyChange(totalHistory);

    const portfoliosWithCharts = portfolios.map(p => {
        const history = portfolioHistories[p.id];
        return {
            ...p,
            chartData: filterFromToday(history),
            weeklyChange: calculateWeeklyChange(history)
        };
    }).filter(p => p.chartData.length > 0);

    // 3. Individual Charts Data (Remains % Returns)
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
                <div className={styles.sectionHeader}>
                    <h2>Overall Portfolio Value (GBP)</h2>
                    <span className={`${styles.badge} ${totalWeeklyChange >= 0 ? styles.positive : styles.negative}`}>
                        Weekly: {totalWeeklyChange >= 0 ? '+' : ''}{totalWeeklyChange.toFixed(2)}%
                    </span>
                </div>
                <div className={styles.mainChart}>
                    <HistoryChart data={totalGBPChart} isCurrency={true} height={350} />
                </div>
            </section>

            <section className={styles.section}>
                <h2>Returns by Portfolio</h2>
                <div className={styles.grid}>
                    {portfoliosWithCharts.map(p => (
                        <div key={p.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{p.name}</h3>
                                <span className={`${styles.miniBadge} ${p.weeklyChange >= 0 ? styles.positive : styles.negative}`}>
                                    {p.weeklyChange >= 0 ? '+' : ''}{p.weeklyChange.toFixed(2)}%
                                </span>
                            </div>
                            <HistoryChart data={p.chartData} isCurrency={true} />
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2>Individual Investments (%)</h2>
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
