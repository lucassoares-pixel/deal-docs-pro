import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { UserFormDialog, UserFormData } from '@/components/users/UserFormDialog';
import { SupervisorAssignDialog } from '@/components/users/SupervisorAssignDialog';
import { Plus, Search, Users, Edit, Shield, UserCheck, Loader2, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UsersPage() {
  const { users, loading, createUser, updateUser, resetPassword, setSupervisorUsers, getSupervisedUsers } = useUsers();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supervisor assignment dialog
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<UserProfile | null>(null);

  // Password reset dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.cpf && u.cpf.includes(search))
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'sales': return 'Vendedor';
      default: return role;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'active';
      case 'supervisor': return 'pending';
      case 'sales': return 'info';
      default: return 'draft';
    }
  };

  const handleCreateOrEdit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.user_id, {
          name: data.name,
          role: data.role,
          cpf: data.cpf,
          phone: data.phone,
        });
      } else {
        await createUser({
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role,
          cpf: data.cpf,
          phone: data.phone,
        });
      }
      setFormOpen(false);
      setEditingUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleOpenSupervisorDialog = (user: UserProfile) => {
    setSelectedSupervisor(user);
    setSupervisorDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setResettingPassword(true);
    const success = await resetPassword(passwordUser.user_id, newPassword);
    setResettingPassword(false);
    if (success) {
      setPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword('');
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    await updateUser(user.user_id, { active: !user.active });
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </AppLayout>
    );
  }

  const columns = [
    {
      key: 'name',
      header: 'Usuário',
      render: (user: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-sm font-medium text-accent">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'cpf',
      header: 'CPF',
      render: (user: UserProfile) => (
        <span className="text-muted-foreground font-mono text-sm">{user.cpf || '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (user: UserProfile) => (
        <span className="text-muted-foreground">{user.phone || '-'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (user: UserProfile) => (
        <StatusBadge status={getRoleVariant(user.role) as any} label={getRoleLabel(user.role)} />
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (user: UserProfile) => (
        <StatusBadge
          status={user.active ? 'active' : 'cancelled'}
          label={user.active ? 'Ativo' : 'Inativo'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (user: UserProfile) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {user.role === 'supervisor' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleOpenSupervisorDialog(user); }}
              title="Gerenciar usuários supervisionados"
            >
              <UserCheck className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setPasswordUser(user);
              setNewPassword('');
              setPasswordDialogOpen(true);
            }}
            title="Redefinir senha"
          >
            <Key className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={user.active ? 'outline' : 'default'}
            onClick={(e) => { e.stopPropagation(); handleToggleActive(user); }}
            title={user.active ? 'Desativar' : 'Ativar'}
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários do sistema"
        actions={
          <Button className="btn-secondary" onClick={() => { setEditingUser(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        }
      />

      <div className="card-elevated">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum usuário encontrado"
            description="Cadastre um novo usuário para começar."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            keyExtractor={(u) => u.id}
          />
        )}
      </div>

      {/* Create/Edit User Dialog */}
      {formOpen && (
        <UserFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingUser(null); }}
          onSubmit={handleCreateOrEdit}
          editingUser={editingUser}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Supervisor Assignment Dialog */}
      {supervisorDialogOpen && selectedSupervisor && (
        <SupervisorAssignDialog
          open={supervisorDialogOpen}
          onClose={() => { setSupervisorDialogOpen(false); setSelectedSupervisor(null); }}
          supervisor={selectedSupervisor}
          allUsers={users}
          currentAssignments={getSupervisedUsers(selectedSupervisor.id)}
          onSave={setSupervisorUsers}
        />
      )}

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(v) => !v && setPasswordDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Redefinir senha de <strong>{passwordUser?.name}</strong>
            </p>
            <div>
              <Label className="form-label">Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="btn-secondary" onClick={handleResetPassword} disabled={resettingPassword}>
                {resettingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
