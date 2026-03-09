import { supabase } from './supabase';
import type { 
  Profile, 
  Project, 
  Scene, 
  Comic, 
  Video,
  ComicStyle,
  VideoStatus,
  VideoRequest,
  VideoRequestStatus 
} from '@/types';

// ==================== 用户相关 ====================

/**
 * 获取当前用户配置
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle();

  if (error) {
    console.error('获取用户配置失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取所有用户（管理员）
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 更新用户角色（管理员）
 */
export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('更新用户角色失败:', error);
    return false;
  }

  return true;
}

// ==================== 作品相关 ====================

/**
 * 获取当前用户的所有作品
 */
export async function getUserProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('获取作品列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 创建新作品
 */
export async function createProject(title: string = '未命名作品', storyInput?: string): Promise<Project | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      story_input: storyInput || null,
    })
    .select()
    .single();

  if (error) {
    console.error('创建作品失败:', error);
    return null;
  }

  return data;
}

/**
 * 更新作品
 */
export async function updateProject(
  projectId: string, 
  updates: Partial<Pick<Project, 'title' | 'story_input'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId);

  if (error) {
    console.error('更新作品失败:', error);
    return false;
  }

  return true;
}

/**
 * 删除作品
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('删除作品失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取作品详情
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    console.error('获取作品详情失败:', error);
    return null;
  }

  return data;
}

// ==================== 分镜相关 ====================

/**
 * 获取作品的所有分镜
 */
export async function getProjectScenes(projectId: string): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });

  if (error) {
    console.error('获取分镜列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 批量创建分镜
 */
export async function createScenes(projectId: string, contents: string[]): Promise<Scene[]> {
  const scenesData = contents.map((content, index) => ({
    project_id: projectId,
    content,
    sequence_order: index + 1,
  }));

  const { data, error } = await supabase
    .from('scenes')
    .insert(scenesData)
    .select();

  if (error) {
    console.error('创建分镜失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 更新分镜内容
 */
export async function updateScene(sceneId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('scenes')
    .update({ content })
    .eq('id', sceneId);

  if (error) {
    console.error('更新分镜失败:', error);
    return false;
  }

  return true;
}

/**
 * 删除分镜
 */
export async function deleteScene(sceneId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('id', sceneId);

  if (error) {
    console.error('删除分镜失败:', error);
    return false;
  }

  return true;
}

/**
 * 删除作品的所有分镜
 */
export async function deleteProjectScenes(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('删除作品分镜失败:', error);
    return false;
  }

  return true;
}

// ==================== 漫画相关 ====================

/**
 * 获取分镜的漫画
 */
export async function getSceneComic(sceneId: string): Promise<Comic | null> {
  const { data, error } = await supabase
    .from('comics')
    .select('*')
    .eq('scene_id', sceneId)
    .maybeSingle();

  if (error) {
    console.error('获取漫画失败:', error);
    return null;
  }

  return data;
}

/**
 * 创建或更新漫画
 */
export async function upsertComic(
  sceneId: string, 
  imageUrl: string, 
  style: ComicStyle
): Promise<Comic | null> {
  const { data, error } = await supabase
    .from('comics')
    .upsert({
      scene_id: sceneId,
      image_url: imageUrl,
      style,
    }, {
      onConflict: 'scene_id',
    })
    .select()
    .single();

  if (error) {
    console.error('创建/更新漫画失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取作品的所有漫画
 */
export async function getProjectComics(projectId: string): Promise<Comic[]> {
  const { data, error } = await supabase
    .from('comics')
    .select('*, scenes!inner(project_id, sequence_order)')
    .eq('scenes.project_id', projectId)
    .order('sequence_order', { foreignTable: 'scenes', ascending: true });

  if (error) {
    console.error('获取作品漫画失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 视频相关 ====================

/**
 * 获取漫画的视频
 */
export async function getComicVideo(comicId: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('comic_id', comicId)
    .maybeSingle();

  if (error) {
    console.error('获取视频失败:', error);
    return null;
  }

  return data;
}

/**
 * 创建或更新视频
 */
export async function upsertVideo(
  comicId: string,
  videoUrl: string,
  taskId: string,
  status: VideoStatus
): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .upsert({
      comic_id: comicId,
      video_url: videoUrl,
      task_id: taskId,
      status,
    }, {
      onConflict: 'comic_id',
    })
    .select()
    .single();

  if (error) {
    console.error('创建/更新视频失败:', error);
    return null;
  }

  return data;
}

/**
 * 更新视频状态
 */
export async function updateVideoStatus(
  videoId: string,
  status: VideoStatus,
  videoUrl?: string
): Promise<boolean> {
  const updates: Partial<Video> = { status };
  if (videoUrl) {
    updates.video_url = videoUrl;
  }

  const { error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId);

  if (error) {
    console.error('更新视频状态失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取作品的所有视频
 */
export async function getProjectVideos(projectId: string): Promise<Video[]> {
  // 由于外键关系多层，先查该项目的所有漫画ID
  const comics = await getProjectComics(projectId);
  const comicIds = comics.map(c => c.id);
  
  if (comicIds.length === 0) return [];

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .in('comic_id', comicIds);

  if (error) {
    console.error('获取作品视频失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 视频申请相关 ====================

/**
 * 创建视频生成申请
 */
export async function createVideoRequest(
  comicId: string,
  prompt: string
): Promise<VideoRequest | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('video_requests')
    .insert({
      comic_id: comicId,
      user_id: user.id,
      prompt,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('创建视频申请失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取所有视频生成申请（管理员）
 */
export async function getAllVideoRequests(): Promise<VideoRequest[]> {
  const { data, error } = await supabase
    .from('video_requests')
    .select('*, profiles:user_id(username, email), comics:comic_id(image_url, scene_id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取申请列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 更新视频申请状态（管理员审批）
 */
export async function updateVideoRequest(
  requestId: string,
  status: VideoRequestStatus,
  adminComment?: string
): Promise<boolean> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return false;

  const updates: any = {
    status,
    admin_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (adminComment !== undefined) {
    updates.admin_comment = adminComment;
  }

  const { error } = await supabase
    .from('video_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) {
    console.error('更新申请状态失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取项目的视频申请记录
 */
export async function getProjectVideoRequests(projectId: string): Promise<VideoRequest[]> {
  // 先查项目的所有漫画ID
  const comics = await getProjectComics(projectId);
  const comicIds = comics.map(c => c.id);
  
  if (comicIds.length === 0) return [];

  const { data, error } = await supabase
    .from('video_requests')
    .select('*')
    .in('comic_id', comicIds);

  if (error) {
    console.error('获取作品申请列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取指定漫画的视频申请记录
 */
export async function getComicVideoRequest(comicId: string): Promise<VideoRequest | null> {
  const { data, error } = await supabase
    .from('video_requests')
    .select('*')
    .eq('comic_id', comicId)
    .maybeSingle();

  if (error) {
    console.error('获取漫画申请失败:', error);
    return null;
  }

  return data;
}
