import { scrapeInvestmentData } from './src/lib/scraper.js';

async function verifyGCM() {
    console.log('--- Verifying GCM:LSE Scrape ---');
    const data = await scrapeInvestmentData('GCM:LSE', 'stock');

    if (data) {
        console.log('Result:', data);
        if (data.currency === 'GBP' && data.price < 1) {
            console.log('✅ SUCCESS: GCM correctly converted to GBP and scaled.');
        } else if (data.currency === 'GBX') {
            console.log('❌ FAIL: Currency is still GBX.');
        } else if (data.price > 1) {
            console.log('❌ FAIL: Price is too high (likely not scaled).');
        } else {
            console.log('❌ FAIL: Unexpected result.', data);
        }
    } else {
        console.log('❌ FAIL: Web scrape failed entirely.');
    }
}

verifyGCM();
