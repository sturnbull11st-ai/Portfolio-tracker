import { getPortfolio } from '@/lib/storage';
import { Investment } from '@/types';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { refreshPortfolio } from '../actions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function SummaryPage() {
    const data = await getPortfolio();
    const portfolio = data.portfolios.find(p => p.id === data.currentPortfolioId) || data.portfolios[0];

    // Calculate Data
    let totalValueGBP = 0;
    let totalPrevValueGBP = 0;

    const investments = portfolio.investments.map((inv: Investment) => {
        // 1. Current Value Rate (Live Scraped)
        const marketRate = (inv.currency && inv.currency !== 'GBP') ? (data.exchangeRates[inv.currency] || 1) : 1;
        const fxFee = portfolio.fxFeePercent || 0;
        const rate = inv.currency === 'GBP' ? 1 : marketRate * (1 - (fxFee / 100));

        // 2. Book Cost Rate (Historical/Manual OR Scraped)
        let costRate = 1;
        if (inv.bookCostCurrency && inv.bookCostCurrency !== 'GBP') {
            if (inv.bookCostExchangeRate && inv.bookCostExchangeRate > 0) {
                costRate = inv.bookCostExchangeRate;
            } else {
                const bookMarketRate = data.exchangeRates[inv.bookCostCurrency] || 1;
                costRate = bookMarketRate * (1 - (fxFee / 100));
            }
        }

        // Current Value
        const valueNative = inv.quantity * (inv.currentPrice || 0);
        const valueGBP = valueNative * rate;

        // Cost
        const costNative = inv.bookCost;
        const costGBP = costNative * costRate;

        // Daily Change Logic
        const dailyChangeDec = (inv.dailyChangePercent || 0) / 100;
        const prevValueGBP = valueGBP / (1 + dailyChangeDec);

        // Total Return
        const totalReturnVal = valueGBP - costGBP;
        const totalReturnPct = costGBP > 0 ? (totalReturnVal / costGBP) * 100 : 0;

        // Add to Aggr
        totalValueGBP += valueGBP;
        totalPrevValueGBP += prevValueGBP;

        return {
            ...inv,
            valueGBP,
            totalReturnPct,
            rate,
            currency: inv.currency || 'GBP'
        };
    });

    // Portfolio Aggregates
    const cash = portfolio.cash || 0;
    totalValueGBP += cash;
    totalPrevValueGBP += cash; // Assume cash change is 0% for daily view

    const portfolioDailyChangeVal = totalValueGBP - totalPrevValueGBP;
    const portfolioDailyChangePct = totalPrevValueGBP > 0 ? (portfolioDailyChangeVal / totalPrevValueGBP) * 100 : 0;
    const isPortPositive = portfolioDailyChangeVal >= 0;

    const formatMoney = (val: number, curr = 'GBP') => val.toLocaleString('en-GB', { style: 'currency', currency: curr });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeft size={20} /> Back to Dashboard
                </Link>
                <h1>Investment Summary</h1>
                <form action={refreshPortfolio}>
                    <button type="submit" className={styles.refreshBtn} title="Refresh Prices">
                        <RefreshCw size={18} /> Refresh
                    </button>
                </form>
            </header>

            <div className={styles.overviewCard}>
                <h2>Total Portfolio Value</h2>
                <div className={styles.totalValue}>{formatMoney(totalValueGBP)}</div>
                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '-8px', marginBottom: '16px' }}>
                    Includes Cash: {formatMoney(cash)}
                </div>

                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Daily Change</span>
                        <span className={`${styles.metricValue} ${isPortPositive ? styles.positive : styles.negative}`}>
                            {isPortPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            {portfolioDailyChangePct.toFixed(2)}%
                            <span style={{ fontSize: '0.8em', opacity: 0.8 }}>({formatMoney(portfolioDailyChangeVal)})</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Investment</th>
                            <th className={styles.right}>Daily Change</th>
                            <th className={styles.right}>Value (GBP)</th>
                            <th className={styles.right}>Price</th>
                            <th className={styles.right}>Total Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        {investments.map((inv: any) => {
                            const isPositive = (inv.dailyChangePercent || 0) >= 0;
                            const isRetPositive = inv.totalReturnPct >= 0;

                            return (
                                <tr key={inv.id}>
                                    <td>
                                        <div className={styles.name}>{inv.name}</div>
                                        <span className={styles.symbol}>{inv.symbol}</span>
                                    </td>
                                    <td className={styles.right}>
                                        <div className={`${styles.pill} ${isPositive ? styles.positive : styles.negative}`}>
                                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {inv.dailyChangePercent?.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className={styles.right} style={{ fontWeight: 600 }}>
                                        {formatMoney(inv.valueGBP)}
                                    </td>
                                    <td className={styles.right}>
                                        {formatMoney(inv.currentPrice || 0, inv.currency)}
                                    </td>
                                    <td className={`${styles.right} ${isRetPositive ? styles.positive : styles.negative}`} style={{ fontWeight: 600 }}>
                                        {inv.totalReturnPct > 0 ? '+' : ''}{inv.totalReturnPct.toFixed(2)}%
                                    </td>
                                </tr>
                            );
                        })}
                        {investments.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No investments found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
