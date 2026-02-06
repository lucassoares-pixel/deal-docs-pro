import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';

interface SupervisorAssignDialogProps {
  open: boolean;
  onClose: () => void;
  supervisor: UserProfile;
  allUsers: UserProfile[];
  currentAssignments: string[];
  onSave: (supervisorProfileId: string, userProfileIds: string[]) => Promise<boolean>;
}

export function SupervisorAssignDialog({
  open,
  onClose,
  supervisor,
  allUsers,
  currentAssignments,
  onSave,
}: SupervisorAssignDialogProps) {
  const [selected, setSelected] = useState<string[]>(currentAssignments);
  const [saving, setSaving] = useState(false);

  // Filter out admins and the supervisor themselves
  const assignableUsers = allUsers.filter(
    u => u.id !== supervisor.id && u.role !== 'admin'
  );

  const handleToggle = (profileId: string) => {
    setSelected(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(supervisor.id, selected);
    setSaving(false);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usuários Supervisionados por {supervisor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto py-2">
          {assignableUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário disponível para supervisão
            </p>
          ) : (
            assignableUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={selected.includes(user.id)}
                  onCheckedChange={() => handleToggle(user.id)}
                />
                <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </Label>
                <span className="text-xs text-muted-foreground capitalize">
                  {user.role === 'supervisor' ? 'Supervisor' : 'Vendedor'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
