'use client';

import { useState } from 'react';
import { addInvestment } from '@/app/actions';
import { Plus, Loader2 } from 'lucide-react';
import styles from './InvestmentForm.module.css';

export default function InvestmentForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [currency, setCurrency] = useState('GBP');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const res = await addInvestment(null, formData);

        setLoading(false);
        if (res?.message === 'Investment added successfully') {
            setIsOpen(false);
            setCurrency('GBP');
            (e.target as HTMLFormElement).reset();
        } else {
            setError('Failed to add investment. Check symbol or try again.');
        }
    };

    if (!isOpen) {
        return (
            <button className={styles.addBtn} onClick={() => setIsOpen(true)}>
                <Plus size={20} />
                Add New Investment
            </button>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Add Investment</h3>
                <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>Cancel</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label>Type</label>
                        <select name="type" className={styles.input}>
                            <option value="fund">Fund</option>
                            <option value="etf">ETF</option>
                            <option value="stock">Stock</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Symbol / ISIN</label>
                        <input name="symbol" placeholder="e.g. VOD:LSE or MU:NSQ" required className={styles.input} />
                        <span className={styles.hint}>FT.com symbol preferred</span>
                    </div>

                    <div className={styles.field}>
                        <label>Name</label>
                        <input name="name" placeholder="Name" required className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Region</label>
                        <input name="region" placeholder="UK / Global" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Sector</label>
                        <input name="sector" placeholder="Technology" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Quantity</label>
                        <input name="quantity" type="number" step="0.0001" required className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Total Book Cost</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input name="bookCost" type="number" step="0.01" required className={styles.input} />
                            <select
                                name="bookCostCurrency"
                                className={styles.input}
                                style={{ width: '80px' }}
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="GBP">GBP</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        <span className={styles.hint}>Total paid for all shares</span>
                    </div>

                    {currency !== 'GBP' && (
                        <div className={styles.field}>
                            <label>Exchange Rate (to GBP)</label>
                            <input
                                name="bookCostExchangeRate"
                                type="number"
                                step="0.0001"
                                placeholder="e.g. 0.78"
                                className={styles.input}
                            />
                            <span className={styles.hint}>1 {currency} = ? GBP (Leave blank to use current)</span>
                        </div>
                    )}

                    <div className={styles.field}>
                        <label>Buy Date</label>
                        <input name="buyDate" type="date" required className={styles.input} />
                    </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" disabled={loading} className={styles.submitBtn}>
                    {loading ? <Loader2 className={styles.spin} /> : 'Add Investment'}
                </button>
            </form>
        </div>
    );
}
