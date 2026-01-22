import * as cheerio from 'cheerio';
import { getPortfolio } from '@/lib/storage';
import { Investment } from '@/types';

interface ScrapedData {
    price: number;
    currency: string;
    changePercent: number;
}

export interface HistoricalPoint {
    date: string;
    price: number;
}

async function internalScrape(symbol: string, type: 'fund' | 'etf' | 'stock'): Promise<ScrapedData | null> {
    const isFund = type === 'fund';
    const baseUrl = 'https://markets.ft.com/data';
    const path = isFund ? 'funds/tearsheet/summary' : 'equities/tearsheet/summary';
    const url = `${baseUrl}/${path}?s=${symbol}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        let price: number = NaN;
        let currency: string = '';
        let changePercent: number = 0;

        // --- NEW ROBUST STRATEGY ---

        // 1. Scan for Price and Currency in data lists (New FT Layout)
        // We look for any row where the label contains "Price" or "Currency"
        $('.mod-ui-data-list__row, .mod-tearsheet-overview__quote li').each((i, el) => {
            const label = $(el).find('.mod-ui-data-list__label').text().trim();
            const value = $(el).find('.mod-ui-data-list__value').text().trim();

            if (!label || !value) return;

            // Price & Currency from label: "Price (GBX)"
            if (label.toLowerCase().includes('price')) {
                const p = parseFloat(value.replace(/,/g, ''));
                if (!isNaN(p)) {
                    // Only update if we haven't found a price yet or this one is more specific
                    if (isNaN(price)) price = p;

                    // Detect currency from label like "Price (GBX)"
                    const curMatch = label.match(/\(([A-Z]{3})\)/);
                    if (curMatch) currency = curMatch[1].toUpperCase();
                }
            }

            // Explicit Currency label
            if (label.toLowerCase() === 'currency' || label.toLowerCase().includes('base currency')) {
                if (!currency) currency = value.toUpperCase();
            }

            // Today's Change
            if (label.includes('Change') && (value.includes('%') || value.includes('/'))) {
                const parts = value.split('/');
                const pctPart = parts.find(p => p.includes('%')) || parts[parts.length - 1];
                if (pctPart) {
                    const match = pctPart.match(/([+-]?\d+\.?\d*)/);
                    if (match) changePercent = parseFloat(match[1]);
                }
            }
        });

        // 2. Fallbacks for Price (Old Selectors)
        if (isNaN(price)) {
            let priceText = $('.mod-tearsheet-overview__quote__value').first().text().trim() ||
                $('.mod-tearsheet-overview__header__last-price').first().text().trim();
            if (priceText) price = parseFloat(priceText.replace(/,/g, ''));
        }

        // 3. Fallbacks for Currency (Subheading and General search)
        if (!currency) {
            const subheading = $('.mod-tearsheet-overview__quote__subheading').first().text();
            const curMatch = subheading.match(/\(([A-Z]{3})\)/);
            if (curMatch) {
                currency = curMatch[1].toUpperCase();
            } else {
                // Last ditch: look for GBX/GBP/USD raw in the overview section
                const overviewText = $('.mod-tearsheet-overview').text();
                if (overviewText.includes('(GBX)')) currency = 'GBX';
                else if (overviewText.includes('(GBP)')) currency = 'GBP';
                else if (overviewText.includes('(USD)')) currency = 'USD';
            }
        }

        // 4. LSE Heuristics
        if (!currency || currency === 'Unknown') {
            if (symbol.toUpperCase().includes(':LSE')) {
                currency = 'GBX'; // London stocks are almost always quoted in pence (GBX) on FT
            }
        }

        // 5. Final validation
        if (isNaN(price)) return null;

        // --- FINAL CONVERSION ---

        // Handle GBX (Pence Sterling) scaling
        if (currency === 'GBX') {
            price = price / 100;
            currency = 'GBP';
        }

        return {
            price,
            currency: currency || 'Unknown',
            changePercent: isNaN(changePercent) ? 0 : changePercent
        };

    } catch (error) {
        console.error(`Scrape error for ${symbol}:`, error);
        return null;
    }
}

export async function scrapeInvestmentData(symbol: string, type: 'fund' | 'etf' | 'stock'): Promise<ScrapedData | null> {
    // 1. Try exact symbol
    let data = await internalScrape(symbol, type);
    if (data) return data;

    // 2. If no suffix provided, try common ones
    if (!symbol.includes(':')) {
        const suffixes = ['LSE', 'NYQ', 'NSQ']; // Prioritize London for UK context
        for (const suffix of suffixes) {
            const candidate = `${symbol}:${suffix}`;
            console.log(`Retrying with ${candidate}...`);
            data = await internalScrape(candidate, type);
            if (data) return data;
        }
    }

    // 3. Try replacing generic suffixes if user typed them
    // e.g. MKL:NYSE -> MKL:NYQ
    if (symbol.endsWith(':NYSE')) {
        const candidate = symbol.replace(':NYSE', ':NYQ');
        data = await internalScrape(candidate, type);
        if (data) return data;
    }

    console.warn(`Failed to scrape data for ${symbol} after retries.`);
    return null;
}

export async function scrapeHistoricalData(symbol: string, type: 'fund' | 'etf' | 'stock'): Promise<HistoricalPoint[]> {
    const isFund = type === 'fund';
    const baseUrl = 'https://markets.ft.com/data';
    const path = isFund ? 'funds/tearsheet/historical' : 'equities/tearsheet/historical';
    const url = `${baseUrl}/${path}?s=${symbol}`;

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } });
        if (!response.ok) return [];

        const html = await response.text();
        const $ = cheerio.load(html);
        const data: HistoricalPoint[] = [];

        $('.mod-ui-table tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length > 0) {
                const dateStr = $(tds[0]).text().trim();
                const priceStr = $(tds[4]).text().trim();

                const date = new Date(dateStr);
                const price = parseFloat(priceStr.replace(/,/g, ''));

                if (!isNaN(date.getTime()) && !isNaN(price)) {
                    data.push({
                        date: date.toISOString().split('T')[0],
                        price
                    });
                }
            }
        });

        return data.reverse();

    } catch (error) {
        console.error('Error scraping history:', error);
        return [];
    }
}

export async function scrapeExchangeRate(base: string, target: string): Promise<number | null> {
    if (base === target) return 1;
    // URL pattern: https://markets.ft.com/data/currencies/tearsheet/summary?s=GBPUSD
    // s = Base + Target (e.g. GBPUSD)
    const symbol = `${base}${target}`;
    const url = `https://markets.ft.com/data/currencies/tearsheet/summary?s=${symbol}`;

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        let priceText = $('.mod-tearsheet-overview__quote__value').first().text().trim();

        if (!priceText) {
            // Fallback: search for "Price" label in list items (Currency page structure)
            $('.mod-tearsheet-overview__quote__bar li').each((i, el) => {
                const label = $(el).find('.mod-ui-data-list__label').text().trim();
                if (label.includes('Price')) {
                    priceText = $(el).find('.mod-ui-data-list__value').text().trim();
                }
            });
        }

        const rate = parseFloat(priceText.replace(/,/g, ''));
        return isNaN(rate) ? null : rate;
    } catch {
        return null;
    }
}
