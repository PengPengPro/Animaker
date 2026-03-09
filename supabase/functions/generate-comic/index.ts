import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateComicRequest {
  sceneContent: string;
  style: string;
}

// 风格映射
const styleMap: Record<string, string> = {
  american: '美式漫画风格，色彩鲜艳，线条粗犷，超级英雄风格',
  japanese: '日式动漫风格，细腻精致，表情丰富，动漫画风',
  korean: '韩式漫画风格，唯美浪漫，色调柔和，网络漫画风格',
  chinese: '中国古风，水墨意境，古典雅致，传统国画风格',
  sketch: '手绘线条风格，简约清新，富有艺术感，素描风格',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneContent, style }: GenerateComicRequest = await req.json();

    if (!sceneContent || !style) {
      return new Response(
        JSON.stringify({ error: '分镜内容和风格不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    const styleDesc = styleMap[style] || styleMap.japanese;
    const prompt = `生成一张${styleDesc}的彩色漫画，3:4竖版，内容为：${sceneContent}`;

    // 调用Gemini图片生成API
    const response = await fetch(
      'https://app-a59svqs6piip-api-o9wN0AExZQ8a-gateway.appmiaoda.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          responseModalities: 'image',
          temperature: 0.8,
          n: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API错误:', errorText);
      throw new Error(`Gemini API调用失败: ${response.status}`);
    }

    const result = await response.json();
    
    // 提取生成的图片
    const imagePart = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('未能生成图片');
    }

    const base64Data = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType;

    // 将Base64图片上传到Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取当前用户ID
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('用户未认证');
    }

    // 转换Base64为Blob
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const extension = mimeType.split('/')[1];
    const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`;

    // 上传到Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comics')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('上传图片失败:', uploadError);
      throw new Error('上传图片失败');
    }

    // 获取公共URL
    const { data: urlData } = supabase.storage
      .from('comics')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ imageUrl: urlData.publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('生成漫画错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '生成漫画失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
