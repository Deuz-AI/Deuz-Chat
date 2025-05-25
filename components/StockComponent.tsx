'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Info, Clock, ExternalLink, Calendar } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Yardımcı fonksiyonlar
const formatCurrency = (value: number, minimumFractionDigits: number = 2): string => {
  if (value === 0) return '0';
  
  const formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: 2
  });
  
  return formatter.format(value);
};

const formatLargeNumber = (value: number): string => {
  if (value === null || value === undefined) return '-';
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)} K`;
  }
  
  return value.toString();
};

const getChangeColor = (value: number): string => {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
};

// Tarih formatı (YYYY-MM-DD -> GG.AA.YYYY)
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy');
  } catch (e) {
    return dateString;
  }
};

// Hisse senedi verisi için tip tanımlamaları
interface StockQuoteData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latest_trading_day: string | null;
  previous_close: number;
  change: number;
  change_percent: number | string;
  mode: 'quote';
}

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockHistoricalData {
  symbol: string;
  interval: string;
  last_refreshed: string | null;
  time_zone: string;
  data: HistoricalDataPoint[];
  mode: 'historical';
}

interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  market_open: string;
  market_close: string;
  timezone: string;
  currency: string;
  match_score: string;
}

interface StockSearchData {
  query: string;
  results: StockSearchResult[];
  mode: 'search';
}

type StockData = StockQuoteData | StockHistoricalData | StockSearchData;

interface StockProps {
  stockData?: StockData;
}

export function StockComponent({ stockData }: StockProps) {
  // Veri yoksa boş göster
  if (!stockData) {
    return null;
  }
  
  // Quote modu için
  if (stockData.mode === 'quote') {
    const quoteData = stockData as StockQuoteData;
    const changeValue = typeof quoteData.change_percent === 'string' ? 
      parseFloat(quoteData.change_percent) : quoteData.change_percent;
    
    // Basit yanıt formatı
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-primary" />
            <span>{quoteData.symbol} Hisse Bilgisi</span>
          </h2>
          <div className="text-xs text-muted-foreground">
            {quoteData.latest_trading_day && (
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(quoteData.latest_trading_day)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Güncel Fiyat ve Değişim */}
        <div className="bg-muted/30 p-3 rounded-md mb-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Güncel Fiyat</div>
            <div className="text-xl font-bold">${formatCurrency(quoteData.price)}</div>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-muted-foreground">Değişim</div>
            <div className={`flex items-center ${getChangeColor(quoteData.change)}`}>
              {quoteData.change > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : quoteData.change < 0 ? (
                <TrendingDown className="h-4 w-4 mr-1" />
              ) : null}
              <span className="font-medium">${Math.abs(quoteData.change).toFixed(2)} ({changeValue > 0 ? '+' : ''}{changeValue.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        
        {/* Günlük Fiyat Aralığı */}
        <div className="p-3 rounded-md bg-muted/30 mb-4">
          <div className="text-sm mb-2">Günlük Aralık</div>
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground mr-1">Düşük:</span>
              <span className="font-medium">${formatCurrency(quoteData.low)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">Yüksek:</span>
              <span className="font-medium">${formatCurrency(quoteData.high)}</span>
            </div>
          </div>
        </div>
        
        {/* Ek Bilgiler */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2.5 rounded-md bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Açılış</div>
            <div className="font-medium">${formatCurrency(quoteData.open)}</div>
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Önceki Kapanış</div>
            <div className="font-medium">${formatCurrency(quoteData.previous_close)}</div>
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30 col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Hacim</div>
            <div className="font-medium">{formatLargeNumber(quoteData.volume)}</div>
          </div>
        </div>
        
        {/* Dipnot */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Veriler Alpha Vantage API'sinden alınmıştır.</p>
        </div>
      </div>
    );
  }
  
  // Historical modu için
  if (stockData.mode === 'historical') {
    const historicalData = stockData as StockHistoricalData;
    
    // Son 5 günlük veriyi göster
    const recentData = historicalData.data.slice(0, 10);
    
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary" />
            <span>{historicalData.symbol} Tarihsel Veri</span>
          </h2>
          <div className="text-xs text-muted-foreground">
            <div>
              {historicalData.interval === 'daily' ? 'Günlük' : 
                historicalData.interval === 'weekly' ? 'Haftalık' : 'Aylık'} veriler
            </div>
            {historicalData.last_refreshed && (
              <div className="flex items-center mt-1 justify-end">
                <Clock className="h-3 w-3 mr-1" />
                <span>Son güncelleme: {formatDate(historicalData.last_refreshed)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Tarihsel veri tablosu */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Tarih</TableHead>
                <TableHead className="text-right">Açılış</TableHead>
                <TableHead className="text-right">Yüksek</TableHead>
                <TableHead className="text-right">Düşük</TableHead>
                <TableHead className="text-right">Kapanış</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentData.map((item) => {
                const prevDay = recentData.find(d => d.date < item.date);
                const priceChange = prevDay ? item.close - prevDay.close : 0;
                const percentChange = prevDay ? (priceChange / prevDay.close) * 100 : 0;
                
                return (
                  <TableRow key={item.date}>
                    <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                    <TableCell className="text-right">${formatCurrency(item.open)}</TableCell>
                    <TableCell className="text-right">${formatCurrency(item.high)}</TableCell>
                    <TableCell className="text-right">${formatCurrency(item.low)}</TableCell>
                    <TableCell className="text-right">
                      <div>${formatCurrency(item.close)}</div>
                      {prevDay && (
                        <div className={`text-xs ${getChangeColor(priceChange)}`}>
                          {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Dipnot */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Veriler Alpha Vantage API'sinden alınmıştır.</p>
        </div>
      </div>
    );
  }
  
  // Search modu için
  if (stockData.mode === 'search') {
    const searchData = stockData as StockSearchData;
    
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium flex items-center">
            <Info className="h-5 w-5 mr-2 text-primary" />
            <span>Hisse Senedi Arama Sonuçları</span>
          </h2>
          <div className="text-xs text-muted-foreground">
            <span>Arama: "{searchData.query}"</span>
          </div>
        </div>
        
        {searchData.results.length === 0 ? (
          <div className="p-3 rounded-md bg-muted/30 text-center">
            <p className="text-muted-foreground text-sm">"{searchData.query}" için sonuç bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchData.results.map((result) => (
              <div key={result.symbol} className="p-3 rounded-md border bg-muted/10">
                <div className="flex justify-between">
                  <div className="font-medium">{result.symbol}</div>
                  <div className="text-xs text-muted-foreground">{result.region}</div>
                </div>
                <div className="text-sm mt-1">{result.name}</div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <div>Tür: {result.type}</div>
                  <div>Para birimi: {result.currency}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Dipnot */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Veriler Alpha Vantage API'sinden alınmıştır.</p>
        </div>
      </div>
    );
  }
  
  // Desteklenmeyen mod için
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
      <div className="text-center p-4">
        <p className="text-muted-foreground">Desteklenmeyen hisse senedi veri modu.</p>
      </div>
    </div>
  );
}

// Stock ismi altında da dışa aktar, eski kodların uyumluluğunu korumak için
export { StockComponent as Stock }; 