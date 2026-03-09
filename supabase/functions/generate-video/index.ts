import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateVideoRequest {
  imageUrl: string;
  prompt: string;
  taskId?: string; // 如果提供taskId，则查询状态
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt, taskId }: GenerateVideoRequest = await req.json();

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    // 如果提供了taskId，则查询视频生成状态 (MiniMax API)
    if (taskId) {
      // 1. 查询任务状态
      const queryResponse = await fetch(
        `https://app-a59svqs6piip-api-GYX1bq2l5vWa-gateway.appmiaoda.com/v1/query/video_generation?task_id=${taskId}`,
        {
          method: 'GET',
          headers: {
            'X-Gateway-Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        console.error('查询视频状态错误:', errorText);
        throw new Error(`查询视频状态失败: ${queryResponse.status}`);
      }

      const queryResult = await queryResponse.json();
      const status = queryResult.status; // Preparing, Queueing, Processing, Success, Fail

      // 映射到前端通用的状态
      let frontendStatus: string = 'processing';
      if (status === 'Success') frontendStatus = 'succeed';
      else if (status === 'Fail') frontendStatus = 'failed';
      else if (status === 'Preparing') frontendStatus = 'preparing';
      else if (status === 'Queueing') frontendStatus = 'queueing';

      if (status === 'Success' && queryResult.file_id) {
        // 2. 获取下载链接
        const fileResponse = await fetch(
          `https://app-a59svqs6piip-api-VaOw5V2Pbqoa-gateway.appmiaoda.com/v1/files/retrieve?file_id=${queryResult.file_id}`,
          {
            method: 'GET',
            headers: {
              'X-Gateway-Authorization': `Bearer ${apiKey}`,
            },
          }
        );

        if (fileResponse.ok) {
          const fileResult = await fileResponse.json();
          const videoUrl = fileResult.file?.download_url;

          if (videoUrl) {
            // 转存到 Supabase Storage (可选，这里先直接返回，因为 MiniMax 下载链接有效期 1 小时)
            // 为了持久化，最好转存。但为了快速演示，我们先尝试转存。
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            try {
              const downloadRes = await fetch(videoUrl);
              const videoBlob = await downloadRes.arrayBuffer();
              const fileName = `minimax/${crypto.randomUUID()}.mp4`;
              
              const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, videoBlob, { contentType: 'video/mp4' });

              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
                return new Response(
                  JSON.stringify({ taskId, status: 'succeed', videoUrl: urlData.publicUrl }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } catch (e) {
              console.error('转存失败，使用原始URL:', e);
            }

            return new Response(
              JSON.stringify({ taskId, status: 'succeed', videoUrl }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({ taskId, status: frontendStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建视频生成任务 (MiniMax API)
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: '提示词不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MiniMax 文生视频 API (虽然之前的流程是图生视频，但 MiniMax 主要是文生视频，用户提供的也是文生视频 API)
    // 如果需要图生视频，通常需要模型支持参考图。这里按用户给的 MiniMax 文生视频来实现。
    // 调用 MiniMax 文生视频 API
    const createResponse = await fetch(
      'https://app-a59svqs6piip-api-V9gDzg15D7BL-gateway.appmiaoda.com/v1/video_generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-Hailuo-02',
          prompt: prompt,
          duration: 6,
          resolution: '1080P'
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('创建视频任务错误:', errorText);
      throw new Error(`创建视频任务失败: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    const newTaskId = createResult.task_id;

    if (!newTaskId) {
      throw new Error('未能获取任务ID: ' + JSON.stringify(createResult));
    }

    return new Response(
      JSON.stringify({
        taskId: newTaskId,
        status: 'submitted',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('生成视频错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '生成视频失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
