-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- 创建用户配置表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建作品表
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '未命名作品',
  story_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建分镜表
CREATE TABLE public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  sequence_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, sequence_order)
);

-- 创建漫画表
CREATE TABLE public.comics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  style text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scene_id)
);

-- 创建视频表
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id uuid NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  task_id text,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comic_id)
);

-- 创建索引
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX idx_comics_scene_id ON public.comics(scene_id);
CREATE INDEX idx_videos_comic_id ON public.videos(comic_id);

-- 创建触发器函数：自动同步用户
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  extracted_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从邮箱中提取用户名（去掉@miaoda.com）
  extracted_username := REPLACE(NEW.email, '@miaoda.com', '');
  
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    extracted_username,
    NEW.raw_user_meta_data->>'email',
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 创建辅助函数：检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Profiles策略
CREATE POLICY "管理员可以查看所有用户" ON public.profiles
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的资料" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "管理员可以更新所有用户" ON public.profiles
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以更新自己的资料（除角色外）" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- Projects策略
CREATE POLICY "用户可以查看自己的作品" ON public.projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建作品" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的作品" ON public.projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的作品" ON public.projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Scenes策略
CREATE POLICY "用户可以查看自己作品的分镜" ON public.scenes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "用户可以创建分镜" ON public.scenes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "用户可以更新自己作品的分镜" ON public.scenes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "用户可以删除自己作品的分镜" ON public.scenes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
  );

-- Comics策略
CREATE POLICY "用户可以查看自己作品的漫画" ON public.comics
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN projects ON projects.id = scenes.project_id 
      WHERE scenes.id = comics.scene_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以创建漫画" ON public.comics
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN projects ON projects.id = scenes.project_id 
      WHERE scenes.id = comics.scene_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以更新自己作品的漫画" ON public.comics
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN projects ON projects.id = scenes.project_id 
      WHERE scenes.id = comics.scene_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以删除自己作品的漫画" ON public.comics
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN projects ON projects.id = scenes.project_id 
      WHERE scenes.id = comics.scene_id AND projects.user_id = auth.uid()
    )
  );

-- Videos策略
CREATE POLICY "用户可以查看自己作品的视频" ON public.videos
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM comics
      JOIN scenes ON scenes.id = comics.scene_id
      JOIN projects ON projects.id = scenes.project_id 
      WHERE comics.id = videos.comic_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以创建视频" ON public.videos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM comics
      JOIN scenes ON scenes.id = comics.scene_id
      JOIN projects ON projects.id = scenes.project_id 
      WHERE comics.id = videos.comic_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以更新自己作品的视频" ON public.videos
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM comics
      JOIN scenes ON scenes.id = comics.scene_id
      JOIN projects ON projects.id = scenes.project_id 
      WHERE comics.id = videos.comic_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以删除自己作品的视频" ON public.videos
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM comics
      JOIN scenes ON scenes.id = comics.scene_id
      JOIN projects ON projects.id = scenes.project_id 
      WHERE comics.id = videos.comic_id AND projects.user_id = auth.uid()
    )
  );

-- 创建公共视图
CREATE VIEW public_profiles AS
  SELECT id, username, role FROM profiles;