'use client';

import { useState } from 'react';
import { Investment } from '@/types';
import styles from './DeleteInvestmentDialog.module.css';

interface Props {
    investment: Investment;
    exchangeRates: Record<string, number>;
    onClose: () => void;
    onConfirm: (id: string, saleValueGBP: number, addToCash: boolean) => void;
}

export default function DeleteInvestmentDialog({ investment, exchangeRates, onClose, onConfirm }: Props) {
    // Calculate initial estimated value in GBP
    const getRateToGBP = (currency: string) => {
        if (!currency || currency === 'GBP') return 1;
        return exchangeRates[currency] || 1;
    };

    const rate = getRateToGBP(investment.currency || 'GBP');
    const estimatedValueNative = investment.quantity * (investment.currentPrice || 0);
    const estimatedValueGBP = estimatedValueNative * rate;

    const [saleValue, setSaleValue] = useState<string>(estimatedValueGBP.toFixed(2));
    const [addToCash, setAddToCash] = useState(true);

    const handleConfirm = () => {
        const finalValue = parseFloat(saleValue);
        onConfirm(investment.id, isNaN(finalValue) ? 0 : finalValue, addToCash);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                <h3 className={styles.title}>Sell / Delete Investment</h3>

                <p className={styles.message}>
                    Are you sure you want to remove <strong>{investment.name}</strong>?
                </p>

                <div className={styles.field}>
                    <label className={styles.label}>Sale Value (GBP)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={saleValue}
                        onChange={(e) => setSaleValue(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div className={styles.checkboxRow} onClick={() => setAddToCash(!addToCash)}>
                    <input
                        type="checkbox"
                        checked={addToCash}
                        onChange={() => { }} // Handled by row click
                        className={styles.checkbox}
                    />
                    <span className={styles.checkboxLabel}>Add proceeds to Cash total</span>
                </div>

                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button onClick={handleConfirm} className={styles.confirmBtn}>Confirm</button>
                </div>
            </div>
        </div>
    );
}
