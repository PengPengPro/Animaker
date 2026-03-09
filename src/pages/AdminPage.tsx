import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProfiles, updateUserRole, getAllVideoRequests, updateVideoRequest, upsertVideo } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Profile, VideoRequest } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

export default function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [videoRequests, setVideoRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectionComments, setRejectionComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile?.role !== 'admin') {
      toast.error('无权访问管理员页面');
      navigate('/');
      return;
    }

    loadData();
  }, [profile, navigate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProfiles(), loadVideoRequests()]);
    setLoading(false);
  };

  const loadProfiles = async () => {
    const data = await getAllProfiles();
    setProfiles(data);
  };

  const loadVideoRequests = async () => {
    const data = await getAllVideoRequests();
    setVideoRequests(data);
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    const success = await updateUserRole(userId, newRole);
    if (success) {
      toast.success('角色更新成功');
      loadProfiles();
    } else {
      toast.error('角色更新失败');
    }
  };

  const handleApprove = async (request: any) => {
    if (approvingIds.has(request.id)) return;
    
    setApprovingIds(prev => new Set(prev).add(request.id));
    try {
      // 1. 调用 Edge Function 开始生成
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          imageUrl: request.comics.image_url,
          prompt: request.prompt,
        },
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        throw new Error(errorMsg || '生成任务创建失败');
      }

      const taskId = data?.taskId;
      if (!taskId) throw new Error('未能获取任务ID');

      // 2. 创建视频记录，状态设置为 processing，并关联 request_id
      const { data: video, error: videoError } = await (supabase
        .from('videos') as any)
        .upsert({
          comic_id: request.comic_id,
          video_url: '',
          task_id: taskId,
          status: 'processing',
          request_id: request.id
        }, {
          onConflict: 'comic_id'
        })
        .select()
        .single();

      if (videoError) throw new Error('视频记录保存失败: ' + videoError.message);

      // 3. 更新申请状态为 approved 且记录 video_id
      await (supabase
        .from('video_requests') as any)
        .update({
          status: 'approved',
          video_id: video.id,
          admin_id: profile?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);
      
      toast.success('审批通过，已开始生成视频');
      loadVideoRequests();
    } catch (error: any) {
      console.error('审批通过操作失败:', error);
      toast.error('操作失败: ' + (error.message || '未知错误'));
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const comment = rejectionComments[requestId] || '内容不符合要求';
    const success = await updateVideoRequest(requestId, 'rejected', comment);
    if (success) {
      toast.success('已拒绝申请');
      loadVideoRequests();
    } else {
      toast.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">管理后台</h1>
          <p className="text-muted-foreground mt-2">系统管理、用户角色分配及视频审核</p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="requests" className="px-6">视频审核申请</TabsTrigger>
          <TabsTrigger value="users" className="px-6">用户管理</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>视频生成审核</CardTitle>
              <CardDescription>待处理的视频动态化申请列表</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请用户</TableHead>
                    <TableHead>漫画预览</TableHead>
                    <TableHead className="max-w-[300px]">提示词</TableHead>
                    <TableHead>当前状态</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        暂无待审核的申请
                      </TableCell>
                    </TableRow>
                  ) : (
                    videoRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{request.profiles?.username}</span>
                            <span className="text-xs text-muted-foreground">{request.profiles?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative group cursor-pointer" onClick={() => window.open(request.comics?.image_url, '_blank')}>
                            <img 
                              src={request.comics?.image_url} 
                              alt="预览" 
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                              <ExternalLink className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-xs line-clamp-3 italic">"{request.prompt}"</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'pending' ? 'outline' : 
                            request.status === 'approved' ? 'default' : 
                            request.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {request.status === 'pending' ? '待审核' : 
                             request.status === 'approved' ? '已通过' : 
                             request.status === 'rejected' ? '已驳回' : request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                placeholder="拒绝备注..."
                                className="h-8 w-32 text-xs"
                                value={rejectionComments[request.id] || ''}
                                onChange={(e) => setRejectionComments({ ...rejectionComments, [request.id]: e.target.value })}
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                拒绝
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(request)}
                                disabled={approvingIds.has(request.id)}
                              >
                                {approvingIds.has(request.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                通过并生成
                              </Button>
                            </div>
                          ) : request.status === 'rejected' ? (
                             <span className="text-xs text-muted-foreground italic">已驳回: {request.admin_comment}</span>
                          ) : (
                             <span className="text-xs text-green-600 font-medium">已处理</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>用户角色管理</CardTitle>
              <CardDescription>管理系统所有用户的角色及权限分配</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>当前角色</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">角色分配</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right flex justify-end">
                        <Select
                          value={user.role}
                          onValueChange={(value: 'user' | 'admin') => handleRoleChange(user.id, value)}
                          disabled={user.id === profile?.id}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">普通用户</SelectItem>
                            <SelectItem value="admin">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
