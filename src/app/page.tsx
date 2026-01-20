import { getPortfolio } from '@/lib/storage';
import CashManager from '@/components/CashManager';
import InvestmentList from '@/components/InvestmentList';
import InvestmentForm from '@/components/InvestmentForm';
import Link from 'next/link';
import { LayoutDashboard, LineChart, TrendingUp, RefreshCw } from 'lucide-react';
import { refreshPortfolio } from './actions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const portfolio = await getPortfolio();

  return (
    <div className="container">
      <header className={styles.header}>
        <div className={styles.logo}>
          <LayoutDashboard color="var(--accent-color)" size={32} />
          <h1>Antigravity Portfolio</h1>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.activeLink}>Overview</Link>
          <Link href="/charts" className={styles.link}>
            <LineChart size={18} />
            Charts
          </Link>
          <Link href="/summary" className={styles.link}>
            <TrendingUp size={18} />
            Summary
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.topSection}>
          <div className={styles.summaryCard}>
            <h3>Total Portfolio Value</h3>
            <div className={styles.totalValue}>
              {(portfolio.cash + portfolio.investments.reduce((s, i) => {
                // Fallback rate logic duplicate for server render
                const rate = (i.currency && i.currency !== 'GBP') ? (portfolio.exchangeRates[i.currency] || 1) : 1;
                return s + (i.quantity * (i.currentPrice || 0) * rate);
              }, 0))
                .toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
            </div>
            <div className={styles.lastUpdated}>
              Last updated: {new Date(portfolio.lastUpdated).toLocaleString()}
              <form action={refreshPortfolio} className={styles.refreshForm}>
                <button type="submit" className={styles.refreshBtn} title="Refresh Prices">
                  <RefreshCw size={14} />
                </button>
              </form>
            </div>
          </div>

          <CashManager initialCash={portfolio.cash} />
        </div>

        <InvestmentList investments={portfolio.investments} exchangeRates={portfolio.exchangeRates} />
        <InvestmentForm />
      </main>
    </div>
  );
}
