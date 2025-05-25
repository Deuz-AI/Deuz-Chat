import { tool } from 'ai';
import { z } from 'zod';

// Alpha Vantage API key (ücretsiz)
const ALPHA_VANTAGE_API_KEY = 'QAMC5W26ZLZ5JHIL';

export const getStock = tool({
  description: 'Hisse senedi bilgilerini al',
  parameters: z.object({
    mode: z.enum(['quote', 'historical', 'search']).describe('İşlem modu: quote (güncel fiyat), historical (geçmiş fiyat verileri), veya search (hisse senedi arama)'),
    symbol: z.string().describe('Hisse senedi sembolü (örn: AAPL, MSFT, TSLA, THYAO.IST)'),
    interval: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily').describe('Historical mod için veri aralığı'),
    output_size: z.enum(['compact', 'full']).optional().default('compact').describe('Historical mod için veri boyutu: compact (son 100 veri noktası) veya full (20+ yıllık veri)')
  }),
  execute: async ({ mode, symbol, interval = 'daily', output_size = 'compact' }) => {
    try {
      console.log('[STOCK TOOL] Called with params:', { mode, symbol, interval, output_size });
      
      // Alpha Vantage API temel URL'i
      const baseUrl = 'https://www.alphavantage.co/query';
      
      // İstek için kullanılacak URL'i hazırla
      let url;
      let response;
      let data;
      
      // Sembolü temizle/hazırla
      const normalizedSymbol = symbol.toUpperCase().trim();
      
      if (mode === 'quote') {
        // Güncel fiyat için GLOBAL_QUOTE fonksiyonu
        url = `${baseUrl}?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        console.log('[STOCK TOOL] Fetching quote data from URL:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Alpha Vantage API hatası: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        // API limiti aşıldı mı kontrol et
        if (data && data.Note && data.Note.includes('API call frequency')) {
          throw new Error('Alpha Vantage API çağrı limiti aşıldı. Lütfen daha sonra tekrar deneyin.');
        }
        
        // Veriyi daha kullanışlı bir formata dönüştür
        if (data && data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
          const quoteData = data['Global Quote'];
          
          return {
            symbol: quoteData['01. symbol'] || normalizedSymbol,
            open: parseFloat(quoteData['02. open']) || 0,
            high: parseFloat(quoteData['03. high']) || 0,
            low: parseFloat(quoteData['04. low']) || 0,
            price: parseFloat(quoteData['05. price']) || 0,
            volume: parseFloat(quoteData['06. volume']) || 0,
            latest_trading_day: quoteData['07. latest trading day'] || null,
            previous_close: parseFloat(quoteData['08. previous close']) || 0,
            change: parseFloat(quoteData['09. change']) || 0,
            change_percent: quoteData['10. change percent']?.replace('%', '') || 0,
            mode: 'quote'
          };
        }
        
        throw new Error(`"${normalizedSymbol}" için hisse senedi verisi bulunamadı.`);
      } 
      else if (mode === 'historical') {
        // Tarihsel veri için TIME_SERIES fonksiyonu
        const functionName = interval === 'daily' ? 'TIME_SERIES_DAILY' : 
                              interval === 'weekly' ? 'TIME_SERIES_WEEKLY' : 'TIME_SERIES_MONTHLY';
        
        url = `${baseUrl}?function=${functionName}&symbol=${normalizedSymbol}&outputsize=${output_size}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        console.log('[STOCK TOOL] Fetching historical data from URL:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Alpha Vantage API hatası: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        // API limiti aşıldı mı kontrol et
        if (data && data.Note && data.Note.includes('API call frequency')) {
          throw new Error('Alpha Vantage API çağrı limiti aşıldı. Lütfen daha sonra tekrar deneyin.');
        }
        
        // Veriyi işleyip döndür
        const timeSeriesKey = interval === 'daily' ? 'Time Series (Daily)' : 
                              interval === 'weekly' ? 'Weekly Time Series' : 'Monthly Time Series';
        
        if (data && data[timeSeriesKey]) {
          const timeSeries = data[timeSeriesKey];
          const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          const historicalData = dates.map(date => {
            const entry = timeSeries[date];
            return {
              date: date,
              open: parseFloat(entry['1. open']) || 0,
              high: parseFloat(entry['2. high']) || 0,
              low: parseFloat(entry['3. low']) || 0,
              close: parseFloat(entry['4. close']) || 0,
              volume: parseFloat(entry['5. volume']) || 0
            };
          });
          
          // Meta bilgiler
          const metaData = data['Meta Data'] || {};
          
          return {
            symbol: metaData['2. Symbol'] || normalizedSymbol,
            interval: interval,
            last_refreshed: metaData['3. Last Refreshed'] || null,
            time_zone: metaData['5. Time Zone'] || 'UTC',
            data: historicalData,
            mode: 'historical'
          };
        }
        
        throw new Error(`"${normalizedSymbol}" için tarihsel veriler bulunamadı.`);
      } 
      else if (mode === 'search') {
        // Sembol arama için
        url = `${baseUrl}?function=SYMBOL_SEARCH&keywords=${normalizedSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        console.log('[STOCK TOOL] Searching for symbol:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Alpha Vantage API hatası: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        // API limiti aşıldı mı kontrol et
        if (data && data.Note && data.Note.includes('API call frequency')) {
          throw new Error('Alpha Vantage API çağrı limiti aşıldı. Lütfen daha sonra tekrar deneyin.');
        }
        
        // Arama sonuçlarını döndür
        if (data && data.bestMatches && data.bestMatches.length > 0) {
          const searchResults = data.bestMatches.map((match: any) => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            market_open: match['5. marketOpen'],
            market_close: match['6. marketClose'],
            timezone: match['7. timezone'],
            currency: match['8. currency'],
            match_score: match['9. matchScore']
          }));
          
          return {
            query: normalizedSymbol,
            results: searchResults,
            mode: 'search'
          };
        }
        
        return {
          query: normalizedSymbol,
          results: [],
          mode: 'search'
        };
      }
      
      throw new Error('Geçersiz mod. quote, historical veya search kullanın.');
    } catch (error) {
      console.error('[STOCK TOOL] Error getting stock data:', error);
      throw error;
    }
  },
}); 