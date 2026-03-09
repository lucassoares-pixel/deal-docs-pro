

## Plano: Adicionar campos de observação no resumo do contrato

### O que será feito
Adicionar dois campos de data no resumo do contrato (etapa "Revisão"):
1. **Data de pagamento da implantação** 
2. **Data de pagamento da primeira mensalidade**

Esses campos serão salvos no banco de dados como observações do contrato e aparecerão no PDF.

### Alterações

**1. Migração de banco de dados**
- Adicionar duas colunas na tabela `contracts`:
  - `implementation_payment_date` (date, nullable)
  - `first_monthly_payment_date` (date, nullable)

**2. ContractBuilderPage.tsx**
- Criar dois novos estados: `implementationPaymentDate` e `firstMonthlyPaymentDate`
- Adicionar os dois campos de data na seção "Dados de Implantação e Treinamento" (ou em uma nova seção "Observações" logo abaixo)
- Incluir os valores no objeto passado ao `addContract`

**3. EditContractPage.tsx**
- Carregar e permitir edição dos mesmos campos ao editar um contrato existente

**4. PDF (se aplicável)**
- Incluir essas datas nas observações do contrato gerado em PDF

