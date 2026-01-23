export type InvestmentType = 'fund' | 'etf' | 'stock';

export interface PricePoint {
    date: string;
    price: number;
}

export interface Investment {
    id: string;
    type: InvestmentType;
    symbol: string; // Ticker or ISIN
    name: string;
    region: string;
    sector: string;
    quantity: number;

    bookCost: number; // Total cost in original currency
    bookCostCurrency: string; // e.g. GBP, USD, EUR
    bookCostExchangeRate?: number; // Manual rate (Foreign per 1 GBP)
    buyDate: string; // ISO Date

    history: PricePoint[]; // Local history of prices

    // Scraped Data
    currentPrice?: number;
    currency?: string; // Market currency of the asset
    dailyChangePercent?: number;
    lastUpdated?: string;
}

export interface Portfolio {
    id: string;
    name: string;
    cash: number;
    investments: Investment[];
    fxFeePercent?: number; // Fee applied to FX conversions (e.g. 1.5)
}

export interface PortfolioData {
    portfolios: Portfolio[];
    currentPortfolioId: string;
    exchangeRates: Record<string, number>; // e.g. "USD": 0.78 (1 unit of key = x GBP)
    lastUpdated: string;
}
