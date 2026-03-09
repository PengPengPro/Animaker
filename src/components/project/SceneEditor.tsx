import { useState } from 'react';
import { Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Scene, Comic, ComicStyle, VideoRequest } from '@/types';
import { StyleSelector } from './StyleSelector';

interface SceneEditorProps {
  scenes: Scene[];
  comics: Comic[];
  videoRequests: VideoRequest[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onUpdateScene: (sceneId: string, content: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerateComic: (sceneId: string) => void;
  onGenerateVideo: (sceneId: string) => void;
  generatingComicIds: Set<string>;
  generatingVideoIds: Set<string>;
  selectedStyle: ComicStyle;
  onStyleChange: (style: ComicStyle) => void;
}

export function SceneEditor({
  scenes,
  comics,
  videoRequests,
  selectedSceneId,
  onSelectScene,
  onUpdateScene,
  onDeleteScene,
  onGenerateComic,
  onGenerateVideo,
  generatingComicIds,
  generatingVideoIds,
  selectedStyle,
  onStyleChange,
}: SceneEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleStartEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setEditingContent(scene.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editingContent.trim()) {
      onUpdateScene(editingId, editingContent.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const getComicForScene = (sceneId: string) => {
    return comics.find((c) => c.scene_id === sceneId);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
        <h2 className="font-semibold text-sm">分镜脚本</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">漫画风格</span>
          <StyleSelector 
            selectedStyle={selectedStyle} 
            onStyleChange={onStyleChange} 
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-4 pb-20">
          {scenes.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              暂无分镜脚本，请先在首页生成
            </div>
          ) : (
            scenes.map((scene, index) => {
              const comic = getComicForScene(scene.id);
              const isGeneratingComic = generatingComicIds.has(scene.id);
              const isGeneratingVideo = generatingVideoIds.has(scene.id);
              const isSelected = selectedSceneId === scene.id;

              return (
                <Card
                  key={scene.id}
                  className={cn(
                    'transition-all cursor-pointer',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  onClick={() => onSelectScene(scene.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-xs text-muted-foreground">
                        分镜 {index + 1}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(scene);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScene(scene.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {editingId === scene.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-20 text-xs"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            保存
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs mb-3 leading-relaxed">{scene.content}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateComic(scene.id);
                            }}
                            disabled={isGeneratingComic}
                          >
                            {isGeneratingComic ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            {isGeneratingComic ? '生成中...' : comic ? '重新生成' : '生成漫画'}
                          </Button>
                          {comic && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGenerateVideo(scene.id);
                              }}
                              disabled={
                                isGeneratingVideo || 
                                videoRequests.find(r => r.comic_id === comic.id)?.status === 'pending'
                              }
                            >
                              {isGeneratingVideo ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 mr-1" />
                              )}
                              {isGeneratingVideo ? '生成中...' : 
                               videoRequests.find(r => r.comic_id === comic.id)?.status === 'pending' ? '审批中...' :
                               videoRequests.find(r => r.comic_id === comic.id)?.status === 'rejected' ? '重试申请' :
                               videoRequests.find(r => r.comic_id === comic.id)?.status === 'approved' ? '准备中...' :
                               '申请动态化'}
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
