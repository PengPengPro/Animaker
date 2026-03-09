import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateScriptRequest {
  storyInput: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyInput }: GenerateScriptRequest = await req.json();

    if (!storyInput || storyInput.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: '故事框架不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 调用文心大模型API
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    const prompt = `这是我构思的一个故事框架，你是一个动漫电影导演，根据故事生成分镜头脚本，每个镜头尽可能用精炼的语言描述，按照每个镜头分一个段落来输出。

故事框架：
${storyInput}

请生成4-8个分镜头脚本，每个分镜用一段话描述，段落之间用空行分隔。`;

    const response = await fetch(
      'https://app-a59svqs6piip-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          enable_thinking: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('文心API错误:', errorText);
      throw new Error(`文心API调用失败: ${response.status}`);
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.replace('data:', '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
            }
          } catch (e) {
            console.error('解析JSON失败:', e);
          }
        }
      }
    }

    // 解析分镜脚本
    const scenes = fullContent
      .split('\n\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 500) // 过滤掉过长或过短的段落
      .slice(0, 10); // 最多10个分镜

    if (scenes.length === 0) {
      throw new Error('未能生成有效的分镜脚本');
    }

    return new Response(
      JSON.stringify({ scenes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('生成脚本错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '生成脚本失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
