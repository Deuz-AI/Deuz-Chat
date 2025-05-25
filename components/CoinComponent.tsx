'use client';

import { format } from 'date-fns';
import { CandlestickChart, TrendingUp, TrendingDown, DollarSign, BarChart3, Info, Clock, ExternalLink } from 'lucide-react';
import React, { useMemo } from 'react';

// Yardımcı fonksiyonlar
const formatCurrency = (value: number, currency: string = 'USD', minimumFractionDigits: number = 2): string => {
  if (value === 0) return '0';
  
  // Küçük değerler için daha fazla ondalık göster
  let fractionDigits = minimumFractionDigits;
  if (value < 0.01) fractionDigits = 6;
  else if (value < 1) fractionDigits = 4;
  
  const formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 8
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

const getPercentageColor = (value: number): string => {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
};

// Kripto para verisi için tip tanımlamaları
interface HistoricalDataPoint {
  timestamp: string;
  price: number;
}

interface MarketData {
  timestamp: string;
  value: number;
}

interface CoinDataInfo {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number | null;
  volume_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  high_24h: number;
  low_24h: number;
  ath: number;
  atl: number;
  ath_change_percentage: number;
  atl_change_percentage: number;
  ath_date: string | null;
  atl_date: string | null;
  last_updated: string | null;
  image: string | null;
  description: string;
  mode: 'info';
  vs_currency: string;
}

interface CoinDataPrice {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  price_change_24h: number;
  last_updated: string | null;
  mode: 'price';
  vs_currency: string;
}

interface CoinDataHistorical {
  id: string;
  vs_currency: string;
  days: number;
  price_data: HistoricalDataPoint[];
  market_cap_data: MarketData[];
  volume_data: MarketData[];
  mode: 'historical';
}

type CoinData = CoinDataInfo | CoinDataPrice | CoinDataHistorical;

interface CoinProps {
  coinData?: CoinData;
}

export function CoinComponent({ coinData }: CoinProps) {
  // Debug: log the incoming data
  console.log("[CoinComponent] Received coinData:", coinData);
  
  // Veri yoksa boş göster
  if (!coinData) {
    console.log("[CoinComponent] No data provided");
    return null;
  }
  
  // Fiyat göstermek için para birimi
  const currencySymbol = useMemo(() => {
    const currency = coinData.vs_currency?.toLowerCase();
    console.log("[CoinComponent] Currency:", currency);
    switch(currency) {
      case 'usd': return '$';
      case 'eur': return '€';
      case 'try': return '₺';
      case 'gbp': return '£';
      case 'jpy': return '¥';
      default: return '';
    }
  }, [coinData.vs_currency]);
  
  // Basit (yalın) yanıt formatı
  if (coinData.mode === 'price') {
    const priceData = coinData as CoinDataPrice;
    return (
      <div className="p-4 mb-4 text-sm">
        <div className="font-medium">{priceData.name.toUpperCase()} ({priceData.symbol.toUpperCase()})</div>
        <div>
          <span className="text-muted-foreground">Güncel Fiyat: </span>
          {currencySymbol}{formatCurrency(priceData.current_price, priceData.vs_currency)}
        </div>
        <div>Değişim (24s): <span className={getPercentageColor(priceData.price_change_24h)}>{priceData.price_change_24h > 0 ? '+' : ''}{priceData.price_change_24h.toFixed(2)}%</span></div>
        <div>
          <span className="text-muted-foreground">Piyasa Değeri: </span>
          {currencySymbol}{formatLargeNumber(priceData.market_cap)}
        </div>
        <div>
          <span className="text-muted-foreground">İşlem Hacmi (24s): </span>
          {currencySymbol}{formatLargeNumber(priceData.volume_24h)}
        </div>
      </div>
    );
  }
  
  // Historical moda özel render
  if (coinData.mode === 'historical') {
    const historicalData = coinData as CoinDataHistorical;
    // Geçmiş veri modunda şimdilik basit bir tablo gösterelim
    // Daha gelişmiş sürümde grafikler eklenebilir
    
    // Son 5 veriyi göster
    const recentPrices = historicalData.price_data.slice(0, 5);
    
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium flex items-center">
            <CandlestickChart className="h-5 w-5 mr-2 text-primary" />
            <span>{historicalData.id.toUpperCase()} Fiyat Geçmişi</span>
          </h2>
          <div className="text-xs text-muted-foreground">
            <span>Son {historicalData.days} gün</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-medium mb-2">Son Fiyatlar</h3>
          {recentPrices.map((pricePoint, index) => {
            const date = new Date(pricePoint.timestamp);
            const prevPrice = index < recentPrices.length - 1 ? recentPrices[index + 1].price : null;
            const priceChange = prevPrice !== null ? pricePoint.price - prevPrice : 0;
            const percentChange = prevPrice !== null ? (priceChange / prevPrice) * 100 : 0;
            
            return (
              <div key={pricePoint.timestamp} className="p-3 rounded-md border bg-muted/10">
                <div className="flex justify-between items-center">
                  <div className="text-sm">{format(date, 'dd MMM yyyy HH:mm')}</div>
                  <div className="font-medium">
                    {currencySymbol}{formatCurrency(pricePoint.price, historicalData.vs_currency)}
                  </div>
                </div>
                
                {prevPrice !== null && (
                  <div className="flex justify-end text-xs mt-1">
                    <span className={getPercentageColor(percentChange)}>
                      {percentChange > 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : 
                        percentChange < 0 ? <TrendingDown className="h-3 w-3 inline mr-1" /> : null}
                      {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Detaylı bilgi modunu görüntüle
  const infoData = coinData as CoinDataInfo;
  
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {infoData.image && (
            <img 
              src={infoData.image} 
              alt={`${infoData.name} logo`} 
              className="h-8 w-8 mr-2"
            />
          )}
          <div>
            <h2 className="text-lg font-medium">{infoData.name}</h2>
            <div className="text-xs text-muted-foreground">
              {infoData.symbol.toUpperCase()}
              {infoData.market_cap_rank && <span> • Sıralama: #{infoData.market_cap_rank}</span>}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {infoData.last_updated && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {format(new Date(infoData.last_updated), 'dd MMM yyyy HH:mm')}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Fiyat Bilgisi */}
      <div className="bg-muted/30 p-3 rounded-md mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-primary mr-1" />
            <span className="text-muted-foreground text-sm">Fiyat</span>
          </div>
          <div className="text-lg font-bold">
            {currencySymbol}{formatCurrency(infoData.current_price, infoData.vs_currency)}
          </div>
        </div>
        
        <div className="flex justify-between mt-2">
          <div className="flex items-center text-xs">
            <span>24s Değişim:</span>
            <span className={`ml-1 ${getPercentageColor(infoData.price_change_percentage_24h)}`}>
              {infoData.price_change_percentage_24h > 0 ? '+' : ''}
              {infoData.price_change_percentage_24h.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs flex items-center">
            <span>24s Aralık:</span>
            <span className="ml-1">
              {currencySymbol}{formatCurrency(infoData.low_24h, infoData.vs_currency)} - {currencySymbol}{formatCurrency(infoData.high_24h, infoData.vs_currency)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Piyasa Verileri */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div className="p-2.5 rounded-md bg-muted/30 flex flex-col">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <BarChart3 className="h-3 w-3 mr-1" />
            <span>Piyasa Değeri</span>
          </div>
          <span className="font-medium">
            {currencySymbol}{formatLargeNumber(infoData.market_cap)}
          </span>
        </div>
        
        <div className="p-2.5 rounded-md bg-muted/30 flex flex-col">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <BarChart3 className="h-3 w-3 mr-1" />
            <span>24s Hacim</span>
          </div>
          <span className="font-medium">
            {currencySymbol}{formatLargeNumber(infoData.volume_24h)}
          </span>
        </div>
        
        {infoData.circulating_supply !== null && (
          <div className="p-2.5 rounded-md bg-muted/30 flex flex-col">
            <div className="text-xs text-muted-foreground mb-1">
              <span>Dolaşımdaki Arz</span>
            </div>
            <span className="font-medium">
              {formatLargeNumber(infoData.circulating_supply)} {infoData.symbol.toUpperCase()}
            </span>
          </div>
        )}
        
        {infoData.max_supply !== null && (
          <div className="p-2.5 rounded-md bg-muted/30 flex flex-col">
            <div className="text-xs text-muted-foreground mb-1">
              <span>Maksimum Arz</span>
            </div>
            <span className="font-medium">
              {formatLargeNumber(infoData.max_supply)} {infoData.symbol.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      {/* Tüm Zamanlar */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Tüm Zaman İstatistikleri</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-md bg-muted/30">
            <div className="text-muted-foreground mb-1">En Yüksek (ATH)</div>
            <div className="font-medium">{currencySymbol}{formatCurrency(infoData.ath)}</div>
            <div className={`text-xs ${getPercentageColor(infoData.ath_change_percentage)}`}>
              {infoData.ath_change_percentage > 0 ? '+' : ''}{infoData.ath_change_percentage.toFixed(1)}%
            </div>
            {infoData.ath_date && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(infoData.ath_date), 'dd MMM yyyy')}
              </div>
            )}
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30">
            <div className="text-muted-foreground mb-1">En Düşük (ATL)</div>
            <div className="font-medium">{currencySymbol}{formatCurrency(infoData.atl)}</div>
            <div className={`text-xs ${getPercentageColor(infoData.atl_change_percentage)}`}>
              {infoData.atl_change_percentage > 0 ? '+' : ''}{infoData.atl_change_percentage.toFixed(1)}%
            </div>
            {infoData.atl_date && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(infoData.atl_date), 'dd MMM yyyy')}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Açıklama */}
      {infoData.description && infoData.description.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Info className="h-4 w-4 mr-1 text-primary" />
            <h3 className="text-sm font-medium">Açıklama</h3>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-md">
            {infoData.description.length > 300 
              ? `${infoData.description.slice(0, 300)}...` 
              : infoData.description}
          </div>
        </div>
      )}
      
      {/* Dipnot */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Veriler CoinGecko API'sinden alınmıştır.</p>
        <a 
          href={`https://www.coingecko.com/en/coins/${infoData.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-primary hover:underline mt-1"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          <span>CoinGecko'da görüntüle</span>
        </a>
      </div>
    </div>
  );
}

// Coin ismi altında da dışa aktar, eski kodların uyumluluğunu korumak için
export { CoinComponent as Coin }; 