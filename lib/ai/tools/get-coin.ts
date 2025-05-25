import { tool } from 'ai';
import { z } from 'zod';

export const getCoin = tool({
  description: 'Kripto para bilgilerini al',
  parameters: z.object({
    mode: z.enum(['price', 'historical', 'info']).describe('İşlem modu: price (güncel fiyat), historical (geçmiş fiyat verileri), veya info (kripto para bilgileri)'),
    coin_id: z.string().describe('Kripto para birimi ID veya sembolü (örn: bitcoin, eth, BNB)'),
    vs_currency: z.string().optional().default('usd').describe('Karşılaştırma para birimi (örn: usd, eur, try)'),
    days: z.number().optional().default(7).describe('Historical mod için gün sayısı (1, 7, 14, 30, 90, 180, 365, max)'),
    limit: z.number().optional().default(10).describe('Alınacak maksimum kripto para sayısı')
  }),
  execute: async ({ mode, coin_id, vs_currency = 'usd', days = 7, limit = 10 }) => {
    try {
      console.log('[COIN TOOL] Called with params:', { mode, coin_id, vs_currency, days, limit });
      
      // CoinGecko API temel URL'i
      const baseUrl = 'https://api.coingecko.com/api/v3';
      
      // İstek için kullanılacak URL'i hazırla
      let url;
      let response;
      let data;
      
      // Coin ID'sini temizle/hazırla
      const normalizedCoinId = coin_id.toLowerCase().trim();
      
      if (mode === 'price') {
        // Güncel fiyat için
        url = `${baseUrl}/simple/price?ids=${normalizedCoinId}&vs_currencies=${vs_currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
        
        console.log('[COIN TOOL] Fetching price data from URL:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`CoinGecko API hatası: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        // Veriyi daha kullanışlı bir formata dönüştür
        if (data && data[normalizedCoinId]) {
          const coinData = data[normalizedCoinId];
          
          return {
            id: normalizedCoinId,
            name: normalizedCoinId, // API bu endpointte coin adı vermiyor, sadece ID
            symbol: normalizedCoinId, // API bu endpointte sembol vermiyor, sadece ID
            current_price: coinData[vs_currency] || 0,
            market_cap: coinData[`${vs_currency}_market_cap`] || 0,
            volume_24h: coinData[`${vs_currency}_24h_vol`] || 0,
            price_change_24h: coinData[`${vs_currency}_24h_change`] || 0,
            last_updated: coinData.last_updated_at ? new Date(coinData.last_updated_at * 1000).toISOString() : null,
            vs_currency: vs_currency,
            mode: 'price'
          };
        }
        
        throw new Error(`"${normalizedCoinId}" için kripto para verisi bulunamadı.`);
      } 
      else if (mode === 'historical') {
        // Geçmiş veriler için
        url = `${baseUrl}/coins/${normalizedCoinId}/market_chart?vs_currency=${vs_currency}&days=${days}`;
        
        console.log('[COIN TOOL] Fetching historical data from URL:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`CoinGecko API hatası: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        // Tarihleri ve fiyatları düzenli formata çevir
        if (data && data.prices) {
          const priceData = data.prices.map((item: [number, number]) => ({
            timestamp: new Date(item[0]).toISOString(),
            price: item[1]
          }));
          
          // Market cap ve volume verilerini de ekle
          const marketCapData = data.market_caps ? data.market_caps.map((item: [number, number]) => ({
            timestamp: new Date(item[0]).toISOString(),
            value: item[1]
          })) : [];
          
          const volumeData = data.total_volumes ? data.total_volumes.map((item: [number, number]) => ({
            timestamp: new Date(item[0]).toISOString(),
            value: item[1]
          })) : [];
          
          return {
            id: normalizedCoinId,
            vs_currency: vs_currency,
            days: days,
            price_data: priceData,
            market_cap_data: marketCapData,
            volume_data: volumeData,
            mode: 'historical'
          };
        }
        
        throw new Error(`"${normalizedCoinId}" için geçmiş veriler bulunamadı.`);
      } 
      else if (mode === 'info') {
        // Detaylı coin bilgileri için
        url = `${baseUrl}/coins/${normalizedCoinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
        
        console.log('[COIN TOOL] Fetching coin info from URL:', url);
        response = await fetch(url);
        
        if (!response.ok) {
          // Coin ID bulunamadıysa, belki sembol araması yapmamız gerekiyordur
          if (response.status === 404) {
            // Coin listesini al ve sembol ile eşleştirmeyi dene
            const coinListUrl = `${baseUrl}/coins/list`;
            console.log('[COIN TOOL] Coin not found by ID, fetching coin list to search by symbol:', coinListUrl);
            
            const listResponse = await fetch(coinListUrl);
            if (!listResponse.ok) {
              throw new Error(`CoinGecko API hatası: ${listResponse.status} ${listResponse.statusText}`);
            }
            
            const coinList = await listResponse.json();
            const foundCoin = coinList.find((coin: any) => 
              coin.symbol.toLowerCase() === normalizedCoinId || 
              coin.id.toLowerCase() === normalizedCoinId
            );
            
            if (foundCoin) {
              // Doğru ID ile tekrar dene
              url = `${baseUrl}/coins/${foundCoin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
              console.log('[COIN TOOL] Found coin by symbol, fetching with proper ID:', url);
              
              response = await fetch(url);
              if (!response.ok) {
                throw new Error(`CoinGecko API hatası: ${response.status} ${response.statusText}`);
              }
            } else {
              throw new Error(`"${normalizedCoinId}" için kripto para bulunamadı.`);
            }
          } else {
            throw new Error(`CoinGecko API hatası: ${response.status} ${response.statusText}`);
          }
        }
        
        data = await response.json();
        
        // Detaylı bilgileri formatlı bir şekilde döndür
        return {
          id: data.id,
          name: data.name,
          symbol: data.symbol,
          image: data.image?.large || data.image?.small || null,
          description: data.description?.en || '',
          current_price: data.market_data?.current_price?.[vs_currency] || 0,
          market_cap: data.market_data?.market_cap?.[vs_currency] || 0,
          market_cap_rank: data.market_cap_rank || null,
          fully_diluted_valuation: data.market_data?.fully_diluted_valuation?.[vs_currency] || 0,
          volume_24h: data.market_data?.total_volume?.[vs_currency] || 0,
          high_24h: data.market_data?.high_24h?.[vs_currency] || 0,
          low_24h: data.market_data?.low_24h?.[vs_currency] || 0,
          price_change_24h: data.market_data?.price_change_24h || 0,
          price_change_percentage_24h: data.market_data?.price_change_percentage_24h || 0,
          market_cap_change_24h: data.market_data?.market_cap_change_24h || 0,
          market_cap_change_percentage_24h: data.market_data?.market_cap_change_percentage_24h || 0,
          circulating_supply: data.market_data?.circulating_supply || null,
          total_supply: data.market_data?.total_supply || null,
          max_supply: data.market_data?.max_supply || null,
          ath: data.market_data?.ath?.[vs_currency] || 0,
          ath_change_percentage: data.market_data?.ath_change_percentage?.[vs_currency] || 0,
          ath_date: data.market_data?.ath_date?.[vs_currency] || null,
          atl: data.market_data?.atl?.[vs_currency] || 0,
          atl_change_percentage: data.market_data?.atl_change_percentage?.[vs_currency] || 0,
          atl_date: data.market_data?.atl_date?.[vs_currency] || null,
          last_updated: data.last_updated || null,
          vs_currency: vs_currency,
          mode: 'info'
        };
      }
      
      throw new Error('Geçersiz mod. price, historical veya info kullanın.');
    } catch (error) {
      console.error('[COIN TOOL] Error getting coin data:', error);
      throw error;
    }
  },
}); 