import { Download, Maximize2, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Scene, Comic, Video, VideoRequest } from '@/types';
import { useState } from 'react';

interface UnifiedPreviewProps {
  scenes: Scene[];
  comics: Comic[];
  videos: Video[];
  videoRequests: VideoRequest[];
  onImageClick: (imageUrl: string) => void;
  onSceneSelect: (sceneId: string) => void;
  selectedSceneId: string | null;
  generatingComicIds: Set<string>;
  generatingVideoIds: Set<string>;
}

export function UnifiedPreview({
  scenes,
  comics,
  videos,
  videoRequests,
  onImageClick,
  onSceneSelect,
  selectedSceneId,
  generatingComicIds,
  generatingVideoIds,
}: UnifiedPreviewProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const getComicForScene = (sceneId: string) => {
    return comics.find((c) => c.scene_id === sceneId);
  };

  const getVideoForScene = (sceneId: string) => {
    const comic = getComicForScene(sceneId);
    if (!comic) return null;
    return videos.find((v) => v.comic_id === comic.id);
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comic-scene-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  const handleDownloadVideo = async (videoUrl: string, index: number) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-scene-${index + 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载视频失败:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="h-14 border-b flex items-center px-6 shrink-0">
        <h3 className="font-semibold text-sm">预览区</h3>
        <div className="ml-auto flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/20" /> 漫画预览</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary" /> 视频预览</span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-8">
          {scenes.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              暂无预览内容，请先生成分镜脚本
            </div>
          ) : (
            scenes.map((scene, index) => {
              const comic = getComicForScene(scene.id);
              const video = getVideoForScene(scene.id);
              const isGeneratingComic = generatingComicIds.has(scene.id);
              const isGeneratingVideo = generatingVideoIds.has(scene.id);
              const isSelected = selectedSceneId === scene.id;

              return (
                <div
                  key={scene.id}
                  className={cn(
                    'relative rounded-xl p-4 transition-all border group/row',
                    isSelected ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                  )}
                  onClick={() => onSceneSelect(scene.id)}
                >
                  {/* 分镜序号 */}
                  <div className="absolute top-[-10px] left-4 z-10">
                    <Badge variant={isSelected ? "default" : "secondary"} className="shadow-sm">
                      分镜 {index + 1}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2">
                    {/* 左侧：漫画预览 */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>漫画预览</span>
                        {comic && (
                           <Button 
                             size="icon" 
                             variant="ghost" 
                             className="h-5 w-5 opacity-0 group-hover/row:opacity-100 transition-opacity"
                             onClick={(e) => { e.stopPropagation(); handleDownloadImage(comic.image_url, index); }}
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                        )}
                      </div>
                      <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-muted border group/img">
                        {isGeneratingComic ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <Skeleton className="w-full h-full" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                               <span className="text-xs font-medium animate-pulse">生成中...</span>
                            </div>
                          </div>
                        ) : comic ? (
                          <>
                            <img
                              src={comic.image_url}
                              alt={`分镜 ${index + 1} 漫画`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); onImageClick(comic.image_url); onSceneSelect(scene.id); }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 px-2"
                                onClick={(e) => { e.stopPropagation(); onImageClick(comic.image_url); }}
                              >
                                <Maximize2 className="h-4 w-4 mr-1" />
                                <span className="text-xs">查看大图</span>
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px] p-4 text-center">
                            <div className="mb-2 opacity-50">未生成漫画</div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-[10px] px-2"
                              onClick={(e) => { e.stopPropagation(); onSceneSelect(scene.id); /* 这里可以触发父组件的生成逻辑，但PRD没要求在这里直接加生成按钮，通过点击选中对应分镜在左侧编辑区操作 */ }}
                            >
                              点击左侧生成
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 右侧：视频预览 */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>视频预览</span>
                        {video && video.status === 'succeed' && (
                           <Button 
                             size="icon" 
                             variant="ghost" 
                             className="h-5 w-5 opacity-0 group-hover/row:opacity-100 transition-opacity"
                             onClick={(e) => { e.stopPropagation(); handleDownloadVideo(video.video_url, index); }}
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                        )}
                      </div>
                      <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-muted border group/vid">
                        {isGeneratingVideo ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                             <Skeleton className="w-full h-full" />
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] text-white p-4">
                                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                <span className="text-xs font-semibold">生成中...</span>
                             </div>
                          </div>
                        ) : video && video.status === 'succeed' ? (
                          <>
                            <video
                              src={video.video_url}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayingVideoUrl(video.video_url);
                                onSceneSelect(scene.id);
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingVideoUrl(video.video_url);
                                }}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                <span className="text-xs">播放预览</span>
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px] p-4 text-center">
                            {(() => {
                              const request = comic ? videoRequests.find(r => r.comic_id === comic.id) : null;
                              if (request?.status === 'pending') {
                                return (
                                  <div className="flex flex-col items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-normal">待审批</Badge>
                                    <div className="opacity-70">等待管理员审核...</div>
                                  </div>
                                );
                              }
                              if (request?.status === 'rejected') {
                                return (
                                  <div className="flex flex-col items-center gap-2">
                                    <Badge variant="destructive" className="text-[10px] font-normal">审核拒绝</Badge>
                                    <div className="text-[8px] text-red-500 mt-1">
                                      原因：{request.admin_comment || '内容不合规'}
                                    </div>
                                  </div>
                                );
                              }
                              if (video?.status === 'processing' || request?.status === 'processing' || request?.status === 'approved') {
                                return (
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin mb-1 opacity-50" />
                                    <div className="font-medium">处理中...</div>
                                  </div>
                                );
                              }
                              return (
                                <>
                                  <div className="mb-2 opacity-50 text-sm italic">未生成视频</div>
                                  {!video && comic && (
                                    <div className="text-[8px] opacity-70">点击左侧分镜“申请动态化”按钮开始</div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* 视频播放对话框 */}
      <Dialog open={!!playingVideoUrl} onOpenChange={() => setPlayingVideoUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-none">
          {playingVideoUrl && (
            <video
              src={playingVideoUrl}
              controls
              autoPlay
              className="w-full h-auto max-h-[85vh] block mx-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
