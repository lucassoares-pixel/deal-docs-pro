import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSelectionFields, FieldType } from '@/hooks/useSelectionFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const fieldTypeLabels: Record<FieldType, string> = {
  brand: 'Fornecedores',
  category: 'Categorias',
  product_group: 'Grupos',
};

function FieldTab({ fieldType }: { fieldType: FieldType }) {
  const { fields, loading, addField, updateField, deleteField } = useSelectionFields(fieldType);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    const result = await addField(fieldType, newValue);
    if (result) setNewValue('');
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`Novo valor para ${fieldTypeLabels[fieldType].toLowerCase()}...`}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={adding || !newValue.trim()} className="btn-secondary">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </Button>
      </div>

      <div className="card-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead className="w-24 text-center">Ativo</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Nenhum valor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.value}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={field.active}
                      onCheckedChange={(checked) => updateField(field.id, { active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteField(field.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function SelectionFieldsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Campos de Seleção"
        subtitle="Gerencie os valores disponíveis para fornecedores, categorias e grupos de produtos"
      />

      <Tabs defaultValue="brand" className="space-y-4">
        <TabsList>
          <TabsTrigger value="brand">Fornecedores</TabsTrigger>
          <TabsTrigger value="category">Categorias</TabsTrigger>
          <TabsTrigger value="product_group">Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <FieldTab fieldType="brand" />
        </TabsContent>
        <TabsContent value="category">
          <FieldTab fieldType="category" />
        </TabsContent>
        <TabsContent value="product_group">
          <FieldTab fieldType="product_group" />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
