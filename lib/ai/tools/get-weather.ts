import { tool } from 'ai';
import { z } from 'zod';

const OPENWEATHER_API_KEY = "5998e8bdad7b9d919e410d4b60771131";

export const getWeather = tool({
  description: 'Bir konum veya şehir için hava durumu bilgisi al',
  parameters: z.object({
    location_type: z.enum(['coordinates', 'city_name']).describe('Konum tipi: koordinatlar veya şehir adı'),
    latitude: z.number().optional().describe('Enlem (koordinat tipinde gerekli)'),
    longitude: z.number().optional().describe('Boylam (koordinat tipinde gerekli)'),
    city_name: z.string().optional().describe('Şehir adı (şehir adı tipinde gerekli)')
  }),
  execute: async ({ location_type, latitude, longitude, city_name }) => {
    console.log('[WEATHER TOOL] Called with params:', { location_type, latitude, longitude, city_name });
    
    try {
      let url;
      
      if (location_type === 'coordinates' && latitude && longitude) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`;
        console.log('[WEATHER TOOL] Using coordinates URL:', url);
      } else if (location_type === 'city_name' && city_name) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city_name)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
        console.log('[WEATHER TOOL] Using city name URL:', url);
      } else {
        console.error('[WEATHER TOOL] Invalid parameters:', { location_type, latitude, longitude, city_name });
        throw new Error("Geçersiz konum bilgisi.");
      }
      
      console.log('[WEATHER TOOL] Fetching weather data from URL');
      const response = await fetch(url);
      
      console.log('[WEATHER TOOL] API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WEATHER TOOL] API error response:', errorText);
        throw new Error(`OpenWeather API hatası: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[WEATHER TOOL] API response data (partial):', JSON.stringify(data).substring(0, 200));
      
      const result = {
        current: {
          temperature: data.main.temp,
          temperature_feel: data.main.feels_like,
          humidity: data.main.humidity,
          weather_code: data.weather[0].id,
          weather_description: data.weather[0].description,
          weather_main: data.weather[0].main,
          wind_speed: data.wind.speed,
          city_name: data.name,
          country: data.sys.country
        },
        forecast: {
          max_temp: data.main.temp_max,
          min_temp: data.main.temp_min,
          sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
          sunset: new Date(data.sys.sunset * 1000).toISOString()
        }
      };
      
      console.log('[WEATHER TOOL] Returning formatted data');
      return result;
    } catch (error) {
      console.error('[WEATHER TOOL] Error getting weather data:', error instanceof Error ? error.message : JSON.stringify(error));
      console.error('[WEATHER TOOL] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  },
}); 