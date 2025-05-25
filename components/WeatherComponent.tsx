'use client';

import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, Wind, Thermometer, Droplets, MapPin } from 'lucide-react';
import { useMemo } from 'react';

// OpenWeather API kodları için yardımcı fonksiyon
const getWeatherIcon = (code: number) => {
  // OpenWeather API kod aralıkları: https://openweathermap.org/weather-conditions
  if (code >= 200 && code < 300) return <CloudRain className="h-6 w-6 text-purple-500" />; // Thunderstorm
  if (code >= 300 && code < 400) return <CloudRain className="h-6 w-6 text-blue-300" />; // Drizzle
  if (code >= 500 && code < 600) return <CloudRain className="h-6 w-6 text-blue-500" />; // Rain
  if (code >= 600 && code < 700) return <CloudRain className="h-6 w-6 text-white" />; // Snow
  if (code >= 700 && code < 800) return <Cloud className="h-6 w-6 text-gray-400" />; // Atmosphere (fog, mist, etc)
  if (code === 800) return <Sun className="h-6 w-6 text-yellow-500" />; // Clear sky
  if (code > 800) return <Cloud className="h-6 w-6 text-gray-500" />; // Clouds
  return <Cloud className="h-6 w-6 text-gray-500" />; // Default
};

// Hava durumu kodları için açıklama (OpenWeather API)
const getWeatherDescription = (description: string): string => {
  // OpenWeather API'den gelen açıklamayı kullan
  // İlk harf büyük olsun
  return description.charAt(0).toUpperCase() + description.slice(1);
};

// OpenWeather API için veri tipi tanımı
interface OpenWeatherData {
  current: {
    temperature: number;
    temperature_feel: number;
    humidity: number;
    weather_code: number;
    weather_description: string;
    weather_main: string;
    wind_speed: number;
    city_name: string;
    country: string;
  };
  forecast: {
    max_temp: number;
    min_temp: number;
    sunrise: string;
    sunset: string;
  };
}

type WeatherProps = {
  weatherData?: OpenWeatherData;
};

export function WeatherComponent({ weatherData }: WeatherProps) {
  // Eğer veri yoksa boş göster
  if (!weatherData) {
    return null;
  }

  // Güvenli bir şekilde tarih oluştur, veri yoksa şu anki zamanı kullan
  const sunrise = weatherData.forecast?.sunrise ? new Date(weatherData.forecast.sunrise) : new Date();
  const sunset = weatherData.forecast?.sunset ? new Date(weatherData.forecast.sunset) : new Date();

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 my-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Hava Durumu</h2>
        <div className="text-xs text-muted-foreground flex items-center">
          <MapPin className="h-3 w-3 mr-1" />
          {weatherData.current.city_name || 'Bilinmeyen Şehir'}, {weatherData.current.country || ''}
        </div>
      </div>
      
      {/* Mevcut hava durumu */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-md bg-muted/50">
        <div className="flex items-center">
          <div className="mr-3 text-primary">
            {getWeatherIcon(weatherData.current.weather_code || 800)}
          </div>
          <div>
            <div className="text-2xl font-semibold">{Math.round(weatherData.current.temperature || 0)}°</div>
            <div className="text-xs text-muted-foreground">
              {getWeatherDescription(weatherData.current.weather_description || 'Açık')}
            </div>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex items-center text-muted-foreground">
            <Wind className="h-3 w-3 mr-1" />
            <span>{weatherData.current.wind_speed || 0} m/s</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Droplets className="h-3 w-3 mr-1" />
            <span>{weatherData.current.humidity || 0}%</span>
          </div>
        </div>
      </div>
      
      {/* Hissedilen sıcaklık */}
      <div className="mb-4 p-3 rounded-md bg-muted/30 text-sm">
        <div className="flex items-center">
          <Thermometer className="h-4 w-4 text-primary mr-2" />
          <span className="text-muted-foreground">Hissedilen:</span>
          <span className="font-medium ml-1">{Math.round(weatherData.current.temperature_feel || 0)}°</span>
        </div>
      </div>
      
      {/* Gün doğumu/batımı ve min/max sıcaklıklar */}
      {weatherData.forecast && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-md bg-muted/30 flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
              <span className="text-muted-foreground">Gün Doğumu</span>
            </div>
            <span className="font-medium">{format(sunrise, 'HH:mm')}</span>
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30 flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="h-3.5 w-3.5 text-indigo-500 mr-1.5" />
              <span className="text-muted-foreground">Gün Batımı</span>
            </div>
            <span className="font-medium">{format(sunset, 'HH:mm')}</span>
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30 flex items-center justify-between mt-2">
            <div className="flex items-center">
              <Thermometer className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
              <span className="text-muted-foreground">Min Sıcaklık</span>
            </div>
            <span className="font-medium">{Math.round(weatherData.forecast.min_temp || 0)}°</span>
          </div>
          
          <div className="p-2.5 rounded-md bg-muted/30 flex items-center justify-between mt-2">
            <div className="flex items-center">
              <Thermometer className="h-3.5 w-3.5 text-red-500 mr-1.5" />
              <span className="text-muted-foreground">Max Sıcaklık</span>
            </div>
            <span className="font-medium">{Math.round(weatherData.forecast.max_temp || 0)}°</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Weather ismi altında da dışa aktar, eski kodların uyumluluğunu korumak için
export { WeatherComponent as Weather }; 