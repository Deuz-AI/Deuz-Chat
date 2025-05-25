import { generateText, Message, CoreMessage, ToolCallPart, ToolResultPart, streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { getWeather, getEarthquake, getExchangeRate, getCoin, getStock } from '@/lib/ai/tools';
import { supabase } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/supabase/storage';
import { z } from 'zod';

// OpenWeather API anahtarı
const OPENWEATHER_API_KEY = "5998e8bdad7b9d919e410d4b60771131";

// Hava durumu fonksiyonunu OpenWeather API ile manuel olarak çağırmak için yardımcı fonksiyon
async function fetchWeatherData(latitude: number, longitude: number) {
  try {
    console.log(`[API] Fetching weather data for coordinates: ${latitude}, ${longitude}`);
    // Open-Meteo API'ye doğrudan istek at
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Open-Meteo API error: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`Hava durumu API'sine erişim hatası: ${response.statusText}`);
    }

    const weatherData = await response.json();
    console.log(`[API] Successfully retrieved weather data from Open-Meteo`, JSON.stringify(weatherData).slice(0, 200) + '...');
    return weatherData;
  } catch (error) {
    console.error('[API] Error fetching weather data:', error instanceof Error ? error.message : JSON.stringify(error));
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Ayrıca şehir ismi ile hava durumu almak için ek bir fonksiyon
async function fetchWeatherByCity(cityName: string) {
  try {
    console.log(`[API] Fetching weather data for city: ${cityName}`);
    // OpenWeather API'ye şehir ismi ile istek at
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] OpenWeather API error: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`OpenWeather API'sine erişim hatası: ${response.statusText}`);
    }

    const weatherData = await response.json();
    console.log(`[API] Successfully retrieved weather data from OpenWeather for ${cityName}`, JSON.stringify(weatherData).slice(0, 200) + '...');
    
    // OpenWeather'dan gelen veriyi daha kullanışlı bir formata dönüştür
    const formattedWeatherData = {
      current: {
        temperature: weatherData.main.temp,
        temperature_feel: weatherData.main.feels_like,
        humidity: weatherData.main.humidity,
        weather_code: weatherData.weather[0].id,
        weather_description: weatherData.weather[0].description,
        weather_main: weatherData.weather[0].main,
        wind_speed: weatherData.wind.speed,
        city_name: weatherData.name,
        country: weatherData.sys.country
      },
      forecast: {
        // Tek günlük veride tahmin yok, sadece mevcut bilgileri gönderiyoruz
        max_temp: weatherData.main.temp_max,
        min_temp: weatherData.main.temp_min,
        sunrise: new Date(weatherData.sys.sunrise * 1000).toISOString(),
        sunset: new Date(weatherData.sys.sunset * 1000).toISOString()
      }
    };
    
    return formattedWeatherData;
  } catch (error) {
    console.error(`[API] Error fetching weather data for ${cityName}:`, error instanceof Error ? error.message : JSON.stringify(error));
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Process attachment files and upload them
async function processAttachments(files: File[], sessionId: string) {
  const attachmentUrls: string[] = [];
  
  for (const file of files) {
    try {
      const result = await uploadImage(file, sessionId);
      if (result.success && result.url) {
        attachmentUrls.push(result.url);
        console.log(`[API] Successfully uploaded attachment: ${file.name}`);
      } else {
        console.error(`[API] Failed to upload attachment: ${file.name}`, result.error);
      }
    } catch (error) {
      console.error(`[API] Error uploading attachment: ${file.name}`, error);
    }
  }
  
  return attachmentUrls;
}

// Supabase'e sohbeti kaydetmek için fonksiyon
async function saveChatToSupabase(sessionId: string, messages: CoreMessage[]) {
  console.log(`[SAVE CHAT] Attempting to save chat for session ID: ${sessionId}`);
  if (!sessionId) {
    console.error('[SAVE CHAT] Session ID is undefined, skipping save.');
    return;
  }

  // Kullanıcı ve asistan mesajlarını filtrele
  const chatMessagesToSave = messages.filter(
    msg => msg.role === 'user' || msg.role === 'assistant'
  );

  if (chatMessagesToSave.length === 0) {
    console.log('[SAVE CHAT] No user or assistant messages to save.');
    return;
  }

  console.log(`[SAVE CHAT] Saving ${chatMessagesToSave.length} messages for session ${sessionId}.`);
  // Log the actual messages being sent to Supabase for inspection
  console.log('[SAVE CHAT] Messages to save:', JSON.stringify(chatMessagesToSave, null, 2));

  try {
    const payload = {
      id: sessionId,
      messages: chatMessagesToSave,
      updated_at: new Date().toISOString(),
    };
    console.log('[SAVE CHAT] Upsert payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase
      .from('chats')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[SAVE CHAT] Error saving chat to Supabase. Raw error object:', error);
      console.error('[SAVE CHAT] Supabase error message:', error.message);
      console.error('[SAVE CHAT] Supabase error details:', error.details);
      console.error('[SAVE CHAT] Supabase error hint:', error.hint);
      console.error('[SAVE CHAT] Supabase error code:', error.code);
      throw error; // Re-throw the original error object for further inspection if needed
    }
    console.log('[SAVE CHAT] Chat saved successfully to Supabase. Response data:', data);
  } catch (err: any) {
    console.error('[SAVE CHAT] Exception during saveChatToSupabase. Full exception:', err);
    if (err.message) {
        console.error('[SAVE CHAT] Exception message:', err.message);
    }
    // Hatanın tekrar fırlatılması, onFinish'in genel hata yönetimini etkileyebilir.
    // Şimdilik sadece logluyoruz, ancak yukarıda `throw error` ile fırlatıyoruz.
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let messages, sessionId, files: File[] = [];
    let attachmentUrls: string[] = [];

    // Check if request contains multipart data (with files) or JSON
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with attachments)
      const formData = await req.formData();
      const messagesData = formData.get('messages');
      sessionId = formData.get('sessionId');
      const attachmentUrlsData = formData.get('attachmentUrls');
      
      if (!messagesData || !sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      messages = JSON.parse(messagesData as string);
      
      // Parse attachment URLs if available
      let existingAttachmentUrls: string[] = [];
      if (attachmentUrlsData) {
        existingAttachmentUrls = JSON.parse(attachmentUrlsData as string);
      }
      
      // Get uploaded files if any
      let fileIndex = 0;
      while (formData.has(`file${fileIndex}`)) {
        const file = formData.get(`file${fileIndex}`) as File;
        if (file) {
          // Don't store files, just log for debugging
          console.log(`[CHAT API] Received file: ${file.name} (will use pre-uploaded URL)`);
        }
        fileIndex++;
      }
      
      // If we have existing attachment URLs, use them instead of processing files again
      if (existingAttachmentUrls.length > 0) {
        attachmentUrls = existingAttachmentUrls;
        console.log(`[CHAT API] Using ${attachmentUrls.length} existing attachment URLs`);
      }
    } else {
      // Handle JSON (no attachments)
      const body = await req.json();
      messages = body.messages;
      sessionId = body.sessionId;
      
      if (!messages || !sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log(`[CHAT API] Processing chat request with ${messages.length} messages and ${files.length} attachments`);
    console.log('[CHAT API] Request for session:', sessionId);
    console.log('[CHAT API] Last message content:', messages[messages.length - 1]?.content);
    
    // Skip file upload in API route - already done in frontend
    // Use existing attachment URLs that were uploaded in frontend
    if (attachmentUrls.length > 0) {
      console.log(`[CHAT API] Using ${attachmentUrls.length} pre-uploaded attachment URLs`);
    }
    
    // Check API keys
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!openaiApiKey && !deepseekApiKey) {
      console.error('[CHAT API] Missing both OPENAI_API_KEY and DEEPSEEK_API_KEY in environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing API configuration' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Use OpenAI only if images are present AND OpenAI key exists, otherwise use DeepSeek
    const shouldUseOpenAI = attachmentUrls.length > 0 && openaiApiKey;
    const model = shouldUseOpenAI ? openai('gpt-4o') : deepseek('deepseek-chat');
    
    console.log(`[CHAT API] Using ${shouldUseOpenAI ? 'OpenAI GPT-4o' : 'DeepSeek'} model`);
    
    // Formatlı mesajları oluştur
    let formattedMessages = messages.map((message: any) => {
      if (message.role === 'user' && attachmentUrls.length > 0 && message === messages[messages.length - 1] && shouldUseOpenAI) {
        // Add images to the last user message (only for OpenAI)
        const content: any[] = [
          { type: 'text', text: message.content }
        ];
        
        for (const url of attachmentUrls) {
          content.push({
            type: 'image_url',
            image_url: { url: url }
          });
        }
        
        return {
          role: message.role,
          content
        };
      }
      
      return {
        role: message.role,
        content: message.content,
      };
    });
    
    // System mesajı ekle
    formattedMessages.unshift({
      role: "system",
      content: `Sen bir yapay zeka asistanısın. Kullanıcının sorularına kısa ve net cevaplar ver. 

${attachmentUrls.length > 0 && shouldUseOpenAI ? 'Kullanıcı resim gönderdiğinde, resimleri analiz et ve detaylı açıklamalar yap. Resimdeki nesneleri, renkleri, komposizyonu ve dikkat çeken detayları açıkla.' : attachmentUrls.length > 0 ? 'Kullanıcı resim gönderdi ama şu an resim analizi desteği yok. Kullanıcıya resim analizi için OpenAI API key gerektiğini söyle.' : ''}

Kullanıcı basit bir selamlaşma mesajı gönderdiğinde (örn. 'merhaba', 'selam', 'hello' vb.) sadece nazik bir karşılama mesajı ile yanıt ver, ek bilgi veya özellik tanıtımı yapma.

Depremlerle ilgili sorularda, kullanıcının mesajından lokasyon bilgisini tespit etmelisin:
1. Kullanıcı belirli bir yer (ülke, şehir, bölge) belirtmişse o lokasyon için veri getir.
2. Kullanıcı global veya dünya geneli için bilgi istiyorsa, "Turkey" lokasyonunu kullan ama yarıçapı 1000 km olarak ayarla.
3. Kullanıcı hiçbir yer belirtmemişse, "Turkey" lokasyonunu kullan ve normal yarıçapı (300 km) uygula.

Global, dünya, dünya geneli, tüm dünya gibi ifadeler gördüğünde, getEarthquake fonksiyonunda varsayılan olarak search_type=location, location="Turkey" ve radius=1000 parametrelerini kullan.

Kullanıcı özellikle sorduğunda hava durumu, deprem bilgisi, döviz kuru, kripto para ve hisse senedi bilgilerini sağlayabilirsin.

Kripto paralar için getCoin, hisse senetleri için getStock aracını kullanabilirsin.`
    });
    
    try {
      // Log available tools
      console.log('[CHAT API] Available tools:', {
        weather: getWeather ? 'Available' : 'Not found',
        earthquake: getEarthquake ? 'Available' : 'Not found',
        exchangeRate: getExchangeRate ? 'Available' : 'Not found',
        coin: getCoin ? 'Available' : 'Not found',
        stock: getStock ? 'Available' : 'Not found'
      });
      
      console.log('[CHAT API] Using generateText to determine tool calls, then streamText for final response');
      
      // First call: Use generateText to potentially execute tools
      const initialResult = await generateText({
        model,
        messages: formattedMessages as CoreMessage[],
        temperature: 0.7,
        tools: { getWeather, getEarthquake, getExchangeRate, getCoin, getStock },
      });
      
      // Check if the initial result included tool calls
      if (initialResult.toolCalls.length > 0) {
        console.log('[CHAT API] Tools were called. Processing tool results and streaming final response.');

        const toolResults = initialResult.toolResults;
        
        // Construct the message history including tool interactions
        const messagesForFinalStream: CoreMessage[] = [
          ...formattedMessages as CoreMessage[],
          // Assistant message reporting the tool calls it decided to make
          {
            role: 'assistant',
            content: initialResult.toolCalls.map(toolCall => ({
              type: 'tool-call',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args,
            })),
          },
          // Tool messages reporting the results of the tool calls
          ...toolResults.map(toolResult => ({
            role: 'tool' as const,
            content: [
              {
                type: 'tool-result' as const,
                toolCallId: toolResult.toolCallId,
                toolName: toolResult.toolName,
                result: toolResult.result
              }
            ]
          })),
        ];

        // Log the tool results for debugging
        console.log('[CHAT API] Tool results:', toolResults.map(tr => ({
          toolName: tr.toolName,
          resultSummary: tr.result ? (typeof tr.result === 'string' ? tr.result.slice(0,100) : typeof tr.result) : 'null'
        })));
        
        // İkinci çağrı: streamText kullanarak nihai yanıtı stream et
        console.log('[CHAT API] Generating final STREAMING response based on tool results');
        const result = streamText({
          model,
          messages: messagesForFinalStream,
          temperature: 0.7,
          onFinish: async ({ text, toolCalls, toolResults: finalToolResults, usage, finishReason }) => {
            console.log('[CHAT API] Stream finished (with tools). Reason:', finishReason);
            console.log('[CHAT API] Final text (with tools):', text ? text.slice(0, 100) + "..." : "No text");
            
            const finalMessages: CoreMessage[] = [
                ...messagesForFinalStream,
                { role: 'assistant', content: text || "" } // text boş veya undefined ise boş string
            ];
            if (text) { // Sadece metin varsa kaydet
                 await saveChatToSupabase(sessionId as string, finalMessages);
            }
          },
        });

        return result.toTextStreamResponse();

      } else {
        // No tool calls, stream the response directly
        console.log('[CHAT API] No tools called. Streaming response directly.');
        const result = streamText({
          model,
          messages: formattedMessages as CoreMessage[],
          temperature: 0.7,
          onFinish: async ({ text, toolCalls, toolResults, usage, finishReason }) => {
            console.log('[CHAT API] Stream finished (no tools). Reason:', finishReason);
            console.log('[CHAT API] Final text (no tools):', text ? text.slice(0,100)+"..." : "No text");
            const finalMessages: CoreMessage[] = [
                ...formattedMessages as CoreMessage[],
                { role: 'assistant', content: text || "" }
            ];
            if (text) { // Sadece metin varsa kaydet
                 await saveChatToSupabase(sessionId as string, finalMessages);
            }
          }
        });
        
        return result.toTextStreamResponse();
      }
      
    } catch (error: any) {
      console.error('[CHAT API] Error with AI SDK:', error instanceof Error ? error.message : JSON.stringify(error));
      console.error('[CHAT API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return new Response(
        JSON.stringify({ error: 'AI SDK error: ' + (error instanceof Error ? error.message : JSON.stringify(error)) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('[CHAT API] Error in chat API route:', error instanceof Error ? error.message : JSON.stringify(error));
    console.error('[CHAT API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error instanceof Error ? error.message : JSON.stringify(error)) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
