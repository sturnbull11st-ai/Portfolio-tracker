'use client';

import { useState } from 'react';
import { Investment } from '@/types';
import { editInvestment } from '@/app/actions';
import { X, Save, Loader2 } from 'lucide-react';
import styles from './EditInvestmentDialog.module.css';

interface Props {
    investment: Investment;
    onClose: () => void;
}

export default function EditInvestmentDialog({ investment, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState(investment.bookCostCurrency || 'GBP');

    // Use state or just native form submission
    // Creating a native form for simplicity with the action

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        await editInvestment(investment.id, formData);
        setLoading(false);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                <div className={styles.header}>
                    <h3>Edit {investment.symbol}</h3>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>Name</label>
                            <input name="name" defaultValue={investment.name} required className={styles.input} />
                        </div>
                        <div className={styles.field}>
                            <label>Region</label>
                            <input name="region" defaultValue={investment.region} className={styles.input} />
                        </div>
                        <div className={styles.field}>
                            <label>Sector</label>
                            <input name="sector" defaultValue={investment.sector} className={styles.input} />
                        </div>
                        <div className={styles.field}>
                            <label>Quantity</label>
                            <input name="quantity" type="number" step="0.0001" defaultValue={investment.quantity} required className={styles.input} />
                        </div>
                        <div className={styles.field}>
                            <label>Total Book Cost</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input name="bookCost" type="number" step="0.01" defaultValue={investment.bookCost} required className={styles.input} />
                                <select
                                    name="bookCostCurrency"
                                    defaultValue={investment.bookCostCurrency}
                                    className={styles.input}
                                    style={{ width: '80px' }}
                                    onChange={(e) => setCurrency(e.target.value)}
                                >
                                    <option value="GBP">GBP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        {currency !== 'GBP' && (
                            <div className={styles.field}>
                                <label>Exchange Rate (to GBP)</label>
                                <input
                                    name="bookCostExchangeRate"
                                    type="number"
                                    step="0.0001"
                                    defaultValue={investment.bookCostExchangeRate}
                                    placeholder="e.g. 0.78"
                                    className={styles.input}
                                />
                                <span className={styles.hint} style={{ fontSize: '0.75rem', color: '#94a3b8' }}>1 {currency} = ? GBP</span>
                            </div>
                        )}
                        <div className={styles.field}>
                            <label>Buy Date</label>
                            <input name="buyDate" type="date" defaultValue={investment.buyDate} required className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" disabled={loading} className={styles.saveBtn}>
                            {loading ? <Loader2 className={styles.spin} size={18} /> : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
