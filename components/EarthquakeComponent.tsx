'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, Info, MapPin, AlertTriangle, Waves, Clock, Zap, ExternalLink } from 'lucide-react';
import React, { useMemo } from 'react';

// Büyüklük seviyesine göre renk kodu belirle
const getMagnitudeColor = (magnitude: number): string => {
  if (magnitude < 4.0) return 'text-green-500';
  if (magnitude < 5.0) return 'text-yellow-500';
  if (magnitude < 6.0) return 'text-orange-500';
  if (magnitude < 7.0) return 'text-red-500';
  return 'text-purple-500';
};

// Deprem uyarı seviyesi için ikon seç
const getAlertIcon = (alert: string | null): React.ReactElement | null => {
  if (!alert) return null;
  
  switch (alert) {
    case 'green':
      return <AlertTriangle className="h-4 w-4 text-green-500" />;
    case 'yellow':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'orange':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'red':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

// USGS API'den gelen deprem verisi için tip tanımı
interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  coordinates: {
    latitude: number;
    longitude: number;
    depth: number;
  };
  alert: string | null;
  tsunami: boolean;
  felt: number | null;
  significance: number;
  url: string;
  detail_url: string;
}

interface EarthquakeData {
  total_count: number;
  region: string;
  period: string;
  min_magnitude: number;
  earthquakes: Earthquake[];
  simpleFormat?: boolean; // Basit yanıt formatı için
}

type EarthquakeProps = {
  earthquakeData?: EarthquakeData;
};

export function EarthquakeComponent({ earthquakeData }: EarthquakeProps) {
  // Veri yoksa boş göster
  if (!earthquakeData) {
    return null;
  }

  // Son 5 depremi göster
  const recentEarthquakes = useMemo(() => {
    return earthquakeData.earthquakes.slice(0, 10);
  }, [earthquakeData.earthquakes]);
  
  // Basit yanıt formatı için kontrol
  if (earthquakeData.simpleFormat) {
    const mostRecent = earthquakeData.earthquakes[0];
    if (mostRecent) {
      const date = new Date(mostRecent.time);
      return (
        <div className="p-4 mb-4 text-sm">
          <div>Son deprem: {mostRecent.place}</div>
          <div>Büyüklük: {mostRecent.magnitude.toFixed(1)}</div>
          <div>Zaman: {format(date, 'dd MMM yyyy HH:mm')}</div>
          <div>Derinlik: {mostRecent.coordinates.depth.toFixed(1)} km</div>
          {earthquakeData.earthquakes.length > 1 && (
            <div>Son {earthquakeData.region} bölgesinde son {earthquakeData.period} içinde toplam {earthquakeData.total_count} deprem kaydedildi.</div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium flex items-center">
          <Activity className="h-5 w-5 mr-2 text-primary" />
          <span>Son Depremler</span>
        </h2>
        <div className="text-xs text-muted-foreground flex items-center">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{earthquakeData.region}</span>
        </div>
      </div>

      {/* Özet Bilgiler */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div className="p-3 rounded-md bg-muted/30 flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground">Toplam Deprem</span>
          </div>
          <span className="font-medium">{earthquakeData.total_count}</span>
        </div>
        
        <div className="p-3 rounded-md bg-muted/30 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground">Periyod</span>
          </div>
          <span className="font-medium">{earthquakeData.period}</span>
        </div>
      </div>

      {/* Deprem Listesi */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium mb-2">Son 10 Deprem</h3>
        
        {recentEarthquakes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground p-4">
            Belirtilen kriterlere uygun deprem verisi bulunamadı.
          </div>
        ) : (
          recentEarthquakes.map((earthquake) => {
            const date = new Date(earthquake.time);
            return (
              <div key={earthquake.id} className="p-3 rounded-md border bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className={`text-lg font-bold ${getMagnitudeColor(earthquake.magnitude)}`}>
                      {earthquake.magnitude.toFixed(1)}
                    </span>
                    {earthquake.tsunami && <Waves className="h-4 w-4 text-blue-500 ml-2" aria-label="Tsunami Tehlikesi" />}
                    {getAlertIcon(earthquake.alert)}
                  </div>
                  <a 
                    href={earthquake.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-primary flex items-center hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span>Detaylar</span>
                  </a>
                </div>

                <div className="text-sm mb-1">{earthquake.place}</div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>
                      {earthquake.coordinates.latitude.toFixed(2)}, {earthquake.coordinates.longitude.toFixed(2)}
                      {` (${earthquake.coordinates.depth.toFixed(1)} km derinlik)`}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{format(date, 'dd MMM yyyy HH:mm')}</span>
                  </div>
                </div>
                
                {earthquake.felt && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    <span>{earthquake.felt} kişi tarafından hissedildi</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Dipnot */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Veriler USGS (United States Geological Survey) API'sinden alınmıştır.</p>
      </div>
    </div>
  );
}

// Earthquake ismi altında da dışa aktar, eski kodların uyumluluğunu korumak için
export { EarthquakeComponent as Earthquake }; 