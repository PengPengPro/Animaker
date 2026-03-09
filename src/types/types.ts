// 用户角色类型
export type UserRole = 'user' | 'admin';

// 用户配置类型
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// 作品类型
export interface Project {
  id: string;
  user_id: string;
  title: string;
  story_input: string | null;
  created_at: string;
  updated_at: string;
}

// 分镜类型
export interface Scene {
  id: string;
  project_id: string;
  content: string;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

// 漫画类型
export interface Comic {
  id: string;
  scene_id: string;
  image_url: string;
  style: ComicStyle;
  created_at: string;
}

// 视频类型
export interface Video {
  id: string;
  comic_id: string;
  video_url: string;
  task_id: string | null;
  status: VideoStatus;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}

// 视频申请状态枚举
export type VideoRequestStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';

// 视频申请类型
export interface VideoRequest {
  id: string;
  comic_id: string;
  user_id: string;
  status: VideoRequestStatus;
  prompt: string;
  admin_id: string | null;
  admin_comment: string | null;
  video_id: string | null;
  created_at: string;
  updated_at: string;
}

// 漫画风格枚举
export type ComicStyle = 
  | 'american'    // 美漫风格
  | 'japanese'    // 日漫风格
  | 'korean'      // 韩漫风格
  | 'chinese'     // 中国古风
  | 'sketch';     // 手绘线条

// 视频状态枚举
export type VideoStatus = 
  | 'submitted'   // 已提交
  | 'processing'  // 处理中
  | 'succeed'     // 成功
  | 'failed'      // 失败
  | 'pending_approval' // 待审批
  | 'rejected'    // 已拒绝
  | 'preparing'   // 准备中
  | 'queueing';   // 队列中

// 漫画风格选项
export const COMIC_STYLES: { value: ComicStyle; label: string }[] = [
  { value: 'american', label: '美漫风格' },
  { value: 'japanese', label: '日漫风格' },
  { value: 'korean', label: '韩漫风格' },
  { value: 'chinese', label: '中国古风' },
  { value: 'sketch', label: '手绘线条' },
];

// 获取风格描述
export function getStyleDescription(style: ComicStyle): string {
  const descriptions: Record<ComicStyle, string> = {
    american: '美式漫画风格，色彩鲜艳，线条粗犷',
    japanese: '日式动漫风格，细腻精致，表情丰富',
    korean: '韩式漫画风格，唯美浪漫，色调柔和',
    chinese: '中国古风，水墨意境，古典雅致',
    sketch: '手绘线条风格，简约清新，富有艺术感',
  };
  return descriptions[style];
}

// Edge Function请求/响应类型
export interface GenerateScriptRequest {
  storyInput: string;
}

export interface GenerateScriptResponse {
  scenes: string[];
}

export interface GenerateComicRequest {
  sceneContent: string;
  style: ComicStyle;
}

export interface GenerateComicResponse {
  imageUrl: string;
}

export interface GenerateVideoRequest {
  imageUrl: string;
  prompt: string;
}

export interface GenerateVideoResponse {
  taskId: string;
  status: VideoStatus;
}

export interface QueryVideoRequest {
  taskId: string;
}

export interface QueryVideoResponse {
  taskId: string;
  status: VideoStatus;
  videoUrl?: string;
}
