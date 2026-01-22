'use client';

import { useState, useTransition } from 'react';
import { Portfolio } from '@/types';
import { switchPortfolio, addPortfolio, deletePortfolio } from '@/app/actions';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';
import styles from './PortfolioSwitcher.module.css';

interface Props {
    portfolios: Portfolio[];
    currentId: string;
}

export default function PortfolioSwitcher({ portfolios, currentId }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    const currentPortfolio = portfolios.find(p => p.id === currentId) || portfolios[0];

    const handleSwitch = (id: string) => {
        startTransition(async () => {
            await switchPortfolio(id);
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
                                <span>{p.name}</span>
                                {portfolios.length > 1 && (
                                    <button className={styles.deleteBtn} onClick={(e) => handleDelete(e, p.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!showAdd ? (
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
            )}
        </div>
    );
}
