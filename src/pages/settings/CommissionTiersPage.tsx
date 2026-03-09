import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCommissionTiers, CommissionTier } from '@/hooks/useCommissionTiers';
import { useBonusPrizes } from '@/hooks/useBonusPrizes';
import { useUsers } from '@/hooks/useUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, Plus, Percent, Award, Gift } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function CommissionTiersPage() {
  const { tiers, isLoading, updateTier, createTier, deleteTier } = useCommissionTiers();
  const { users } = useUsers();
  const sellers = useMemo(
    () => users?.filter((u) => u.role === 'sales' && u.active) || [],
    [users]
  );

  const currentDate = new Date();
  const [bonusMonth, setBonusMonth] = useState(currentDate.getMonth() + 1);
  const [bonusYear, setBonusYear] = useState(currentDate.getFullYear());
  const { bonuses, isLoading: bonusLoading, createBonus, deleteBonus } = useBonusPrizes(bonusMonth, bonusYear);

  const [isAddingBonus, setIsAddingBonus] = useState(false);
  const [newBonus, setNewBonus] = useState({ seller_id: '', description: '', value: 0 });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<CommissionTier>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTier, setNewTier] = useState({
    min_percentage: 0,
    max_percentage: 100,
    commission_rate: 0.5,
    setup_prize_rate: 0.1,
    label: '50%',
    sort_order: 0,
    active: true,
  });

  const handleEdit = (tier: CommissionTier) => {
    setEditingId(tier.id);
    setEditedValues({
      min_percentage: tier.min_percentage,
      max_percentage: tier.max_percentage,
      commission_rate: tier.commission_rate,
      setup_prize_rate: tier.setup_prize_rate,
      label: tier.label,
    });
  };

  const handleSave = async (id: string) => {
    await updateTier.mutateAsync({ id, ...editedValues });
    setEditingId(null);
    setEditedValues({});
  };

  const handleCreate = async () => {
    const maxOrder = tiers?.reduce((max, t) => Math.max(max, t.sort_order), 0) || 0;
    await createTier.mutateAsync({
      ...newTier,
      sort_order: maxOrder + 1,
    });
    setIsCreating(false);
    setNewTier({
      min_percentage: 0,
      max_percentage: 100,
      commission_rate: 0.5,
      setup_prize_rate: 0.1,
      label: '50%',
      sort_order: 0,
      active: true,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTier.mutateAsync(id);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Tabela de Premiação"
          subtitle="Configure as faixas de premiação baseadas no atingimento de metas"
        />

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Award className="w-8 h-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Como funciona</h3>
                <p className="text-muted-foreground">
                  A premiação é calculada sobre o valor de recorrência vendido e sobre o valor de implantação, 
                  com base no percentual de atingimento da meta mensal do vendedor. Configure as faixas abaixo 
                  para definir os percentuais de premiação sobre recorrência e implantação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tiers Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Faixas de Premiação</CardTitle>
              <CardDescription>
                Defina as faixas de atingimento e seus respectivos percentuais de prêmio
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Faixa
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atingimento Mín.</TableHead>
                    <TableHead>Atingimento Máx.</TableHead>
                    <TableHead>% Prêmio Recorrência</TableHead>
                    <TableHead>% Prêmio Implantação</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreating && (
                    <TableRow className="bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newTier.min_percentage}
                            onChange={(e) =>
                              setNewTier({ ...newTier, min_percentage: Number(e.target.value) })
                            }
                            className="w-20"
                          />
                          <Percent className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newTier.max_percentage}
                            onChange={(e) =>
                              setNewTier({ ...newTier, max_percentage: Number(e.target.value) })
                            }
                            className="w-20"
                          />
                          <Percent className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={newTier.commission_rate}
                            onChange={(e) =>
                              setNewTier({ ...newTier, commission_rate: Number(e.target.value) })
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            ({formatPercent(newTier.commission_rate)})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={newTier.setup_prize_rate}
                            onChange={(e) =>
                              setNewTier({ ...newTier, setup_prize_rate: Number(e.target.value) })
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            ({formatPercent(newTier.setup_prize_rate)})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newTier.label}
                          onChange={(e) => setNewTier({ ...newTier, label: e.target.value })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={handleCreate}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {tiers?.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>
                        {editingId === tier.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedValues.min_percentage}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, min_percentage: Number(e.target.value) })
                              }
                              className="w-20"
                            />
                            <Percent className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="font-medium">{tier.min_percentage}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tier.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedValues.max_percentage}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, max_percentage: Number(e.target.value) })
                              }
                              className="w-20"
                            />
                            <Percent className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="font-medium">{tier.max_percentage}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tier.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editedValues.commission_rate}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, commission_rate: Number(e.target.value) })
                              }
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-primary">
                            {formatPercent(tier.commission_rate)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tier.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editedValues.setup_prize_rate}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, setup_prize_rate: Number(e.target.value) })
                              }
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-primary">
                            {formatPercent(tier.setup_prize_rate)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tier.id ? (
                          <Input
                            value={editedValues.label}
                            onChange={(e) =>
                              setEditedValues({ ...editedValues, label: e.target.value })
                            }
                            className="w-20"
                          />
                        ) : (
                          <span>{tier.label}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === tier.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(tier.id)}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditedValues({});
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(tier)}>
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover faixa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. A faixa será desativada.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(tier.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Visualização</CardTitle>
            <CardDescription>Prévia das faixas configuradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers?.map((tier) => (
                <div
                  key={tier.id}
                  className="p-4 rounded-lg border bg-card text-center space-y-2"
                >
                  <p className="text-sm text-muted-foreground">
                    Atingimento: {tier.min_percentage}% – {tier.max_percentage}%
                  </p>
                  <p className="text-2xl font-bold text-primary">{tier.label}</p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span>Recorrência: {formatPercent(tier.commission_rate)}</span>
                    <span>Implantação: {formatPercent(tier.setup_prize_rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
