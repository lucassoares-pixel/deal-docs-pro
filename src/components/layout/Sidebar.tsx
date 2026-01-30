import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Plus,
  History,
  Settings,
  FileSignature
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/context/AppContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Contratos', href: '/contracts', icon: FileText },
  { name: 'Novo Contrato', href: '/contracts/new', icon: Plus },
];

const adminNavigation = [
  { name: 'Histórico', href: '/audit', icon: History },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  return (
    <aside className="w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">ContractGen</h1>
            <p className="text-xs text-sidebar-foreground/60">SaaS Contracts</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="mb-4">
          <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-4 mb-2">
            Menu Principal
          </p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'sidebar-nav-item',
                  isActive && 'active'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-sidebar-border">
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-4 mb-2">
              Administração
            </p>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'sidebar-nav-item',
                    isActive && 'active'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-primary-foreground">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {currentUser.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {currentUser.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
