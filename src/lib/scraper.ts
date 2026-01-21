import * as cheerio from 'cheerio';

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

        // Price
        let priceText = $('.mod-tearsheet-overview__quote__value').first().text().trim();
        if (!priceText) {
            priceText = $('.mod-tearsheet-overview__header__last-price').first().text().trim();
        }

        // Currency
        let currency = '';
        const subheading = $('.mod-tearsheet-overview__quote__subheading').first().text();
        const currencyMatch = subheading.match(/Price \(([A-Z]{3})\)/);
        if (currencyMatch) {
            currency = currencyMatch[1];
        }

        if (!currency) {
            $('.mod-ui-data-list__label').each((i, el) => {
                if ($(el).text().trim() === 'Currency') {
                    currency = $(el).next('.mod-ui-data-list__value').text().trim();
                }
            });
        }

        // Change %
        let changeText = '';
        $('.mod-ui-data-list__row').each((i, el) => {
            const label = $(el).find('.mod-ui-data-list__label').text().trim();
            if (label.includes("Today's Change") || label === 'Change') {
                changeText = $(el).find('.mod-ui-data-list__value').text().trim();
            }
        });

        // Fallback: Try looking for any list item with "Change" in the label
        if (!changeText) {
            $('.mod-tearsheet-overview__quote__bar li').each((i, el) => {
                const text = $(el).text();
                if (text.includes("Change") && (text.includes('%') || text.includes('/'))) {
                    const val = $(el).find('.mod-ui-data-list__value').text().trim();
                    if (val) changeText = val;
                }
            });
        }

        if (!changeText) {
            const firstVal = $('.mod-tearsheet-overview__quote__bar').find('.mod-ui-data-list__value').first().text().trim();
            if (firstVal && (firstVal.includes('%') || firstVal.includes('/'))) {
                changeText = firstVal;
            }
        }

        let price = parseFloat(priceText.replace(/,/g, ''));

        // Handle GBX (Pence Sterling)
        if (currency === 'GBX') {
            price = price / 100;
            currency = 'GBP';
        }

        let changePercent = 0;

        if (changeText) {
            if (changeText.includes('/')) {
                const parts = changeText.split('/');
                const pctPart = parts.find(p => p.includes('%')) || parts[1];
                if (pctPart) {
                    changePercent = parseFloat(pctPart.replace('%', '').replace('+', '').trim());
                }
            } else {
                changePercent = parseFloat(changeText.replace('%', '').replace('+', ''));
            }
        }

        if (isNaN(price)) {
            const quoteBarPrice = $('.mod-tearsheet-overview__quote li').first().find('.mod-ui-data-list__value').text().trim();
            const p2 = parseFloat(quoteBarPrice.replace(/,/g, ''));
            if (!isNaN(p2)) {
                let fallbackCurrency = currency || 'USD';
                if (!currency) {
                    if (symbol.includes(':LSE')) fallbackCurrency = 'GBP';
                    else if (symbol.includes(':GER') || symbol.includes(':FRA')) fallbackCurrency = 'EUR';
                }

                let finalPrice = p2;
                if (fallbackCurrency === 'GBX') {
                    finalPrice = p2 / 100;
                    fallbackCurrency = 'GBP';
                }

                return { price: finalPrice, currency: fallbackCurrency, changePercent };
            }
            return null;
        }

        return {
            price,
            currency: currency || 'Unknown',
            changePercent: isNaN(changePercent) ? 0 : changePercent
        };

    } catch (error) {
        return null;
    }
}

export async function scrapeInvestmentData(symbol: string, type: 'fund' | 'etf' | 'stock'): Promise<ScrapedData | null> {
    // 1. Try exact symbol
    let data = await internalScrape(symbol, type);
    if (data) return data;

    // 2. If no suffix provided, try common ones
    if (!symbol.includes(':')) {
        const suffixes = ['NYQ', 'NSQ', 'LSE']; // NYSE, NASDAQ, LONDON
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
