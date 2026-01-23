import { Portfolio, Investment } from './src/types/index.js';

function calculateValueGBP(inv: Investment, marketRate: number, fxFeePercent: number): number {
    const effectiveRate = inv.currency === 'GBP' ? 1 : marketRate * (1 - (fxFeePercent / 100));
    return inv.quantity * (inv.currentPrice || 0) * effectiveRate;
}

const testInv: Investment = {
    id: 'test',
    symbol: 'AAPL',
    name: 'Apple',
    quantity: 10,
    currentPrice: 150,
    currency: 'USD',
    type: 'stock',
    region: 'US',
    sector: 'Tech',
    bookCost: 1000,
    bookCostCurrency: 'USD',
    buyDate: '2021-01-01',
    history: []
};

const marketRate = 0.8; // 1 USD = 0.8 GBP
const fxFee = 1.5;

const value = calculateValueGBP(testInv, marketRate, fxFee);
console.log(`Market Value (no fee): £${(10 * 150 * marketRate).toFixed(2)}`);
console.log(`Effective Value (1.5% fee): £${value.toFixed(2)}`);

const expected = 10 * 150 * (0.8 * 0.985);
if (Math.abs(value - expected) < 0.01) {
    console.log('✅ Calculation matches expectations!');
} else {
    console.log(`❌ Calculation mismatch: got ${value}, expected ${expected}`);
}
