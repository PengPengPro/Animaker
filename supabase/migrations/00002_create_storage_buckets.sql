-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('comics', 'comics', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/jpg']),
  ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'video/webm']);

-- 设置存储桶策略
CREATE POLICY "用户可以上传漫画图片" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comics');

CREATE POLICY "所有人可以查看漫画图片" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'comics');

CREATE POLICY "用户可以删除自己的漫画图片" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'comics' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "用户可以上传视频" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

CREATE POLICY "所有人可以查看视频" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'videos');

CREATE POLICY "用户可以删除自己的视频" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);