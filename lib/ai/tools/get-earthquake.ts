import { tool } from 'ai';
import { z } from 'zod';

// USGS feature tipi
interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    alert: string | null;
    tsunami: number;
    felt: number | null;
    sig: number;
    url: string;
    detail: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number, number]; // [longitude, latitude, depth]
  };
  type: string;
}

// Tanımlı bölgeler için sınırlar
interface RegionBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

const predefinedRegions: Record<string, RegionBounds> = {
  "türkiye": { minLatitude: 36, maxLatitude: 42, minLongitude: 26, maxLongitude: 45 },
  "turkey": { minLatitude: 36, maxLatitude: 42, minLongitude: 26, maxLongitude: 45 },
  "california": { minLatitude: 32, maxLatitude: 42, minLongitude: -124, maxLongitude: -114 },
  "japonya": { minLatitude: 30, maxLatitude: 46, minLongitude: 129, maxLongitude: 146 },
  "japan": { minLatitude: 30, maxLatitude: 46, minLongitude: 129, maxLongitude: 146 },
  "italya": { minLatitude: 36, maxLatitude: 47, minLongitude: 6, maxLongitude: 18 },
  "italy": { minLatitude: 36, maxLatitude: 47, minLongitude: 6, maxLongitude: 18 },
  "yunanistan": { minLatitude: 34, maxLatitude: 42, minLongitude: 19, maxLongitude: 29 },
  "greece": { minLatitude: 34, maxLatitude: 42, minLongitude: 19, maxLongitude: 29 }
};

// Şehir/yer adı verilen bir konumu koordinatlara çeviren fonksiyon
async function geocodeLocation(locationName: string): Promise<{ lat: number; lon: number; displayName: string }> {
  try {
    // OpenStreetMap Nominatim API kullanıyoruz (açık kaynak ve ücretsiz)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        // Önemli: Kullanım kurallarına göre User-Agent belirtilmeli
        'User-Agent': 'DChatApp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API hatası: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error(`"${locationName}" için koordinat bulunamadı. Lütfen geçerli bir şehir veya yer adı girin.`);
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  } catch (error) {
    console.error('Geocoding hatası:', error);
    throw error;
  }
}

// Deprem verileri için output tipi
interface EarthquakeData {
  total_count: number;
  region: string;
  period: string;
  min_magnitude: number;
  earthquakes: Array<{
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
  }>;
}

