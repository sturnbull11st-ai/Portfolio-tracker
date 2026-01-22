import { getPortfolio } from '@/lib/storage';
import CashManager from '@/components/CashManager';
import InvestmentList from '@/components/InvestmentList';
import InvestmentForm from '@/components/InvestmentForm';
import PortfolioSwitcher from '@/components/PortfolioSwitcher';
import Link from 'next/link';
import { LayoutDashboard, LineChart, TrendingUp, RefreshCw } from 'lucide-react';
import { refreshPortfolio } from './actions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getPortfolio();
  const portfolio = data.portfolios.find(p => p.id === data.currentPortfolioId) || data.portfolios[0];

  const totalInvestmentsGBP = portfolio.investments.reduce((s, i) => {
    const rate = (i.currency && i.currency !== 'GBP') ? (data.exchangeRates[i.currency] || 1) : 1;
    return s + (i.quantity * (i.currentPrice || 0) * rate);
  }, 0);

  const totalPortfolioValue = portfolio.cash + totalInvestmentsGBP;

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>Total Portfolio Value</h3>
              <PortfolioSwitcher portfolios={data.portfolios} currentId={data.currentPortfolioId} />
            </div>
            <div className={styles.totalValue}>
              {totalPortfolioValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
            </div>
            <div className={styles.lastUpdated}>
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
              <form action={refreshPortfolio} className={styles.refreshForm}>
                <button type="submit" className={styles.refreshBtn} title="Refresh Prices">
                  <RefreshCw size={14} />
                </button>
              </form>
            </div>
          </div>

          <CashManager initialCash={portfolio.cash} />
        </div>

        <InvestmentList investments={portfolio.investments} exchangeRates={data.exchangeRates} />
        <InvestmentForm />
      </main>
    </div>
  );
}
