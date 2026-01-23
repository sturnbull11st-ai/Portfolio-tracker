'use client';

import { useState, useTransition } from 'react';
import { Portfolio } from '@/types';
import { switchPortfolio, addPortfolio, deletePortfolio, updatePortfolioSettings } from '@/app/actions';
import { Plus, ChevronDown, Trash2, Settings } from 'lucide-react';
import styles from './PortfolioSwitcher.module.css';

interface Props {
    portfolios: Portfolio[];
    currentId: string;
}

export default function PortfolioSwitcher({ portfolios, currentId }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [showAdd, setShowAdd] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [newName, setNewName] = useState('');
    const [editName, setEditName] = useState('');
    const [editFee, setEditFee] = useState(0);

    const currentPortfolio = portfolios.find(p => p.id === currentId) || portfolios[0];

    const handleSwitch = (id: string) => {
        startTransition(async () => {
            await switchPortfolio(id);
            setIsOpen(false);
            setShowSettings(false);
        });
    };

    const handleOpenSettings = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditName(currentPortfolio.name);
        setEditFee(currentPortfolio.fxFeePercent || 0);
        setShowSettings(true);
        setShowAdd(false);
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            await updatePortfolioSettings(currentPortfolio.id, editName, editFee);
            setShowSettings(false);
            setIsOpen(false);
        });
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        startTransition(async () => {
            await addPortfolio(newName);
            setNewName('');
            setShowAdd(false);
            setIsOpen(false);
        });
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this portfolio?')) return;
        startTransition(async () => {
            await deletePortfolio(id);
        });
    };

    return (
        <div className={styles.container}>
            <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                <span>{currentPortfolio.name}</span>
                <ChevronDown size={16} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.list}>
                        {portfolios.map(p => (
                            <div
                                key={p.id}
                                className={`${styles.item} ${p.id === currentId ? styles.active : ''}`}
                                onClick={() => handleSwitch(p.id)}
                            >
                                <div className={styles.itemInfo}>
                                    <span>{p.name}</span>
                                    {p.id === currentId && (
                                        <button className={styles.settingsBtn} onClick={handleOpenSettings} title="Portfolio Settings">
                                            <Settings size={14} />
                                        </button>
                                    )}
                                </div>
                                {portfolios.length > 1 && (
                                    <button className={styles.deleteBtn} onClick={(e) => handleDelete(e, p.id)} title="Delete Portfolio">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className={styles.actions}>
                        {showSettings ? (
                            <form onSubmit={handleSaveSettings} className={styles.addForm}>
                                <div className={styles.formGroup}>
                                    <label>Portfolio Name</label>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>FX Fee (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editFee}
                                        onChange={e => setEditFee(parseFloat(e.target.value))}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.addActions}>
                                    <button type="button" onClick={() => setShowSettings(false)}>Cancel</button>
                                    <button type="submit" disabled={isPending}>Save</button>
                                </div>
                            </form>
                        ) : !showAdd ? (
                            <button className={styles.addTrigger} onClick={() => setShowAdd(true)}>
                                <Plus size={14} /> Add Portfolio
                            </button>
                        ) : (
                            <form onSubmit={handleAdd} className={styles.addForm}>
                                <input
                                    autoFocus
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Name (e.g. ISA)"
                                    className={styles.input}
                                />
                                <div className={styles.addActions}>
                                    <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                                    <button type="submit" disabled={isPending}>Create</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
