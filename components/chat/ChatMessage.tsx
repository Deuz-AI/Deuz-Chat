import { Avatar } from '@/components/ui/avatar';
import { Message } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Weather } from '@/components/WeatherComponent';
import { Earthquake } from '@/components/EarthquakeComponent';
import { ExchangeRateComponent } from '@/components/ExchangeRateComponent';
import { CoinComponent } from '@/components/CoinComponent';
import { StockComponent } from '@/components/StockComponent';
import { useState, useEffect } from 'react';
import { File, ExternalLink, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

export type ChatMessageProps = {
  message: Message;
  isLoading?: boolean;
};

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // DEBUG: Her mesaj için detaylı bilgileri konsola yazdır
  console.log(`[CHATMESSAGE ${message.role.toUpperCase()}] Message ID: ${message.id}`);
  console.log(`[CHATMESSAGE ${message.role.toUpperCase()}] Content: ${message.content}`);
  
  // Ekli resimleri kontrol et ve logla
  if (message.attachments) {
    console.log(`[CHATMESSAGE ${message.role.toUpperCase()}] Attachments:`, message.attachments);
    if (message.attachments.length > 0) {
      message.attachments.forEach((url, idx) => {
        console.log(`[CHATMESSAGE ${message.role.toUpperCase()}] Attachment ${idx + 1}:`, url);
      });
    }
  }
  
  // any tipine dönüştürerek image_url'e eriş
  const msgAny = message as any;
  if (msgAny.image_url) {
    console.log(`[CHATMESSAGE ${message.role.toUpperCase()}] Image URL:`, msgAny.image_url);
  }
  
  const [weatherData, setWeatherData] = useState<any>(null);
  const [earthquakeData, setEarthquakeData] = useState<any>(null);
  const [exchangeRateData, setExchangeRateData] = useState<any>(null);
  const [coinData, setCoinData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [messageText, setMessageText] = useState<string>(message.content || '');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Mesaj içindeki resimleri işle
  useEffect(() => {
    console.log(`[CHATMESSAGE] Message ${message.id} renderlanıyor...`);
    
    try {
      // Önce attachments'ları kontrol et
      if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
        console.log(`[CHATMESSAGE] Mesajda ${message.attachments.length} ek var:`, message.attachments);
        
        // URL'leri direk görüntülenebilir hale getir
        const imageUrls = message.attachments
          .filter(url => url && typeof url === 'string')
          .map(url => {
            if (url) {
              // Önemli: Burada URL'i hiçbir işleme tabi tutmuyoruz, olduğu gibi kullanıyoruz
              console.log(`[CHATMESSAGE] İşlenen URL: ${url}`);
              return url;
            }
            return null;
          })
          .filter(Boolean) as string[];
        
        console.log(`[CHATMESSAGE] Mesaj ${message.id} için ${imageUrls.length} resim URL'i ayarlandı`);
        setAttachmentImages(imageUrls);
        
        // Debug: Resim URL'lerini konsola yazdır
        imageUrls.forEach((url, idx) => {
          console.log(`[CHATMESSAGE] Resim ${idx + 1}: ${url}`);
        });
      } else {
        // Eski message.image_url'i kontrol et (geriye dönük uyumluluk)
        const msgAny = message as any;
        if (msgAny.image_url && typeof msgAny.image_url === 'string') {
          console.log(`[CHATMESSAGE] Mesajda image_url var: ${msgAny.image_url}`);
          setAttachmentImages([msgAny.image_url]);
        } else {
          console.log(`[CHATMESSAGE] Mesaj ${message.id} için resim yok`);
          setAttachmentImages([]);
        }
      }
    } catch (error) {
      console.error(`[CHATMESSAGE] Resim işleme hatası:`, error);
      setAttachmentImages([]);
    }
  }, [message]);
  
  useEffect(() => {
    // Get PDF URL if message has a fileId
    const fetchPdfUrl = async () => {
      if (message.file_id) {
        try {
          const { data } = await supabase.storage
            .from('attachments')
            .createSignedUrl(message.file_id, 60 * 60); // 1 hour expiry
          
          if (data?.signedUrl) {
            setPdfUrl(data.signedUrl);
          }
        } catch (error) {
          console.error('Error fetching PDF URL:', error);
        }
      }
    };
    
    fetchPdfUrl();
  }, [message.file_id]);

  useEffect(() => {
    // Reset copy status after 2 seconds
    if (copiedCode) {
      const timer = setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  useEffect(() => {
    // Gelen mesajın içeriğini kontrol et - JSON formatında veri içeriyor mu?
    if (!isUser && message.content) {
      try {
        // JSON objesi olup olmadığını kontrol et - trim yaparak boşlukları temizle
        const trimmedContent = message.content.trim();
        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
          try {
            const parsedContent = JSON.parse(trimmedContent);
            
            // Hata ayıklama için içeriği konsola yazdır
            console.log("[DEBUG] Parsed message content:", parsedContent);
            
            // Tüm veri türlerini başlangıçta sıfırla
            setWeatherData(null);
            setEarthquakeData(null);
            setExchangeRateData(null);
            setCoinData(null);
            setStockData(null);
            
            // İlgili veri tipine göre state'i güncelle
            if (parsedContent.weather_data) {
              setWeatherData(parsedContent.weather_data);
              if (parsedContent.text) {
                setMessageText(parsedContent.text);
              } else {
                setMessageText("İşte hava durumu bilgisi:");
              }
            } 
            else if (parsedContent.earthquake_data) {
              setEarthquakeData(parsedContent.earthquake_data);
              if (parsedContent.text) {
                setMessageText(parsedContent.text);
              } else {
                setMessageText("İşte deprem bilgisi:");
              }
            }
            else if (parsedContent.exchange_rate_data) {
              setExchangeRateData(parsedContent.exchange_rate_data);
              if (parsedContent.text) {
                setMessageText(parsedContent.text);
              } else {
                setMessageText("İşte döviz kuru bilgisi:");
              }
            }
            else if (parsedContent.coin_data) {
              console.log("[DEBUG] Coin data:", parsedContent.coin_data);
              setCoinData(parsedContent.coin_data);
              if (parsedContent.text) {
                setMessageText(parsedContent.text);
              } else {
                setMessageText("İşte kripto para bilgisi:");
              }
            }
            else if (parsedContent.stock_data) {
              console.log("[DEBUG] Stock data:", parsedContent.stock_data);
              setStockData(parsedContent.stock_data);
              if (parsedContent.text) {
                setMessageText(parsedContent.text);
              } else {
                setMessageText("İşte hisse senedi bilgisi:");
              }
            }
            else {
              // Özel veri tipi yoksa normal içeriği göster
              setMessageText(message.content);
            }
          } catch (jsonError) {
            // JSON parse hatası olduysa, içeriği olduğu gibi göster
            console.error("Error parsing message content as JSON:", jsonError);
            setMessageText(message.content);
          }
        } else {
          // JSON formatında değilse olduğu gibi göster
          setMessageText(message.content);
        }
      } catch (error) {
        // Herhangi bir hata olursa içeriği olduğu gibi göster
        console.error("Error processing message content:", error);
        setMessageText(message.content);
      }
    } else {
      // Kullanıcı mesajı veya boş içerik durumunda
      setMessageText(message.content);
    }
  }, [message.content, isUser]);

  // Handle code copy
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
  };

  // Format whitespace for better readability
  const formattedContent = messageText.trim();

  return (
    <div 
      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-8`}
      data-testid={`message-${message.id}`}
    >
      {!isUser && (
        <Avatar className="h-9 w-9 mt-1 flex-shrink-0 border border-gray-200">
          <div className="bg-black text-white h-full w-full flex items-center justify-center rounded-full text-xs font-semibold">
            AI
          </div>
        </Avatar>
      )}
      
      <div className={`max-w-[85%] relative`}>
        <Card 
          className={`p-5 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-white/10 dark:bg-black/10 text-black dark:text-white border border-white/20 dark:border-black/20 backdrop-blur-md shadow-lg' 
              : 'bg-white text-black border border-gray-100'
          }`}
        >
          {/* Display PDF attachment if present */}
          {message.file_id && message.file_name && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between border border-gray-100">
              <div className="flex items-center">
                <File size={16} className="text-gray-500 mr-2" />
                <span className="text-sm truncate max-w-[200px]">{message.file_name}</span>
              </div>
              {pdfUrl && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-3 text-xs hover:bg-gray-200 transition-colors"
                  onClick={() => window.open(pdfUrl, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1" />
                  Open
                </Button>
              )}
            </div>
          )}

          {/* Tüm mesajlar için resim eklentileri - hem kullanıcı hem asistan için */}
          {attachmentImages.length > 0 && (
            <div className="mt-2 mb-3">
              <div className="flex flex-col gap-2">
                {attachmentImages.map((imageUrl, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border border-gray-200 hover:shadow-md">
                    <a 
                      href={imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img
                        src={imageUrl}
                        className="w-full max-h-[400px] object-contain"
                        loading="lazy"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            {isUser ? (
              <div className="whitespace-pre-wrap">{formattedContent}</div>
            ) : isLoading ? (
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              /* Ana içerik ve veri gösterimi */
              <>
                {/* Metin içeriği */}
                <ReactMarkdown
                  components={{
                    img: ({ node, ...props }) => {
                      // img elementini özelleştir - resim gösterimini devre dışı bırak
                      return null; // Markdown içindeki resimleri gösterme
                    },
                    code({ node, inline, className, children, ...props }: {
                      node?: any;
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                      [key: string]: any;
                    }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const code = String(children).replace(/\n$/, '');
                      
                      return !inline && match ? (
                        <div className="relative group my-4 overflow-hidden rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                            <span>{match[1]}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-gray-200 rounded-md transition-colors"
                              onClick={() => handleCopyCode(code)}
                            >
                              {copiedCode === code ? (
                                <Check size={14} className="text-green-500" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{margin: 0, borderRadius: 0}}
                            {...props}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={`${className} px-1.5 py-0.5 rounded-md bg-gray-100 text-black font-mono text-sm`} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {formattedContent}
                </ReactMarkdown>
                
                {/* Bu bölümü tamamen kaldırıyoruz */}
                
                {weatherData && <Weather weatherData={weatherData} />}
                {earthquakeData && <Earthquake earthquakeData={{...earthquakeData, simpleFormat: !(formattedContent.includes("İşte deprem bilgisi") || formattedContent.includes("deprem"))}} />}
                {exchangeRateData && <ExchangeRateComponent exchangeData={{
                  ...exchangeRateData,
                  simpleFormat: formattedContent.includes("=") || 
                               formattedContent.includes("USD") || 
                               formattedContent.includes("TRY") || 
                               formattedContent.includes("EUR") ||
                               formattedContent.includes("to") ||
                               (formattedContent.match(/\d+\s*[A-Z]{3}/) !== null)
                }} />}
                {coinData && <CoinComponent coinData={coinData} />}
                {stockData && <StockComponent stockData={stockData} />}
              </>
            )}
          </div>
        </Card>

        {/* Mesaj gönderilme zamanı */}
        {message.created_at && (
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end mr-1' : 'ml-1'}`}>
            <div className="text-[10px] text-gray-400">
              {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {message.response_time ? ` · ${message.response_time.toFixed(1)}s` : ''}
            </div>
            {!isUser && (
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(formattedContent);
                  setCopiedCode(formattedContent);
                }}
              >
                {copiedCode === formattedContent ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}