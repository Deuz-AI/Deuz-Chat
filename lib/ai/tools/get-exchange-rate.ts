import { tool } from 'ai';
import { z } from 'zod';

export const getExchangeRate = tool({
  description: 'Döviz kurları hakkında bilgi al veya para birimlerini dönüştür, tarihsel veriler dahil',
  parameters: z.object({
    mode: z.enum(['rates', 'convert', 'historical']).describe('İşlem modu: rates (güncel kur bilgisi), convert (dönüştürme) veya historical (tarihsel kur verisi)'),
    base_currency: z.string().describe('Baz para birimi kodu (USD, EUR, TRY gibi)'),
    target_currencies: z.string().optional().describe('Hedef para birimleri (virgülle ayrılmış: USD,EUR,TRY gibi). Belirtilmezse tüm mevcut kurlar döndürülür.'),
    amount: z.number().optional().default(1).describe('Dönüştürülecek miktar (convert modunda kullanılır)'),
    date: z.string().optional().describe('Geçmiş kur bilgisi için tek tarih (YYYY-MM-DD formatında). Belirtilmezse güncel kurlar kullanılır.'),
    start_date: z.string().optional().describe('Tarihsel sorgular için başlangıç tarihi (YYYY-MM-DD formatında, historical modunda kullanılır)'),
    end_date: z.string().optional().describe('Tarihsel sorgular için bitiş tarihi (YYYY-MM-DD formatında, historical modunda kullanılır)'),
    days: z.number().optional().describe('Son kaç günün verisi alınacak (start_date/end_date yerine kullanılabilir)')
  }),
  execute: async ({ mode, base_currency, target_currencies, amount = 1, date, start_date, end_date, days }) => {
    try {
      // Baz URL
      let url = 'https://api.frankfurter.app';
      
      // Tarih parametrelerini işle
      if (mode === 'historical') {
        // Historical mod için tarih aralığı kullan
        let startDateValue = start_date;
        let endDateValue = end_date;
        
        // Gün sayısı belirtilmişse, son n günün verilerini hesapla
        if (days && !start_date) {
          const today = new Date();
          const pastDate = new Date();
          pastDate.setDate(today.getDate() - days);
          
          endDateValue = today.toISOString().split('T')[0]; // YYYY-MM-DD
          startDateValue = pastDate.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        
        if (!startDateValue || !endDateValue) {
          throw new Error("Tarihsel veri için başlangıç ve bitiş tarihi gereklidir.");
        }
        
        url += `/${startDateValue}..${endDateValue}`;
      } else if (date) {
        // Tek tarih için
        url += `/${date}`;
      } else {
        // Güncel kur
        url += '/latest';
      }
      
      // Sorgu parametreleri ekleniyor
      url += `?from=${base_currency.toUpperCase()}`;
      
      // Hedef para birimleri belirtilmişse ekle
      if (target_currencies) {
        url += `&to=${target_currencies.toUpperCase()}`;
      }
      
      // Dönüştürme modunda miktar ekle
      if (mode === 'convert' && amount !== 1) {
        url += `&amount=${amount}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Döviz API hatası: ${response.status} ${response.statusText} - ${errorData?.message || ''}`);
      }
      
      const data = await response.json();
      
      // Historical mod için özel işleme
      if (mode === 'historical') {
        // Tarihsel verileri tablo için düzenlenmiş formatta dön
        const dates = Object.keys(data.rates).sort();
        const currencies = target_currencies 
          ? target_currencies.split(',').map(c => c.trim().toUpperCase())
          : Object.keys(data.rates[dates[0]] || {});
        
        // Tür tanımlamaları
        interface CurrencyData {
          [date: string]: number | null;
        }
        
        interface HistoricalData {
          [currency: string]: CurrencyData;
        }
        
        const historicalResult = {
          base: data.base,
          start_date: dates[0],
          end_date: dates[dates.length - 1],
          dates: dates,
          currencies: currencies,
          data: {} as HistoricalData
        };
        
        // Her para birimi için tüm tarihler üzerinde veri topla
        currencies.forEach(currency => {
          historicalResult.data[currency] = {} as CurrencyData;
          dates.forEach(date => {
            const ratesForDate = data.rates[date] as Record<string, number> | undefined;
            historicalResult.data[currency][date] = ratesForDate?.[currency] || null;
          });
        });
        
        return historicalResult;
      }
      // Normal mod (rates) veya convert modu
      else if (mode === 'rates') {
        return {
          base: data.base,
          date: data.date,
          rates: data.rates as Record<string, number>
        };
      }
      else if (mode === 'convert') {
        // Dönüştürme modunda daha açıklayıcı bir sonuç formatı
        interface ConversionResult {
          currency: string;
          rate: number;
          amount: number;
        }
        
        const formattedResult = {
          conversion: {
            from: {
              currency: base_currency.toUpperCase(),
              amount: amount
            },
            to: {} as Record<string, ConversionResult>
          },
          date: data.date
        };
        
        // Her bir hedef para birimi için dönüşüm değerlerini ekle
        Object.entries(data.rates as Record<string, number>).forEach(([currency, rate]) => {
          formattedResult.conversion.to[currency] = {
            currency: currency,
            rate: rate,
            amount: Number(rate) * amount
          };
        });
        
        return formattedResult;
      }
      
      return data;
    } catch (error) {
      console.error('Döviz kuru API hatası:', error);
      throw error;
    }
  }
}); 