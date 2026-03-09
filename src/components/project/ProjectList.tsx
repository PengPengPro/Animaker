import { useState } from 'react';
import { Plus, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectListProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProjectTitle: (projectId: string, title: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ProjectList({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onUpdateProjectTitle,
  collapsed,
  onToggleCollapse,
}: ProjectListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (project: Project) => {
    setEditingId(project.id);
    setEditingTitle(project.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onUpdateProjectTitle(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDelete = (projectId: string) => {
    setDeleteConfirmId(projectId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteProject(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="展开作品列表"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold">我的作品</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="收起"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
      </div>

      {/* Create Button */}
      <div className="p-4 border-b">
        <Button onClick={onCreateProject} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          新建作品
        </Button>
      </div>

      {/* Project List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                'group relative rounded-md p-3 cursor-pointer transition-colors',
                currentProjectId === project.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
              onClick={() => onSelectProject(project.id)}
            >
              {editingId === project.id ? (
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="h-6 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 text-sm font-medium truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(project);
                    }}
                  >
                    {project.title}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="text-xs opacity-70 mt-1">
                {new Date(project.updated_at).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个作品吗？此操作无法撤销，所有相关的分镜、漫画和视频都将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
