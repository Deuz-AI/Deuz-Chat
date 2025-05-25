import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, RefreshCw, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CurrencyConversion {
  currency: string;
  rate: number;
  amount: number;
}

// Tarihsel veri için tip tanımlamaları
interface HistoricalData {
  base: string;
  start_date: string;
  end_date: string;
  dates: string[];
  currencies: string[];
  data: {
    [currency: string]: {
      [date: string]: number | null;
    };
  };
}

interface ExchangeRateProps {
  exchangeData: {
    base?: string;
    date?: string;
    rates?: Record<string, number>;
    conversion?: {
      from: {
        currency: string;
        amount: number;
      };
      to: Record<string, CurrencyConversion>;
    };
    // Tarihsel veri için yeni alanlar
    start_date?: string;
    end_date?: string;
    dates?: string[];
    currencies?: string[];
    data?: {
      [currency: string]: {
        [date: string]: number | null;
      };
    };
    // Basit yanıt formatı için
    simpleFormat?: boolean;
  };
}

// Para birimlerinin görünen isimleri
const currencyNames: Record<string, string> = {
  USD: 'Amerikan Doları',
  EUR: 'Euro',
  TRY: 'Türk Lirası',
  GBP: 'İngiliz Sterlini',
  JPY: 'Japon Yeni',
  CHF: 'İsviçre Frangı',
  CNY: 'Çin Yuanı',
  RUB: 'Rus Rublesi',
  AUD: 'Avustralya Doları',
  CAD: 'Kanada Doları',
  AED: 'BAE Dirhemi',
};

// Para biriminin tam adını getir, yoksa kodu döndür
const getCurrencyFullName = (code: string): string => {
  return currencyNames[code] || code;
};

// Biçimlendirilmiş para değeri (1000 -> 1.000,00)
const formatCurrency = (value: number | null): string => {
  if (value === null) return '-';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

// Tarih formatı (YYYY-MM-DD -> GG.AA.YYYY)
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};

export function ExchangeRateComponent({ exchangeData }: ExchangeRateProps) {
  // Veri yoksa mesaj göster
  if (!exchangeData || ((!exchangeData.rates || Object.keys(exchangeData.rates).length === 0) && 
      (!exchangeData.conversion || Object.keys(exchangeData.conversion.to).length === 0) &&
      (!exchangeData.data || Object.keys(exchangeData.data).length === 0))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <DollarSign className="h-5 w-5 mr-2" />
            Döviz Kuru Bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Döviz kuru bilgisi bulunamadı.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Basit yanıt formatını kontrol et
  if (exchangeData.simpleFormat) {
    if (exchangeData.conversion) {
      // Dönüşüm formatında basit yanıt
      const fromCurrency = exchangeData.conversion.from.currency;
      const fromAmount = exchangeData.conversion.from.amount;
      return (
        <div className="p-4 mb-4 text-sm">
          {Object.entries(exchangeData.conversion.to).map(([currency, item]) => (
            <div key={currency}>
              {fromAmount} {fromCurrency} = {formatCurrency(item.amount)} {currency} ({getCurrencyFullName(currency)})
            </div>
          ))}
        </div>
      );
    } else if (exchangeData.rates) {
      // Kurlar formatında basit yanıt
      const baseCurrency = exchangeData.base || '';
      return (
        <div className="p-4 mb-4 text-sm">
          <div>1 {baseCurrency} = {Object.entries(exchangeData.rates)[0]?.[1].toFixed(2)} {Object.entries(exchangeData.rates)[0]?.[0]} ({getCurrencyFullName(Object.entries(exchangeData.rates)[0]?.[0] || '')})</div>
        </div>
      );
    }
  }

  // Tarih formatı
  const formattedDate = exchangeData.date 
    ? new Date(exchangeData.date).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Tarihsel veri mi kontrol et (data alanı varsa)
  const isHistorical = Boolean(exchangeData.data && Object.keys(exchangeData.data).length > 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <DollarSign className="h-5 w-5 mr-2" />
          {exchangeData.conversion 
            ? 'Para Birimi Dönüştürme' 
            : isHistorical 
              ? 'Tarihsel Döviz Kurları'
              : 'Döviz Kurları'}
        </CardTitle>
        {formattedDate && !isHistorical && (
          <div className="text-xs text-muted-foreground flex items-center">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>{formattedDate} itibariyle</span>
          </div>
        )}
        {isHistorical && exchangeData.start_date && exchangeData.end_date && (
          <div className="text-xs text-muted-foreground flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{formatDate(exchangeData.start_date)} - {formatDate(exchangeData.end_date)} arası</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Dönüştürme modu */}
        {exchangeData.conversion && (
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-center">
                <span className="font-medium">
                  {formatCurrency(exchangeData.conversion.from.amount)} {exchangeData.conversion.from.currency}
                </span>
                <span className="mx-2 text-muted-foreground">=</span>
              </div>
              
              <div className="space-y-2 mt-2">
                {Object.entries(exchangeData.conversion.to).map(([currency, item]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <div className="font-medium text-lg">
                      {formatCurrency(item.amount)} {item.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      1 {exchangeData.conversion?.from.currency} = {formatCurrency(item.rate)} {item.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <div>{getCurrencyFullName(exchangeData.conversion.from.currency)} cinsinden hesaplanmıştır.</div>
            </div>
          </div>
        )}
        
        {/* Tarihsel veri gösterimi (tablo) */}
        {isHistorical && exchangeData.dates && exchangeData.data && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Tarih</TableHead>
                  {exchangeData.currencies?.map(currency => (
                    <TableHead key={currency} className="text-right">
                      {currency}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeData.dates.map(date => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{formatDate(date)}</TableCell>
                    {exchangeData.currencies?.map(currency => {
                      const rate = exchangeData.data?.[currency]?.[date];
                      // Artış/azalış belirlemek için bir önceki günün değeri
                      const prevDateIndex = exchangeData.dates ? exchangeData.dates.indexOf(date) - 1 : -1;
                      const prevDate = prevDateIndex >= 0 ? exchangeData.dates?.[prevDateIndex] : undefined;
                      const prevRate = prevDate && exchangeData.data?.[currency] ? exchangeData.data[currency][prevDate] : null;
                      
                      const isUp = rate !== null && rate !== undefined && prevRate !== null && prevRate !== undefined && rate > prevRate;
                      const isDown = rate !== null && rate !== undefined && prevRate !== null && prevRate !== undefined && rate < prevRate;
                      
                      return (
                        <TableCell key={`${date}-${currency}`} className="text-right">
                          <span className="flex items-center justify-end">
                            {formatCurrency(rate || null)}
                            {isUp && <TrendingUp className="h-3 w-3 ml-1 text-green-500" />}
                            {isDown && <TrendingDown className="h-3 w-3 ml-1 text-red-500" />}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Kur görüntüleme modu */}
        {exchangeData.rates && !exchangeData.conversion && !isHistorical && (
          <div className="space-y-3">
            <div className="font-medium">
              Baz para birimi: {getCurrencyFullName(exchangeData.base || '')}
            </div>
            
            <div className="space-y-2">
              {Object.entries(exchangeData.rates).map(([currency, rate]) => (
                <div key={currency} className="flex justify-between items-center py-1 border-b border-muted">
                  <div className="font-medium">{getCurrencyFullName(currency)}</div>
                  <div className="flex items-center">
                    <span>{formatCurrency(rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Dipnot */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Veriler Frankfurter API'sinden alınmıştır.</p>
        </div>
      </CardContent>
    </Card>
  );
} 