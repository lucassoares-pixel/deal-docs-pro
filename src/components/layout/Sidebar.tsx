import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Plus,
  History,
  LogOut,
  Settings2,
  PieChart,
  Target,
  Award,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import logoCompeti from '@/assets/logo-competi.jpg';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Contratos', href: '/contracts', icon: FileText },
  { name: 'Novo Contrato', href: '/contracts/new', icon: Plus },
  { name: 'Nova Venda', href: '/sales/new', icon: ShoppingCart },
];

const sellerNavigation = [
  { name: 'Relatórios', href: '/reports', icon: PieChart },
];

const adminNavigation = [
  { name: 'Relatórios', href: '/reports', icon: PieChart },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Premiação', href: '/settings/commission', icon: Award },
  { name: 'Usuários', href: '/users', icon: Users },
  { name: 'Campos de Seleção', href: '/settings/fields', icon: Settings2 },
  { name: 'Histórico', href: '/audit', icon: History },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <aside className="w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo Competi */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <img 
            src={logoCompeti} 
            alt="Competi" 
            className="h-10 w-auto object-contain"
          />
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
              {profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.name || 'Usuário'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {profile?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={signOut}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
