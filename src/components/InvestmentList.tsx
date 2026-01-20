'use client';

import { useState } from 'react';
import { Investment } from '@/types';
import { removeInvestment } from '@/app/actions';
import { Trash2, TrendingUp, TrendingDown, Edit2 } from 'lucide-react';
import EditInvestmentDialog from './EditInvestmentDialog';
import DeleteInvestmentDialog from './DeleteInvestmentDialog';
import styles from './InvestmentList.module.css';

interface Props {
    investments: Investment[];
    exchangeRates: Record<string, number>;
}

export default function InvestmentList({ investments, exchangeRates }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const getRateToGBP = (currency: string) => {
        if (!currency || currency === 'GBP') return 1;
        // We scrape e.g. USDGBP usually. If key is USD, rate is 0.78.
        // So 1 USD = 0.78 GBP. ValueGBP = ValueUSD * 0.78
        return exchangeRates[currency] || 1;
    };

    const totalValueGBP = investments.reduce((sum, inv) => {
        const rate = getRateToGBP(inv.currency || 'GBP');
        const value = (inv.quantity * (inv.currentPrice || 0)) * rate;
        return sum + value;
    }, 0);

    const formatGBP = (val: number) => val.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
    const formatNative = (val: number | undefined | null, currency: string = 'GBP') => {
        const safeVal = (val === undefined || val === null || isNaN(val)) ? 0 : val;
        try {
            const safeCurrency = (currency && currency.length === 3) ? currency : 'GBP';
            return safeVal.toLocaleString('en-GB', { style: 'currency', currency: safeCurrency });
        } catch (e) {
            console.warn('Invalid currency:', currency);
            return `${safeVal.toLocaleString('en-GB')} ${currency || ''}`;
        }
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Holdings</h2>
                    <div className={styles.total}>
                        <span>Total Investments (GBP):</span>
                        <span className={styles.totalValue}>{formatGBP(totalValueGBP)}</span>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Symbol</th>
                                <th>Region</th>
                                <th>Sector</th>
                                <th className="text-right">Holdings</th>
                                <th className="text-right">Price (Native)</th>
                                <th className="text-right"><span title="Book Cost / Quantity">Avg Cost</span></th>
                                <th className="text-right">Change</th>
                                <th className="text-right">Total Cost (GBP)</th>
                                <th className="text-right">Total Return (GBP)</th>
                                <th className="text-right">Value (GBP)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {investments.map((inv) => {
                                // Rates
                                const assetRate = getRateToGBP(inv.currency || 'GBP');
                                let costRate = getRateToGBP(inv.bookCostCurrency || 'GBP');

                                if (inv.bookCostExchangeRate && inv.bookCostExchangeRate > 0) {
                                    costRate = inv.bookCostExchangeRate;
                                }

                                // Values
                                const valueNative = inv.quantity * (inv.currentPrice || 0);
                                const valueGBP = valueNative * assetRate;

                                const costNative = inv.bookCost; // This is total book cost in entered currency
                                const costGBP = costNative * costRate;

                                const gainGBP = valueGBP - costGBP;
                                const gainPercent = costGBP > 0 ? (gainGBP / costGBP) * 100 : 0;

                                const avgCostNative = inv.quantity > 0 ? costNative / inv.quantity : 0;

                                const isPositive = (inv.dailyChangePercent || 0) >= 0;
                                const isGain = gainGBP >= 0;

                                return (
                                    <tr key={inv.id}>
                                        <td className={styles.nameCell}>{inv.name}</td>
                                        <td className={styles.subtle}>{inv.symbol}</td>
                                        <td>{inv.region}</td>
                                        <td>{inv.sector}</td>
                                        <td className="text-right">{inv.quantity.toLocaleString()}</td>
                                        <td className="text-right">
                                            {formatNative(inv.currentPrice || 0, inv.currency)}
                                        </td>
                                        <td className="text-right subtle">
                                            {formatNative(avgCostNative, inv.bookCostCurrency)}
                                        </td>
                                        <td className={`text-right ${isPositive ? styles.positive : styles.negative}`}>
                                            <div className={styles.changeWrapper}>
                                                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {inv.dailyChangePercent?.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="text-right subtle">
                                            {formatGBP(costGBP)}
                                            {inv.bookCostCurrency !== 'GBP' && <div className={styles.tiny}>({formatNative(costNative, inv.bookCostCurrency)})</div>}
                                        </td>
                                        <td className={`text-right ${isGain ? styles.positive : styles.negative}`}>
                                            {formatGBP(gainGBP)}
                                            <br />
                                            <span style={{ fontSize: '0.8em' }}>({gainPercent.toFixed(2)}%)</span>
                                        </td>
                                        <td className="text-right font-bold">
                                            {formatGBP(valueGBP)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => setEditingId(inv.id)}
                                                    className={styles.editBtn}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(inv.id)}
                                                    className={styles.deleteBtn}
                                                    title="Sell/Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {investments.length === 0 && (
                                <tr>
                                    <td colSpan={12} className={styles.empty}>No investments added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingId && (
                <EditInvestmentDialog
                    investment={investments.find(i => i.id === editingId)!}
                    onClose={() => setEditingId(null)}
                />
            )}

            {deletingId && (
                <DeleteInvestmentDialog
                    investment={investments.find(i => i.id === deletingId)!}
                    exchangeRates={exchangeRates}
                    onClose={() => setDeletingId(null)}
                    onConfirm={async (id, val, add) => {
                        await removeInvestment(id, val, add);
                        setDeletingId(null);
                    }}
                />
            )}
        </>
    );
}
