import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import {
  getUserProjects,
  createProject,
  deleteProject,
  updateProject,
  getProjectScenes,
  updateScene,
  deleteScene,
  getSceneComic,
  upsertComic,
  getComicVideo,
  upsertVideo,
  updateVideoStatus,
  createVideoRequest,
  getProjectVideoRequests,
  getProjectComics,
  getProjectVideos,
} from '@/db/api';
import type { Project, Scene, Comic, Video, ComicStyle, VideoRequest } from '@/types';
import { ProjectList } from '@/components/project/ProjectList';
import { SceneEditor } from '@/components/project/SceneEditor';
import { UnifiedPreview } from '@/components/project/UnifiedPreview';
import { ImageViewer } from '@/components/project/ImageViewer';
import { toast } from 'sonner';

export default function ProjectPage() {
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoRequests, setVideoRequests] = useState<VideoRequest[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ComicStyle>('japanese');
  const [projectListCollapsed, setProjectListCollapsed] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [generatingComicIds, setGeneratingComicIds] = useState<Set<string>>(new Set());
  const [generatingVideoIds, setGeneratingVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // 加载作品列表
  const loadProjects = useCallback(async () => {
    const data = await getUserProjects();
    setProjects(data);
    
    // 如果有传入的projectId，选中它
    const stateProjectId = (location.state as any)?.projectId;
    if (stateProjectId && data.some(p => p.id === stateProjectId)) {
      setCurrentProjectId(stateProjectId);
    } else if (data.length > 0 && !currentProjectId) {
      setCurrentProjectId(data[0].id);
    }
    
    setLoading(false);
  }, [location.state, currentProjectId]);

  // 加载当前作品的数据
  const loadProjectData = useCallback(async (projectId: string) => {
    const [scenesData, comicsData, videosData, requestsData] = await Promise.all([
      getProjectScenes(projectId),
      getProjectComics(projectId),
      getProjectVideos(projectId),
      getProjectVideoRequests(projectId)
    ]);

    setScenes(scenesData);
    setComics(comicsData);
    setVideos(videosData);
    setVideoRequests(requestsData);

    // 如果有正在生成的视频，启动轮询
    videosData.forEach((video: Video) => {
      if (video.status === 'processing' && video.task_id) {
        const comic = (comicsData as Comic[]).find((c: Comic) => c.id === video.comic_id);
        if (comic) {
          pollVideoStatus(video.task_id, video.comic_id, comic.scene_id);
        }
      }
    });
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectData(currentProjectId);
    }
  }, [currentProjectId, loadProjectData]);

  // 创建新作品
  const handleCreateProject = async () => {
    const now = new Date();
    const timeStampTitle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const project = await createProject(timeStampTitle);
    if (project) {
      setProjects([project, ...projects]);
      setCurrentProjectId(project.id);
      toast.success('创建成功');
    } else {
      toast.error('创建失败');
    }
  };

  // 删除作品
  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId);
    if (success) {
      setProjects(projects.filter(p => p.id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(projects[0]?.id || null);
      }
      toast.success('删除成功');
    } else {
      toast.error('删除失败');
    }
  };

  // 更新作品标题
  const handleUpdateProjectTitle = async (projectId: string, title: string) => {
    const success = await updateProject(projectId, { title });
    if (success) {
      setProjects(projects.map(p => p.id === projectId ? { ...p, title } : p));
    }
  };

  // 更新分镜
  const handleUpdateScene = async (sceneId: string, content: string) => {
    const success = await updateScene(sceneId, content);
    if (success) {
      setScenes(scenes.map(s => s.id === sceneId ? { ...s, content } : s));
      toast.success('更新成功');
    } else {
      toast.error('更新失败');
    }
  };

  // 删除分镜
  const handleDeleteScene = async (sceneId: string) => {
    const success = await deleteScene(sceneId);
    if (success) {
      setScenes(scenes.filter(s => s.id !== sceneId));
      toast.success('删除成功');
    } else {
      toast.error('删除失败');
    }
  };

  // 生成漫画
  const handleGenerateComic = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setGeneratingComicIds(prev => new Set(prev).add(sceneId));

    try {
      const { data, error } = await supabase.functions.invoke('generate-comic', {
        body: {
          sceneContent: scene.content,
          style: selectedStyle,
        },
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        console.error('生成漫画错误:', errorMsg || error?.message);
        throw new Error(errorMsg || '生成漫画失败');
      }

      const imageUrl = data?.imageUrl;
      if (!imageUrl) {
        throw new Error('未能获取图片URL');
      }

      // 保存到数据库
      const comic = await upsertComic(sceneId, imageUrl, selectedStyle);
      if (comic) {
        setComics(prev => {
          const filtered = prev.filter(c => c.scene_id !== sceneId);
          return [...filtered, comic];
        });
        toast.success('漫画生成成功');
      }
    } catch (error: any) {
      console.error('生成漫画失败:', error);
      toast.error(error.message || '生成漫画失败');
    } finally {
      setGeneratingComicIds(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  // 生成视频（改为申请审批逻辑）
  const handleGenerateVideo = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    const comic = comics.find(c => c.scene_id === sceneId);
    
    if (!scene || !comic) {
      toast.error('请先生成漫画');
      return;
    }

    const existingRequest = videoRequests.find(r => r.comic_id === comic.id);
    if (existingRequest && (existingRequest.status === 'pending' || existingRequest.status === 'approved' || existingRequest.status === 'processing')) {
      toast.info('该分镜已有待审核或处理中的申请');
      return;
    }

    try {
      const request = await createVideoRequest(comic.id, scene.content);
      if (request) {
        setVideoRequests(prev => {
          const filtered = prev.filter(r => r.comic_id !== comic.id);
          return [...filtered, request];
        });
        toast.success('视频生成申请已提交，请等待管理员审核');
      }
    } catch (error: any) {
      console.error('申请视频失败:', error);
      toast.error('申请视频失败');
    }
  };

  // 轮询视频状态
  const pollVideoStatus = async (taskId: string, comicId: string, sceneId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 最多5分钟

    const poll = async () => {
      if (attempts >= maxAttempts) {
        toast.error('视频生成超时');
        setGeneratingVideoIds(prev => {
          const next = new Set(prev);
          next.delete(sceneId);
          return next;
        });
        return;
      }

      attempts++;

      try {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { taskId, imageUrl: '', prompt: '' },
        });

        if (error) {
          throw new Error('查询视频状态失败');
        }

        const status = data?.status;
        const videoUrl = data?.videoUrl;

        if (status === 'succeed' && videoUrl) {
          // 更新数据库
          const video = await upsertVideo(comicId, videoUrl, taskId, 'succeed');
          if (video) {
            setVideos(prev => {
              const filtered = prev.filter(v => v.comic_id !== comicId);
              return [...filtered, video];
            });
          }

          toast.success('视频生成成功');
          setGeneratingVideoIds(prev => {
            const next = new Set(prev);
            next.delete(sceneId);
            return next;
          });
        } else if (status === 'failed') {
          toast.error('视频生成失败');
          setGeneratingVideoIds(prev => {
            const next = new Set(prev);
            next.delete(sceneId);
            return next;
          });
        } else {
          // 继续轮询
          setTimeout(poll, 5000);
        }
      } catch (error) {
        console.error('轮询错误:', error);
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  // 监听视频申请和视频生成状态
  useEffect(() => {
    if (!currentProjectId) return;

    const subscription = supabase
      .channel('video_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'video_requests' 
      }, (payload) => {
        const newRequest = payload.new as VideoRequest;
        const oldRequest = payload.old as VideoRequest;
        
        // 如果是自己的申请或者管理员
        if (newRequest.id || oldRequest?.id) {
          setVideoRequests(prev => {
            const updated = payload.new as VideoRequest;
            if (payload.eventType === 'INSERT') {
              return [...prev, updated];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map(r => r.id === updated.id ? updated : r);
            } else if (payload.eventType === 'DELETE') {
              return prev.filter(r => r.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'videos' 
      }, (payload) => {
        const newVideo = payload.new as Video;
        if (newVideo.id) {
          setVideos(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, newVideo];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map(v => v.id === newVideo.id ? newVideo : v);
            }
            return prev;
          });

          // 如果新状态是处理中且有taskId，则前端负责开启轮询（如果当前不在轮询）
          if (newVideo.status === 'processing' && newVideo.task_id) {
            const comic = comics.find(c => c.id === newVideo.comic_id);
            if (comic && !generatingVideoIds.has(comic.scene_id)) {
               setGeneratingVideoIds(prev => new Set(prev).add(comic.scene_id));
               pollVideoStatus(newVideo.task_id, newVideo.comic_id, comic.scene_id);
            }
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentProjectId, comics, generatingVideoIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">暂无作品</p>
          <p className="text-sm text-muted-foreground">请先在首页生成分镜脚本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 作品列表 */}
      <ProjectList
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={setCurrentProjectId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onUpdateProjectTitle={handleUpdateProjectTitle}
        collapsed={projectListCollapsed}
        onToggleCollapse={() => setProjectListCollapsed(!projectListCollapsed)}
      />

      {/* 中央编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <div className="flex-1 flex overflow-hidden h-full">
          {/* 分镜编辑器 */}
          <div className="w-96 border-r flex flex-col h-full overflow-hidden shrink-0">
            <SceneEditor
              scenes={scenes}
              comics={comics}
              videoRequests={videoRequests}
              selectedSceneId={selectedSceneId}
              onSelectScene={setSelectedSceneId}
              onUpdateScene={handleUpdateScene}
              onDeleteScene={handleDeleteScene}
              onGenerateComic={handleGenerateComic}
              onGenerateVideo={handleGenerateVideo}
              generatingComicIds={generatingComicIds}
              generatingVideoIds={generatingVideoIds}
              selectedStyle={selectedStyle}
              onStyleChange={setSelectedStyle}
            />
          </div>

          {/* 预览区 */}
          <div className="flex-1 flex overflow-hidden h-full">
            <UnifiedPreview
              scenes={scenes}
              comics={comics}
              videos={videos}
              videoRequests={videoRequests}
              onImageClick={setViewingImageUrl}
              onSceneSelect={setSelectedSceneId}
              selectedSceneId={selectedSceneId}
              generatingComicIds={generatingComicIds}
              generatingVideoIds={generatingVideoIds}
            />
          </div>
        </div>
      </div>

      {/* 图片查看器 */}
      <ImageViewer
        imageUrl={viewingImageUrl}
        onClose={() => setViewingImageUrl(null)}
      />
    </div>
  );
}