// Lokasyon üzerinden deprem araması için işlevsel uygulama
async function getEarthquakesByLocation(
  location: string, 
  radius = 300, 
  days = 30, 
  min_magnitude = 3.0
): Promise<EarthquakeData> {
  try {
    // 1. Lokasyonu koordinatlara çevir
    const geocodedLocation = await geocodeLocation(location);
    
    // 2. USGS API için tarihi formatla
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);
    const formattedStartTime = startTime.toISOString().split('T')[0];
    
    // 3. API sorgusu oluştur
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${formattedStartTime}&latitude=${geocodedLocation.lat}&longitude=${geocodedLocation.lon}&maxradiuskm=${radius}&minmagnitude=${min_magnitude}`;
    
    // 4. API isteğini yap
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`USGS API hatası: ${response.statusText}`);
    }
    
    // 5. Sonuçları işle
    const data = await response.json();
    const earthquakes = data.features.map((eq: USGSFeature) => {
      const properties = eq.properties;
      const geometry = eq.geometry;
      
      return {
        id: eq.id,
        magnitude: properties.mag,
        place: properties.place,
        time: new Date(properties.time).toISOString(),
        coordinates: {
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
          depth: geometry.coordinates[2]
        },
        alert: properties.alert,
        tsunami: properties.tsunami === 1,
        felt: properties.felt,
        significance: properties.sig,
        url: properties.url,
        detail_url: properties.detail
      };
    });
    
    // 6. Sonuç döndür
    return {
      total_count: earthquakes.length,
      region: `${geocodedLocation.displayName} (${radius}km)`,
      period: `Son ${days} gün`,
      min_magnitude: min_magnitude,
      earthquakes: earthquakes
    };
  } catch (error) {
    console.error('Lokasyon bazlı deprem verisi alınırken hata:', error);
    throw error;
  }
}

export const getEarthquake = tool({
  description: 'Belirli bir bölge, şehir veya koordinat çevresindeki son depremleri al',
  parameters: z.object({
    search_type: z.enum(['region', 'location', 'coordinates']).describe('Arama tipi: bölge adı (Turkey gibi), lokasyon adı (herhangi bir şehir/yer) veya koordinatlar'),
    region: z.string().optional().describe('Bölge adı (örn: "Turkey", "California", "Japan", "Italy", "Greece") - bölge tipinde gerekli'),
    location: z.string().optional().describe('Herhangi bir şehir veya yer adı (örn: "Istanbul", "Tokyo", "Rome", "Paris") - location tipinde gerekli'),
    latitude: z.number().optional().describe('Merkez enlem - koordinat tipinde gerekli'),
    longitude: z.number().optional().describe('Merkez boylam - koordinat tipinde gerekli'),
    radius: z.number().optional().default(300).describe('Koordinat veya lokasyon araması için km cinsinden yarıçap (varsayılan: 300)'),
    days: z.number().optional().default(30).describe('Kaç günlük veri çekilecek (varsayılan: 30)'),
    min_magnitude: z.number().optional().default(3.0).describe('Minimum büyüklük filtresi (varsayılan: 3.0)')
  }),
  execute: async ({ search_type, region, location, latitude, longitude, radius = 300, days = 30, min_magnitude = 3.0 }) => {
    try {
      let url;
      let regionInfo = '';
      
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - days);
      const formattedStartTime = startTime.toISOString().split('T')[0];
      
      // USGS Earthquake API
      if (search_type === 'coordinates' && latitude !== undefined && longitude !== undefined) {
        url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${formattedStartTime}&latitude=${latitude}&longitude=${longitude}&maxradiuskm=${radius}&minmagnitude=${min_magnitude}`;
        regionInfo = `${latitude}, ${longitude} (${radius}km)`;
      } 
      else if (search_type === 'location' && location) {
        // Lokasyon adını koordinatlara çeviren yardımcı fonksiyonu kullan
        // Bu recursive problemi önler ve kodu daha modüler yapar
        return await getEarthquakesByLocation(location, radius, days, min_magnitude);
      } 
      else if (search_type === 'region' && region) {
        const normalizedRegion = region.toLowerCase().trim();
        const regionBounds = predefinedRegions[normalizedRegion];
        
        if (regionBounds) {
          // Tanımlı bölge sınırlarını kullan
          url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${formattedStartTime}&minmagnitude=${min_magnitude}&minlatitude=${regionBounds.minLatitude}&maxlatitude=${regionBounds.maxLatitude}&minlongitude=${regionBounds.minLongitude}&maxlongitude=${regionBounds.maxLongitude}`;
          regionInfo = region;
        } 
        else {
          // Tanımlı bölge yoksa, location olarak dene
          // Geçici çözüm yerine doğrudan dış fonksiyonu kullan
          return await getEarthquakesByLocation(region, radius, days, min_magnitude);
        }
      } 
      else {
        throw new Error("Geçersiz arama parametreleri.");
      }
      
      // Bu kısım çalışacak: coordinates veya tanımlı region araması için
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`USGS API hatası: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Verileri daha okunaklı bir formata dönüştür
      const earthquakes = data.features.map((eq: USGSFeature) => {
        const properties = eq.properties;
        const geometry = eq.geometry;
        
        return {
          id: eq.id,
          magnitude: properties.mag,
          place: properties.place,
          time: new Date(properties.time).toISOString(),
          coordinates: {
            latitude: geometry.coordinates[1],
            longitude: geometry.coordinates[0],
            depth: geometry.coordinates[2]
          },
          alert: properties.alert,
          tsunami: properties.tsunami === 1,
          felt: properties.felt,
          significance: properties.sig,
          url: properties.url,
          detail_url: properties.detail
        };
      });
      
      return {
        total_count: earthquakes.length,
        region: regionInfo,
        period: `Son ${days} gün`,
        min_magnitude: min_magnitude,
        earthquakes: earthquakes
      };
    } catch (error) {
      console.error('Deprem verisi alınırken hata:', error);
      throw error;
    }
  },
}); 