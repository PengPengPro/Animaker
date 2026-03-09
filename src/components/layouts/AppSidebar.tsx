import { Home, FolderOpen, Shield, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: Home, label: '首页', path: '/' },
    { icon: FolderOpen, label: '作品', path: '/projects' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ icon: Shield, label: '管理员', path: '/admin' });
  }

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b px-4">
        {!collapsed && (
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold gradient-text tracking-tighter">漫画生成器</span>
          </div>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-primary">C</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  collapsed && 'justify-center px-2'
                )}
                asChild
              >
                <span>
                  <Icon className={cn('h-5 w-5', !collapsed && 'mr-2')} />
                  {!collapsed && <span>{item.label}</span>}
                </span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User Info */}
      <div className="p-4 space-y-2">
        {!collapsed && profile && (
          <div className="px-2 py-1 text-sm text-muted-foreground">
            {profile.username}
          </div>
        )}
        
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-2'
          )}
          onClick={signOut}
        >
          <LogOut className={cn('h-5 w-5', !collapsed && 'mr-2')} />
          {!collapsed && <span>退出登录</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>收起</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
