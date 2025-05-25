/**
 * Chatbot için stream yanıt yardımcıları
 */

/**
 * AI SDK stream sonuçlarını Response'a dönüştüren yardımcı fonksiyon.
 * Bu özellikle JSON yanıtlarını (hava durumu, deprem verileri vb.) düzgün şekilde
 * stream ederken kullanışlıdır.
 */
export function streamToResponse(
  stream: { textStream: AsyncIterable<string> },
  options: {
    headers?: Record<string, string>;
    status?: number;
  } = {}
): Response {
  const encoder = new TextEncoder();
  console.log('[STREAM] Creating response stream');

  // Simplified streaming implementation
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          console.log('[STREAM] Stream started');
          let chunkCount = 0;
          let totalSize = 0;
          
          for await (const chunk of stream.textStream) {
            chunkCount++;
            totalSize += chunk.length;
            
            // Always log chunks for debugging
            console.log(`[STREAM] Chunk #${chunkCount} (${chunk.length} chars): ${chunk.substring(0, 200)}`);
            
            // Check for JSON-like content
            if (chunk.trim().startsWith('{') || chunk.trim().startsWith('[')) {
              try {
                const parsedJson = JSON.parse(chunk);
                console.log('[STREAM] Valid JSON detected:', JSON.stringify(parsedJson).substring(0, 100));
              } catch (e) {
                console.log('[STREAM] JSON-like content but not valid JSON');
              }
            }
            
            // Output additional debugging for tool calls
            if (chunk.includes('"function_call"') || chunk.includes('"tool_call"')) {
              console.log('[STREAM] TOOL CALL DETECTED in stream chunk');
            }
            
            // Enqueue the chunk
            controller.enqueue(encoder.encode(chunk));
            
            // Log progress
            if (chunkCount % 5 === 0) {
              console.log(`[STREAM] Progress: ${chunkCount} chunks, ${totalSize} chars`);
            }
          }
          
          console.log(`[STREAM] Stream complete. Total: ${chunkCount} chunks, ${totalSize} chars`);
          controller.close();
        } catch (error) {
          console.error('[STREAM] Stream error:', error instanceof Error ? error.message : JSON.stringify(error));
          console.error('[STREAM] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          controller.error(error);
        }
      },
    }),
    {
      status: options.status || 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
        ...options.headers,
      },
    }
  );
} 