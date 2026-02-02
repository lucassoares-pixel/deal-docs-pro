import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function generateContractPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS SaaS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contrato Nº: ${contract.id}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Data: ${format(new Date(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Client Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATANTE:', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Razão Social: ${contract.client.company_name}`, 14, yPos);
  yPos += 5;
  doc.text(`Nome Fantasia: ${contract.client.trade_name}`, 14, yPos);
  yPos += 5;
  doc.text(`CNPJ: ${contract.client.cnpj}`, 14, yPos);
  yPos += 5;
  doc.text(`Endereço: ${contract.client.address_street}, ${contract.client.address_number} - ${contract.client.address_neighborhood}`, 14, yPos);
  yPos += 5;
  doc.text(`${contract.client.address_city}/${contract.client.address_state} - CEP: ${contract.client.address_zip}`, 14, yPos);
  yPos += 5;
  doc.text(`E-mail: ${contract.client.email} | Telefone: ${contract.client.phone}`, 14, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Representante Legal:', 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${contract.legal_representative.legal_name} - ${contract.legal_representative.role}`, 14, yPos);
  yPos += 5;
  doc.text(`CPF: ${contract.legal_representative.cpf}`, 14, yPos);
  yPos += 15;

  // Recurring Products Table
  const recurringProducts = contract.products.filter(p => p.product.billing_type === 'recurring');
  if (recurringProducts.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUTOS RECORRENTES (MENSAIS)', 14, yPos);
    yPos += 5;

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
      styles: { fontSize: 8 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Setup/One-Time Products Table
  const setupProducts = contract.products.filter(p => p.product.billing_type === 'one_time' || p.product.setup_price);
  if (setupProducts.length > 0 || contract.setup_total > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SETUP E COBRANÇAS ÚNICAS', 14, yPos);
    yPos += 5;

    const setupRows: string[][] = [];
    
    // Add setup fees for recurring products
    contract.products.forEach(p => {
      if (p.product.billing_type === 'recurring' && p.product.setup_price) {
        setupRows.push([
          `Setup - ${p.product.name}`,
          p.quantity.toString(),
          formatCurrency((p.product.setup_price || 0) * p.quantity)
        ]);
      }
    });

    // Add one-time products
    contract.products
      .filter(p => p.product.billing_type === 'one_time')
      .forEach(p => {
        setupRows.push([
          p.product.name,
          p.quantity.toString(),
          formatCurrency(p.discounted_price)
        ]);
      });

    if (setupRows.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Produto/Serviço', 'Qtd', 'Valor']],
        body: setupRows,
        foot: [['Total Setup/Único:', '', formatCurrency(contract.setup_total)]],
        theme: 'striped',
        headStyles: { fillColor: [34, 52, 79], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Contract Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES DO CONTRATO', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Início: ${format(new Date(contract.start_date), "dd/MM/yyyy")}`, 14, yPos);
  yPos += 5;
  doc.text(`Dia de Vencimento: ${contract.billing_day}`, 14, yPos);
  yPos += 5;
  doc.text(`Período de Fidelidade: ${contract.fidelity_months} meses`, 14, yPos);
  yPos += 15;

  // Add a new page for clauses
  doc.addPage();
  yPos = 20;

  // Clauses
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULAS CONTRATUAIS', 14, yPos);
  yPos += 10;

  const clauses = [
    {
      title: '1. OBJETO',
      content: 'O presente contrato tem por objeto a licença de uso de software como serviço (SaaS) dos produtos descritos neste instrumento, conforme especificações técnicas e comerciais estabelecidas.'
    },
    {
      title: '2. VIGÊNCIA',
      content: `Este contrato terá vigência a partir de ${format(new Date(contract.start_date), "dd/MM/yyyy")} pelo período mínimo de ${contract.fidelity_months} meses (fidelidade), renovando-se automaticamente por períodos iguais e sucessivos.`
    },
    {
      title: '3. PAGAMENTO',
      content: `Os valores serão cobrados mensalmente, com vencimento no dia ${contract.billing_day} de cada mês, mediante boleto bancário ou cartão de crédito. Em caso de atraso, incidirão multa de 2% e juros de 1% ao mês.`
    },
    {
      title: '4. REAJUSTE',
      content: 'Os valores contratados serão reajustados anualmente pelo índice IPCA/IBGE acumulado no período, ou índice que venha a substituí-lo.'
    },
    {
      title: '5. INADIMPLÊNCIA',
      content: 'A falta de pagamento por mais de 30 (trinta) dias poderá acarretar a suspensão do acesso aos serviços até a regularização do débito.'
    },
    {
      title: '6. RESCISÃO',
      content: 'Durante o período de fidelidade, a rescisão antecipada por parte do CONTRATANTE implicará em multa correspondente a 50% do valor restante do período de fidelidade.'
    },
    {
      title: '7. LGPD',
      content: 'As partes se comprometem a observar as disposições da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantindo a privacidade e segurança dos dados pessoais tratados.'
    },
    {
      title: '8. FORO',
      content: 'Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões oriundas deste contrato, renunciando-se a qualquer outro, por mais privilegiado que seja.'
    }
  ];

  doc.setFontSize(9);
  clauses.forEach(clause => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(clause.title, 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(clause.content, pageWidth - 28);
    doc.text(lines, 14, yPos);
    yPos += lines.length * 4 + 8;
  });

  // Signatures
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 20;
  doc.setFontSize(10);
  doc.text('E por estarem assim justas e contratadas, as partes assinam o presente instrumento.', 14, yPos);
  yPos += 10;
  doc.text(`${contract.client.address_city}/${contract.client.address_state}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, yPos);
  yPos += 30;

  // Signature lines
  doc.line(14, yPos, 90, yPos);
  doc.line(110, yPos, 196, yPos);
  yPos += 5;
  doc.text('CONTRATADA', 52, yPos, { align: 'center' });
  doc.text('CONTRATANTE', 153, yPos, { align: 'center' });
  yPos += 5;
  doc.setFontSize(8);
  doc.text('', 52, yPos, { align: 'center' });
  doc.text(contract.legal_representative.legal_name, 153, yPos, { align: 'center' });

  // Save
  doc.save(`contrato_${contract.client.trade_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export function generateClientSheetPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DO CLIENTE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Documento interno - Não contém valores comerciais', pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0);
  yPos += 15;

  // Client Info Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 55, 3, 3, 'F');
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Razão Social: ${contract.client.company_name}`, 20, yPos);
  yPos += 5;
  doc.text(`Nome Fantasia: ${contract.client.trade_name}`, 20, yPos);
  yPos += 5;
  doc.text(`CNPJ: ${contract.client.cnpj}`, 20, yPos);
  yPos += 5;
  doc.text(`E-mail: ${contract.client.email}`, 20, yPos);
  yPos += 5;
  doc.text(`Telefone: ${contract.client.phone}`, 20, yPos);
  yPos += 5;
  doc.text(`Endereço: ${contract.client.address_street}, ${contract.client.address_number} - ${contract.client.address_city}/${contract.client.address_state}`, 20, yPos);
  yPos += 15;

  // Legal Representative Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 30, 3, 3, 'F');
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('REPRESENTANTE LEGAL', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${contract.legal_representative.legal_name}`, 20, yPos);
  yPos += 5;
  doc.text(`Cargo: ${contract.legal_representative.role} | CPF: ${contract.legal_representative.cpf}`, 20, yPos);
  yPos += 20;

  // Contract Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO CONTRATO', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Início: ${format(new Date(contract.start_date), "dd/MM/yyyy")}`, 14, yPos);
  yPos += 5;
  doc.text(`Período de Fidelidade: ${contract.fidelity_months} meses`, 14, yPos);
  yPos += 5;
  doc.text(`Dia de Vencimento: ${contract.billing_day}`, 14, yPos);
  yPos += 15;

  // Products Table (without prices)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS CONTRATADOS', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Produto', 'Tipo', 'Quantidade', 'Fidelidade']],
    body: contract.products.map(p => [
      p.product.name,
      p.product.billing_type === 'recurring' ? 'Recorrente' : 'Único',
      p.quantity.toString(),
      p.product.fidelity_months > 0 ? `${p.product.fidelity_months} meses` : '-'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [34, 52, 79], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Este documento é de uso interno e não contém informações de preços ou descontos.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, yPos, { align: 'center' });

  // Save
  doc.save(`ficha_cliente_${contract.client.trade_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
