import { NextRequest } from 'next/server';
import { streamText, generateObject } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { tavily } from '@tavily/core';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

// Tavily client'ını initialize et
const tvly = tavily({ 
  apiKey: process.env.TAVILY_API_KEY || ''
});

// Research plan şeması - 5 analiz olarak güncellendi
const ResearchPlanSchema = z.object({
  searches: z.array(z.object({
    priority: z.number().min(1).max(5),
    query: z.string(),
    type: z.literal('web')
  })).length(5),
  analyses: z.array(z.object({
    type: z.string(),
    description: z.string(),
    priority: z.number().min(1).max(5)
  })).length(5) // Tam 5 analiz
});

// Analysis result şeması - links eklendi
const AnalysisResultSchema = z.object({
  findings: z.array(z.object({
    insight: z.string(),
    evidence: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    source_links: z.array(z.object({
      title: z.string(),
      url: z.string()
    }))
  })),
  implications: z.array(z.string()),
  limitations: z.array(z.string()),
  key_sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    relevance: z.number().min(0).max(1)
  }))
});

export async function POST(req: NextRequest) {
  const { topic, sessionId, depth = 'basic' } = await req.json();
  
  if (!topic || !sessionId) {
    return new Response(
      JSON.stringify({ error: 'Topic and sessionId are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[DEEP SEARCH] Starting research for topic: "${topic}" with depth: ${depth}`);

  // Create a custom stream for sending real-time updates
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper function to send progress updates
      const sendUpdate = (type: string, data: any) => {
        const update = {
          type,
          data,
          timestamp: new Date().toISOString()
        };
        console.log(`[DEEP SEARCH] Sending update:`, update);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      };

      try {
        // Database'e kaydetme için değişkenler
        let assistantMessageId: string | null = null;
        let currentProgress = 0;
        let currentStatus: 'planning' | 'searching' | 'analyzing' | 'complete' = 'planning';
        
        // Current date for research context
        const currentDate = new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

        // Step 1: Planning phase
        sendUpdate('step_start', {
          step: 1,
          title: 'Research Planning',
          description: 'Creating comprehensive research plan...',
          status: 'running'
        });

        const researchPlan = await createResearchPlan(topic, currentDate);
        console.log('[DEEP SEARCH] Research plan created:', researchPlan);

        sendUpdate('step_complete', {
          step: 1,
          title: 'Research Planning',
          description: 'Research plan created successfully',
          status: 'completed'
        });

        sendUpdate('research_plan', {
          plan: researchPlan,
          totalSteps: 5 + researchPlan.analyses.length
        });

        // Veritabanına assistant message oluştur
        try {
          const { data: assistantMessage, error: msgError } = await supabase
            .from('messages')
            .insert({
              session_id: sessionId,
              role: 'assistant',
              content: '', // İlk başta boş, sonra doldurulacak
              research_plan: researchPlan,
              research_status: 'planning',
              research_progress: 10
            })
            .select()
            .single();

          if (msgError) {
            console.error('[DEEP SEARCH] Error creating assistant message:', msgError);
          } else {
            assistantMessageId = assistantMessage.id;
            console.log('[DEEP SEARCH] Assistant message created:', assistantMessageId);
          }
        } catch (dbError) {
          console.error('[DEEP SEARCH] Database error:', dbError);
        }

        // Steps 2-6: Execute web searches
        const searchResults: any[] = [];
        currentStatus = 'searching';
        
        for (let i = 0; i < researchPlan.searches.length; i++) {
          const search = researchPlan.searches[i];
          const stepNumber = i + 2;
          
          sendUpdate('step_start', {
            step: stepNumber,
            title: `Web Search ${i + 1}`,
            description: `Searching: "${search.query}"`,
            status: 'running'
          });

          const result = await executeWebSearch(search.query, depth, search.priority);
          searchResults.push(result);

          sendUpdate('step_complete', {
            step: stepNumber,
            title: `Web Search ${i + 1}`,
            description: `Found ${result.results?.length || 0} sources`,
            status: 'completed',
            data: {
              query: search.query,
              resultCount: result.results?.length || 0,
              sources: result.results?.slice(0, 4).map((r: any) => ({
                title: r.title,
                url: r.url
              })) || []
            }
          });

          // Update progress
          currentProgress = Math.round(((stepNumber) / (5 + researchPlan.analyses.length)) * 70); // 70% for searches
          sendUpdate('progress', { progress: currentProgress });
          
          // Update database
          if (assistantMessageId) {
            await updateMessageInDatabase(assistantMessageId, {
              search_results: searchResults,
              research_status: currentStatus,
              research_progress: currentProgress
            });
          }
        }

        console.log(`[DEEP SEARCH] Completed ${searchResults.length} searches`);

        // Steps 7-11: Perform analyses (5 analyses)
        const analysisResults: any[] = [];
        currentStatus = 'analyzing';
        
        for (let i = 0; i < researchPlan.analyses.length; i++) {
          const analysis = researchPlan.analyses[i];
          const stepNumber = 7 + i;
          
          sendUpdate('step_start', {
            step: stepNumber,
            title: `Analysis ${i + 1}: ${analysis.type}`,
            description: analysis.description,
            status: 'running'
          });

          const result = await analyzeResults(searchResults, analysis.type, analysis.description);
          analysisResults.push({
            type: analysis.type,
            description: analysis.description,
            result
          });

          sendUpdate('step_complete', {
            step: stepNumber,
            title: `Analysis ${i + 1}: ${analysis.type}`,
            description: `Analysis completed - ${result.findings?.length || 0} key findings`,
            status: 'completed',
            data: {
              type: analysis.type,
              findingsCount: result.findings?.length || 0,
              insights: result.findings?.slice(0, 2).map((f: any) => f.insight) || [],
              keyLinks: result.key_sources?.slice(0, 4) || []
            }
          });

          // Update progress
          currentProgress = Math.round(70 + ((i + 1) / researchPlan.analyses.length) * 25); // 25% for analyses
          sendUpdate('progress', { progress: currentProgress });
          
          // Update database
          if (assistantMessageId) {
            await updateMessageInDatabase(assistantMessageId, {
              analysis_results: analysisResults,
              research_status: currentStatus,
              research_progress: currentProgress
            });
          }
        }

        console.log(`[DEEP SEARCH] Completed ${analysisResults.length} analyses`);

        // Step 12: Final report generation
        sendUpdate('step_start', {
          step: 12,
          title: 'Final Report Generation',
          description: 'Generating comprehensive report with citations...',
          status: 'running'
        });

        // Collect all sources for citations
        const allSources: Array<{ title: string; url: string; relevance?: number }> = [];
        const sourceMap = new Map<string, number>();
        let citationCounter = 1;

        // Add sources from search results
        searchResults.forEach(searchResult => {
          if (searchResult.results) {
            searchResult.results.forEach((result: any) => {
              if (result.url && !sourceMap.has(result.url)) {
                sourceMap.set(result.url, citationCounter++);
                allSources.push({
                  title: result.title || 'Untitled',
                  url: result.url,
                  relevance: 0.8
                });
              }
            });
          }
        });

        // Add sources from analysis results
        analysisResults.forEach(analysis => {
          if (analysis.result?.key_sources) {
            analysis.result.key_sources.forEach((source: any) => {
              if (source.url && !sourceMap.has(source.url)) {
                sourceMap.set(source.url, citationCounter++);
                allSources.push({
                  title: source.title || 'Untitled',
                  url: source.url,
                  relevance: source.relevance || 0.7
                });
              }
            });
          }
        });

        // Create enhanced report prompt with citation instructions
        const reportPrompt = `Create a comprehensive research report on the topic: "${topic}"

Based on the following research data:

SEARCH RESULTS:
${JSON.stringify(searchResults, null, 2)}

ANALYSIS RESULTS:
${JSON.stringify(analysisResults, null, 2)}

IMPORTANT FORMATTING REQUIREMENTS:
1. Use markdown formatting with proper headers (# ## ###)
2. Include executive summary at the beginning
3. Organize content in logical sections
4. Add citations using numbered references [1], [2], etc.
5. Include a comprehensive "Sources and References" section at the end
6. Make the report professional, detailed, and well-structured
7. Use bullet points and numbered lists where appropriate
8. **ALWAYS use markdown tables for comparative data (| Column | Column | format)**
9. Include key findings, implications, and recommendations
10. Ensure all claims are backed by the research data provided

CITATION MAPPING:
${Array.from(sourceMap.entries()).map(([url, num]) => `[${num}] ${url}`).join('\n')}

The report should be publication-quality with proper academic formatting, clear conclusions, and actionable insights. Include confidence levels for major claims and highlight any limitations or areas needing further research.

Make sure to cite sources using the numbered references throughout the text, especially for statistical data, quotes, and specific findings.

**MANDATORY: For any comparative analysis sections, you MUST use proper markdown table format with pipes (|). For example:**
| Technology | Definition | Use Cases |
|------------|------------|-----------|
| AI | Broad field mimicking human intelligence | Robotics, NLP, decision-making |
| Machine Learning | Subset of AI | Fraud detection, recommendation systems |

Always format tabular data this way for better readability.`;
        
        const { textStream } = await streamText({
          model: deepseek('deepseek-chat'),
          temperature: 0.3,
          prompt: reportPrompt,
          maxTokens: 4000,
        });

        sendUpdate('step_complete', {
          step: 12,
          title: 'Final Report Generation',
          description: 'Report generated successfully',
          status: 'completed'
        });

        currentProgress = 95;
        sendUpdate('progress', { progress: currentProgress });

        // Stream the report content with real-time updates
        let reportContent = '';
        for await (const chunk of textStream) {
          reportContent += chunk;
          sendUpdate('report_chunk', { chunk });
        }

        // Add formatted sources section to the report
        const sourcesSection = `

## 📚 Sources and References

${allSources.map((source, index) => 
  `**[${index + 1}]** [${source.title}](${source.url})${source.relevance ? ` (Relevance: ${Math.round(source.relevance * 100)}%)` : ''}`
).join('\n\n')}

---

*Research completed on ${new Date().toLocaleDateString('tr-TR')} using Deep Search technology with multiple source verification and analysis.*`;

        const finalReport = reportContent + sourcesSection;

        sendUpdate('report_complete', { 
          fullReport: finalReport,
          citationCount: allSources.length,
          sources: allSources
        });

        currentProgress = 100;
        currentStatus = 'complete';
        sendUpdate('progress', { progress: currentProgress });
        sendUpdate('status_change', { status: currentStatus });

        // Final database update with complete report
        if (assistantMessageId) {
          await updateMessageInDatabase(assistantMessageId, {
            content: finalReport,
            research_status: currentStatus,
            research_progress: currentProgress,
            research_steps: {
              planning: true,
              searching: true,
              analyzing: true,
              complete: true
            },
            citation_sources: allSources
          });
        }

        console.log('[DEEP SEARCH] Research report completed with', allSources.length, 'citations');
        
      } catch (error) {
        console.error('[DEEP SEARCH] Error:', error);
        sendUpdate('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          step: 'Unknown'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Database update helper function
async function updateMessageInDatabase(messageId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', messageId);
      
    if (error) {
      console.error('[DEEP SEARCH] Database update error:', error);
    }
  } catch (err) {
    console.error('[DEEP SEARCH] Database update exception:', err);
  }
}

// Yardımcı fonksiyonlar
async function createResearchPlan(topic: string, currentDate: string) {
  const { object: researchPlan } = await generateObject({
    model: deepseek('deepseek-chat'),
    temperature: 0.3,
    schema: ResearchPlanSchema,
    prompt: `Create a focused research plan for the topic: "${topic}". 
                                        
Today's date and day of the week: ${currentDate}

Keep the plan concise but comprehensive, with:
- 5 targeted search queries (each can use web)
- 5 key analyses to perform (EXACTLY 5, no more)
- Prioritize the most important aspects to investigate

Available sources:
- "web": General web search

Do not use floating numbers, use whole numbers only in the priority field!!                                        

Consider different angles and potential controversies, but maintain focus on the core aspects.
The analyses should cover different aspects: trend analysis, impact assessment, comparative analysis, risk evaluation, and future outlook.`
  });
  
  return researchPlan;
}

async function executeWebSearch(query: string, depth: string, priority: number) {
  try {
    // Convert depth to tavily format
    const searchDepth = depth === 'advanced' ? 'advanced' : 'basic';
    
    const searchResults = await tvly.search(query, {
      searchDepth: searchDepth as 'basic' | 'advanced',
      includeAnswer: true,
      maxResults: Math.max(4, Math.min(8 - priority, 12)) // En az 4, en fazla 12 sonuç
    });

    return {
      type: 'web',
      query: { query, priority },
      results: searchResults.results.map((r: any) => ({
        source: 'web',
        title: r.title,
        url: r.url,
        content: r.content
      }))
    };
  } catch (error) {
    console.error(`[DEEP SEARCH] Search error for query "${query}":`, error);
    return {
      type: 'web',
      query: { query, priority },
      results: [],
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

async function analyzeResults(searchResults: any[], analysisType: string, analysisDescription: string) {
  const { object: analysisResult } = await generateObject({
    model: deepseek('deepseek-chat'),
    temperature: 0.5,
    schema: AnalysisResultSchema,
    prompt: `Perform a ${analysisType} analysis on the search results. ${analysisDescription}
            Consider all sources and their reliability.
            
            IMPORTANT: For each finding, include relevant source links from the search results.
            Extract key sources with relevance scores.
            
            Search results: ${JSON.stringify(searchResults, null, 2)}`
  });
  
  return analysisResult;
} 