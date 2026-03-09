import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { createProject, createScenes } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

export default function HomePage() {
  const [storyInput, setStoryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (!storyInput.trim()) {
      toast.error('请输入故事框架');
      return;
    }

    setLoading(true);

    try {
      // 调用Edge Function生成脚本
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { storyInput: storyInput.trim() },
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        console.error('生成脚本错误:', errorMsg || error?.message);
        throw new Error(errorMsg || '生成脚本失败');
      }

      const scenes = data?.scenes;
      if (!scenes || scenes.length === 0) {
        throw new Error('未能生成有效的分镜脚本');
      }

      // 生成时间戳标题：YYYY-MM-DD HH:mm:ss
      const now = new Date();
      const timeStampTitle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // 创建新作品
      const project = await createProject(timeStampTitle, storyInput.trim());
      if (!project) {
        throw new Error('创建作品失败');
      }

      // 创建分镜
      await createScenes(project.id, scenes);

      toast.success(`成功生成 ${scenes.length} 个分镜`);
      navigate('/projects', { state: { projectId: project.id } });
    } catch (error: any) {
      console.error('生成失败:', error);
      toast.error(error.message || '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold gradient-text">
            漫画生成器
          </CardTitle>
          <CardDescription className="text-base">
            输入你的故事框架，AI将自动生成专业的分镜头脚本
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="例如：一个年轻的冒险家在神秘森林中寻找传说中的宝藏，途中遇到了各种奇幻生物和挑战..."
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              className="min-h-40 resize-none"
              disabled={loading}
            />
            <div className="text-sm text-muted-foreground text-right">
              {storyInput.length} 字
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !storyInput.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                生成分镜脚本
              </>
            )}
          </Button>

          <div className="pt-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold">💡 使用提示：</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>描述故事的主要情节和角色</li>
              <li>包含关键场景和转折点</li>
              <li>AI将自动生成4-8个分镜头脚本</li>
              <li>生成后可以编辑和完善每个分镜</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
