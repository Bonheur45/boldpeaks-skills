import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Award,
  Users,
  Settings,
  Menu,
  GraduationCap,
  UserCog,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import boldpeaksLogo from '@/assets/boldpeaks-logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin: hasAdminRole, isLoading: rolesLoading } = useIsAdmin();

  const isInAdminArea = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const studentNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/programs', label: 'Programs', icon: BookOpen },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/certificates', label: 'Certificates', icon: Award },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/pathways', label: 'Pathways', icon: GraduationCap },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/assessments', label: 'Assessments', icon: BookOpen },
    { href: '/admin/invites', label: 'Admin Invites', icon: UserCog },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isInAdminArea ? adminNavItems : studentNavItems;

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const MobileNav = () => (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header/Navigation - Modern style */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <Link to={isInAdminArea ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <img src={boldpeaksLogo} alt="BoldPeaks Hub" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side - User menu */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span
              className={cn(
                'hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                hasAdminRole
                  ? 'bg-accent/20 text-accent-foreground border border-accent/30'
                  : 'bg-primary/10 text-primary border border-primary/20'
              )}
            >
              {rolesLoading ? '...' : hasAdminRole ? 'Admin' : 'Student'}
            </span>

            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden lg:flex items-center gap-2 p-1.5 rounded-full hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(user?.user_metadata?.full_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.user_metadata?.full_name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasAdminRole && !rolesLoading && (
                  <DropdownMenuItem asChild>
                    <Link to={isInAdminArea ? '/dashboard' : '/admin'}>
                      <Shield className="mr-2 h-4 w-4" />
                      {isInAdminArea ? 'Student Portal' : 'Admin Portal'}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="p-6 border-b">
                  <img src={boldpeaksLogo} alt="BoldPeaks Hub" className="h-12 w-auto" />
                </div>
                <MobileNav />
                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user?.user_metadata?.full_name, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive" 
                    onClick={() => { handleSignOut(); setSidebarOpen(false); }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
