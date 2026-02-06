import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  editingUser?: UserProfile | null;
  isSubmitting: boolean;
}

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  cpf: string;
  phone: string;
}

export function UserFormDialog({ open, onClose, onSubmit, editingUser, isSubmitting }: UserFormDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    password: '',
    role: editingUser?.role || 'sales',
    cpf: editingUser?.cpf || '',
    phone: editingUser?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setFormData({
        name: editingUser?.name || '',
        email: editingUser?.email || '',
        password: '',
        role: editingUser?.role || 'sales',
        cpf: editingUser?.cpf || '',
        phone: editingUser?.phone || '',
      });
      setErrors({});
    }
  }, [open, editingUser]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!editingUser && !formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
    if (!editingUser && !formData.password) newErrors.password = 'Senha é obrigatória';
    if (!editingUser && formData.password.length < 6) newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="form-label">Nome *</Label>
            <Input
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Nome completo"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div>
            <Label className="form-label">E-mail *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="email@exemplo.com"
              disabled={!!editingUser}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          {!editingUser && (
            <div>
              <Label className="form-label">Senha *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                placeholder="Mínimo 6 caracteres"
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
          )}

          <div>
            <Label className="form-label">CPF</Label>
            <Input
              value={formData.cpf}
              onChange={handleChange('cpf')}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <Label className="form-label">Telefone</Label>
            <Input
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label className="form-label">Perfil *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="sales">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-secondary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
