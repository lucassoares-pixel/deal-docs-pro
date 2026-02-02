
# Plano: Adicionar Colunas de Desconto na Tabela de Produtos

## Objetivo

Atualizar a tabela de produtos no contrato PDF para incluir:
1. **Coluna de Desconto** - Mostrando o percentual de desconto aplicado
2. **Coluna de Valor com Desconto** - Mostrando o preço final após o desconto

---

## Alteração no Arquivo

**Arquivo:** `src/utils/pdfGenerator.ts`

### Estrutura Atual da Tabela
```text
| Produto | Qtd | Preço Cheio | Desc. | Preço Final | Fidelidade |
```

### Nova Estrutura da Tabela
```text
| PRODUTO | QTD | VALOR IMPLANTAÇÃO | VALOR CHEIO | DESCONTO | VALOR C/ DESC | FIDELIDADE |
```

---

## Detalhes da Implementação

### Alterações na Tabela de Produtos Recorrentes (linha 70-87)

Atualizar o cabeçalho e corpo da tabela para:

**Cabeçalho:**
- PRODUTO
- QTD
- VALOR IMPLANTAÇÃO (valor de adesão/implantação)
- VALOR CHEIO (mensalidade sem desconto)
- DESCONTO (percentual aplicado)
- VALOR C/ DESC (mensalidade com desconto)
- FIDELIDADE

**Corpo da tabela:**
Para cada produto:
- Nome do produto
- Quantidade
- Valor de implantação (setup_price * quantidade)
- Valor cheio (full_price)
- Desconto em percentual (ex: "10%" ou "-")
- Valor com desconto (discounted_price)
- Período de fidelidade (ex: "[12 Meses]")

**Rodapé da tabela:**
- Total Implantação
- Total Cheio
- Total com Desconto

### Cálculo do Valor de Desconto em Reais

Para facilitar a visualização, além do percentual, podemos mostrar o valor economizado:
- Valor do desconto = full_price - discounted_price

---

## Exemplo Visual da Nova Tabela

```text
| PRODUTO          | QTD | IMPLANTAÇÃO  | VALOR CHEIO | DESC. | VALOR C/ DESC | FIDELIDADE |
|------------------|-----|--------------|-------------|-------|---------------|------------|
| V4 EAN           | 1   | R$ 1.200,00  | R$ 200,00   | 10%   | R$ 180,00     | [12 Meses] |
| PDV COMPETI      | 1   | R$ 0,00      | R$ 95,00    | -     | R$ 95,00      | [12 Meses] |
| CNPJ ADICIONAL   | 1   | R$ 0,00      | R$ 139,90   | 5%    | R$ 132,90     | [12 Meses] |
|------------------|-----|--------------|-------------|-------|---------------|------------|
| TOTAL            |     | R$ 1.200,00  | R$ 434,90   |       | R$ 407,90     | [12 Meses] |
```

---

## Resumo Técnico

| Local | Alteração |
|-------|-----------|
| Linha 72 | Atualizar array do cabeçalho para incluir novas colunas |
| Linhas 73-80 | Atualizar mapeamento do corpo para incluir implantação, desconto e valor com desconto |
| Linhas 81-82 | Atualizar rodapé para mostrar totais corretos |

---

## Código Atualizado

```typescript
autoTable(doc, {
  startY: yPos,
  head: [['PRODUTO', 'QTD', 'IMPLANTAÇÃO', 'VALOR CHEIO', 'DESCONTO', 'VALOR C/ DESC', 'FIDELIDADE']],
  body: recurringProducts.map(p => [
    p.product.name,
    p.quantity.toString(),
    formatCurrency((p.product.setup_price || 0) * p.quantity),
    formatCurrency(p.full_price),
    p.discount_percentage > 0 ? `${p.discount_percentage}%` : '-',
    formatCurrency(p.discounted_price),
    `[${p.product.fidelity_months} Meses]`
  ]),
  foot: [[
    'TOTAL', 
    '', 
    formatCurrency(contract.setup_total), 
    formatCurrency(contract.recurring_total_full), 
    '', 
    formatCurrency(contract.recurring_total_discounted), 
    `[${contract.fidelity_months} Meses]`
  ]],
  theme: 'striped',
  headStyles: { fillColor: [34, 52, 79], textColor: 255 },
  footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
  margin: { left: 14, right: 14 },
  styles: { fontSize: 8 }, // Fonte menor para caber todas as colunas
});
```
