import fs from 'fs/promises';
import path from 'path';
import { PortfolioData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'portfolio.json');

const DEFAULT_DATA: PortfolioData = {
    cash: 0,
    investments: [],
    exchangeRates: {},
    lastUpdated: new Date().toISOString(),
};

export async function getPortfolio(): Promise<PortfolioData> {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });

        // Check if file exists
        try {
            await fs.access(FILE_PATH);
        } catch {
            // Create if not exists
            await fs.writeFile(FILE_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
            return DEFAULT_DATA;
        }

        const fileContent = await fs.readFile(FILE_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        return { ...DEFAULT_DATA, ...data }; // Merge with default to ensure structure
    } catch (error) {
        console.error('Error reading portfolio data:', error);
        return DEFAULT_DATA;
    }
}

export async function savePortfolio(data: PortfolioData): Promise<void> {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });

        const dataToSave: PortfolioData = {
            ...data,
            lastUpdated: new Date().toISOString(),
        };

        await fs.writeFile(FILE_PATH, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving portfolio data:', error);
        throw new Error('Failed to save portfolio data');
    }
}
