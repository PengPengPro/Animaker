-- 创建视频申请状态枚举
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_request_status') THEN
        CREATE TYPE public.video_request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed');
    END IF;
END $$;

-- 创建视频申请表
CREATE TABLE IF NOT EXISTS public.video_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    comic_id uuid REFERENCES public.comics(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.video_request_status DEFAULT 'pending',
    prompt text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    admin_comment text,
    video_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 修改 videos 表增加 request_id
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.video_requests(id) ON DELETE SET NULL;

-- 允许用户创建自己的申请
CREATE POLICY "Users can create their own video requests" ON public.video_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 允许用户查看自己的申请
CREATE POLICY "Users can view their own video requests" ON public.video_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 管理员具有全部权限
CREATE POLICY "Admins have full access to video requests" ON public.video_requests
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 给 videos 增加关联
ALTER TABLE public.video_requests ADD CONSTRAINT fk_video FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;

-- 启用实时更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_requests;
