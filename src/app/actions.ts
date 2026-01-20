'use server';

import { getPortfolio, savePortfolio } from '@/lib/storage';
import { scrapeInvestmentData, scrapeExchangeRate } from '@/lib/scraper';
import { Investment, InvestmentType } from '@/types';
import { revalidatePath } from 'next/cache';

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

async function updateExchangeRates(portfolio: any, currenciesToCheck: Set<string>) {
    // base is always local portfolio currency, assume GBP for now as user asked to convert TO GBP.
    // So we need rate from Foreign -> GBP. e.g. USDGBP.
    // scraping scrapeExchangeRate('USD', 'GBP') => 0.78

    for (const currency of currenciesToCheck) {
        if (currency === 'GBP') continue;
        const rate = await scrapeExchangeRate(currency, 'GBP');
        if (rate) {
            portfolio.exchangeRates[currency] = rate;
        }
    }
}

export async function addInvestment(prevState: any, formData: FormData) {
    const symbol = formData.get('symbol') as string;
    const type = formData.get('type') as InvestmentType;
    const name = formData.get('name') as string;
    const region = formData.get('region') as string;
    const sector = formData.get('sector') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const bookCost = parseFloat(formData.get('bookCost') as string);
    const bookCostCurrency = formData.get('bookCostCurrency') as string;
    const bookCostExchangeRateStr = formData.get('bookCostExchangeRate') as string;
    const bookCostExchangeRate = bookCostExchangeRateStr ? parseFloat(bookCostExchangeRateStr) : undefined;
    const buyDate = formData.get('buyDate') as string;

    if (!symbol || !quantity) {
        return { message: 'Missing required fields' };
    }

    const portfolio = await getPortfolio();

    // Scrape initial data
    const marketData = await scrapeInvestmentData(symbol, type);

    // Update Rates
    const currencies = new Set<string>();
    if (bookCostCurrency && bookCostCurrency !== 'GBP') currencies.add(bookCostCurrency);
    if (marketData?.currency && marketData.currency !== 'GBP') currencies.add(marketData.currency);

    await updateExchangeRates(portfolio, currencies);

    const newInvestment: Investment = {
        id: generateId(),
        type,
        symbol,
        name,
        region,
        sector,
        quantity,
        bookCost,
        bookCostCurrency: bookCostCurrency || 'GBP',
        bookCostExchangeRate,
        buyDate,
        currentPrice: marketData?.price || 0,
        dailyChangePercent: marketData?.changePercent || 0,
        currency: marketData?.currency || '', // Asset currency
        lastUpdated: new Date().toISOString(),
        history: [{
            date: buyDate,
            price: quantity > 0 ? bookCost / quantity : 0
        }]
    };

    portfolio.investments.push(newInvestment);
    await savePortfolio(portfolio);

    revalidatePath('/');
    return { message: 'Investment added successfully' };
}

export async function editInvestment(id: string, formData: FormData) {
    const portfolio = await getPortfolio();
    const index = portfolio.investments.findIndex(i => i.id === id);
    if (index === -1) return { message: 'Not found' };

    // Update fields
    const inv = portfolio.investments[index];
    inv.quantity = parseFloat(formData.get('quantity') as string);
    inv.bookCost = parseFloat(formData.get('bookCost') as string);
    inv.bookCostCurrency = formData.get('bookCostCurrency') as string;
    const rateStr = formData.get('bookCostExchangeRate') as string;
    inv.bookCostExchangeRate = rateStr ? parseFloat(rateStr) : undefined;
    inv.buyDate = formData.get('buyDate') as string;
    inv.name = formData.get('name') as string;
    inv.region = formData.get('region') as string;
    inv.sector = formData.get('sector') as string;

    // Update initial history point if it exists and matches buyDate
    // or just reset the first point?
    const initialPrice = inv.quantity > 0 ? inv.bookCost / inv.quantity : 0;
    if (!inv.history || inv.history.length === 0) {
        inv.history = [{ date: inv.buyDate, price: initialPrice }];
    } else {
        // Assume first point is always the buy date/price anchor
        inv.history[0] = { date: inv.buyDate, price: initialPrice };
    }

    // Check if we need new rates
    const currencies = new Set<string>();
    if (inv.bookCostCurrency !== 'GBP') currencies.add(inv.bookCostCurrency);
    await updateExchangeRates(portfolio, currencies);

    await savePortfolio(portfolio);
    revalidatePath('/');
    return { message: 'Updated successfully' };
}

export async function removeInvestment(id: string, saleValueGBP?: number, addToCash: boolean = true) {
    const portfolio = await getPortfolio();
    const investment = portfolio.investments.find(i => i.id === id);

    if (investment && addToCash) {
        let valueToAdd = 0;

        if (saleValueGBP !== undefined) {
            valueToAdd = saleValueGBP;
        } else {
            // Fallback to auto-calc if no value provided
            if (investment.currentPrice) {
                let rate = 1;
                const assetCurr = investment.currency || 'GBP';
                if (assetCurr !== 'GBP') {
                    rate = portfolio.exchangeRates[assetCurr] || 1;
                }
                const valueNative = investment.quantity * investment.currentPrice;
                valueToAdd = valueNative * rate;
            }
        }

        portfolio.cash = (portfolio.cash || 0) + valueToAdd;
    }

    portfolio.investments = portfolio.investments.filter(i => i.id !== id);
    await savePortfolio(portfolio);
    revalidatePath('/');
}

export async function updateCash(amount: number) {
    const portfolio = await getPortfolio();
    portfolio.cash = amount;
    await savePortfolio(portfolio);
    revalidatePath('/');
}

export async function refreshPortfolio() {
    const portfolio = await getPortfolio();
    const currenciesToUpdate = new Set<string>();

    const updates = portfolio.investments.map(async (inv) => {
        // Scrape asset
        const data = await scrapeInvestmentData(inv.symbol, inv.type);
        if (data) {
            inv.currentPrice = data.price;
            inv.dailyChangePercent = data.changePercent;
            inv.currency = data.currency;
            inv.lastUpdated = new Date().toISOString();

            // Update History
            const today = new Date().toISOString().split('T')[0];
            if (!inv.history) inv.history = [];

            const lastPoint = inv.history[inv.history.length - 1];
            if (lastPoint && lastPoint.date === today) {
                lastPoint.price = inv.currentPrice;
            } else {
                inv.history.push({ date: today, price: inv.currentPrice });
            }

            if (inv.currency && inv.currency !== 'GBP') currenciesToUpdate.add(inv.currency);
        }
        if (inv.bookCostCurrency !== 'GBP') currenciesToUpdate.add(inv.bookCostCurrency);
        return inv;
    });

    await Promise.all(updates);

    // Refresh FX
    await updateExchangeRates(portfolio, currenciesToUpdate);

    portfolio.lastUpdated = new Date().toISOString();
    await savePortfolio(portfolio);
    revalidatePath('/');
}
