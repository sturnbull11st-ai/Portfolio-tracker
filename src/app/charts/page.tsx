import { getPortfolio } from '@/lib/storage';
import HistoryChart from '@/components/HistoryChart';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ChartsPage() {
    const portfolio = await getPortfolio();

    const chartsData = portfolio.investments.map((inv) => {
        // Construct history points
        // 1. Start with stored history
        let points = [...(inv.history || [])];

        // Fallback if no history (legacy data)
        if (points.length === 0 && inv.quantity > 0) {
            const initialPrice = inv.bookCost / inv.quantity;
            points.push({ date: inv.buyDate, price: initialPrice });
        }

        // 2. Add current price as "Today/Now" if it's newer than last history point
        // Or just ensure we have a line to the right
        const today = new Date().toISOString().split('T')[0];
        const lastPoint = points[points.length - 1];

        // If last point is not today, add current price to extend the line
        if (lastPoint && lastPoint.date < today && inv.currentPrice) {
            points.push({ date: today, price: inv.currentPrice });
        }

        // 3. Sort
        points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Transform to % Return
        // Base is the first point's price (Initial Book Price)
        const initialPrice = points[0]?.price || 1;

        const returnData = points.map(p => ({
            date: p.date,
            value: ((p.price - initialPrice) / initialPrice) * 100
        }));

        return {
            ...inv,
            chartData: returnData
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

            <div className={styles.grid}>
                {chartsData.map((inv) => (
                    <div key={inv.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>{inv.name}</h3>
                            <span className={styles.symbol}>{inv.symbol}</span>
                        </div>
                        <HistoryChart data={inv.chartData} unit="%" />
                    </div>
                ))}
                {chartsData.length === 0 && <p className={styles.empty}>No investments to display.</p>}
            </div>
        </div>
    );
}
