'use client';

import { useState } from 'react';
import { updateCash } from '@/app/actions';
import { Wallet, Edit2, Check, X } from 'lucide-react';
import styles from './CashManager.module.css';

interface Props {
    initialCash: number;
}

export default function CashManager({ initialCash }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [amount, setAmount] = useState(initialCash.toString());
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const val = parseFloat(amount);
        if (!isNaN(val)) {
            await updateCash(val);
            setIsEditing(false);
        }
        setLoading(false);
    };

    const handleCancel = () => {
        setAmount(initialCash.toString());
        setIsEditing(false);
    };

    return (
        <div className={styles.card}>
            <div className={styles.iconWrapper}>
                <Wallet size={24} color="var(--accent-color)" />
            </div>
            <div className={styles.content}>
                <h3>Cash Holdings</h3>
                {isEditing ? (
                    <div className={styles.editForm}>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={styles.input}
                            autoFocus
                        />
                        <div className={styles.actions}>
                            <button onClick={handleSave} disabled={loading} className={styles.saveBtn}>
                                <Check size={18} />
                            </button>
                            <button onClick={handleCancel} className={styles.cancelBtn}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.valueWrapper}>
                        <span className={styles.value}>
                            {initialCash.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                        </span>
                        <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                            <Edit2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
