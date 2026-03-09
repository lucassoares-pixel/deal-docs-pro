import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTRACT_CLAUSES, DISCOUNT_CLAUSE } from './pdfClauses';

// Logo em base64 será carregada dinamicamente
let logoBase64: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (logoBase64) return logoBase64;
  
  try {
    const response = await fetch('/logo-competi.jpg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

type PdfOutputMode = 'download' | 'open';

interface PdfOptions {
  mode?: PdfOutputMode;
}

async function trySaveWithNativeFilePicker(doc: jsPDF, filename: string): Promise<boolean> {
  const picker = (window as any)?.showSaveFilePicker;
  if (typeof picker !== 'function') return false;

  try {
    const handle = await picker({
      suggestedName: filename,
      types: [
        {
          description: 'PDF',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    });

    const writable = await handle.createWritable();
    const data = (doc as any).output('arraybuffer') as ArrayBuffer;
    await writable.write(data);
    await writable.close();
    return true;
  } catch (e: any) {
    if (e?.name === 'AbortError') return true;
    return false;
  }
}

async function finalizePdf(doc: jsPDF, filename: string, mode: PdfOutputMode) {
  if (mode === 'download') {
    const saved = await trySaveWithNativeFilePicker(doc, filename);
    if (saved) return;

    try {
      const dataUri = (doc as any).output('datauristring') as string;
      window.location.assign(dataUri);
      return;
    } catch {
      // continua para fallback
    }

    doc.save(filename);
    return;
  }

  try {
    (doc as any).output('dataurlnewwindow');
    return;
  } catch {
    // continua para fallbacks
  }

  try {
    const dataUri = (doc as any).output('datauristring') as string;
    const opened = window.open(dataUri, '_blank', 'noopener,noreferrer');
    if (opened) return;
  } catch {
    // ignore
  }

  try {
    const blob = (doc as any).output('blob') as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  } catch {
    // ignore
  }

  doc.save(filename);
}

function addHeader(doc: jsPDF, logo: string | null, pageWidth: number): number {
  let yPos = 15;
  
  // Logo centralizado
  if (logo) {
    try {
      // Logo com 50mm de largura, centralizado
      const logoWidth = 50;
      const logoHeight = 15;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, 'JPEG', logoX, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 10;
    } catch {
      yPos += 5;
    }
  }
  
  return yPos;
}

export async function generateContractPDF(contract: Contract, options: PdfOptions = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Carregar logo
  const logo = await loadLogo();
  
  let yPos = addHeader(doc, logo, pageWidth);

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.text('E PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contrato Nº: ${contract.id}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Data: ${format(new Date(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Dados da CONTRATADA (fixos)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATADA:', 14, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Razão Social: COMPETI SISTEMAS LTDA', 14, yPos);
  yPos += 4;
  doc.text('CNPJ: 13.885.290/0001-40', 14, yPos);
  yPos += 4;
  doc.text('Endereço: Av. JK, Quadra 19, Lote 01, Sala 01, Pavimento 04, nº 500 - Jundiaí', 14, yPos);
  yPos += 4;
  doc.text('Anápolis/GO - CEP: 75070-400', 14, yPos);
  yPos += 4;
  doc.text('E-mail: financeiro@competisistemas.com.br | Telefone: (62) 3098-2122', 14, yPos);
  yPos += 4;
  doc.text('Neste ato representada na forma de seu contrato social.', 14, yPos);
  yPos += 10;

  // Dados do Contratante
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATANTE:', 14, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Razão Social: ${contract.client.company_name}`, 14, yPos);
  yPos += 4;
  doc.text(`Nome Fantasia: ${contract.client.trade_name}`, 14, yPos);
  yPos += 4;
  doc.text(`CNPJ: ${contract.client.cnpj}`, 14, yPos);
  yPos += 4;
  doc.text(`Endereço: ${contract.client.address_street}, ${contract.client.address_number} - ${contract.client.address_neighborhood}`, 14, yPos);
  yPos += 4;
  doc.text(`${contract.client.address_city}/${contract.client.address_state} - CEP: ${contract.client.address_zip}`, 14, yPos);
  yPos += 4;
  doc.text(`E-mail: ${contract.client.email} | Telefone: ${contract.client.phone}`, 14, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Representante Legal:', 14, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`${contract.legal_representative.legal_name} - ${contract.legal_representative.role}`, 14, yPos);
  yPos += 4;
  doc.text(`CPF: ${contract.legal_representative.cpf}`, 14, yPos);
  yPos += 10;

  // Texto introdutório
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const introText = 'As partes acima identificadas celebram o presente CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS) E PRESTAÇÃO DE SERVIÇOS, que se regerá pelas cláusulas e condições seguintes:';
  const introLines = doc.splitTextToSize(introText, pageWidth - 28);
  doc.text(introLines, 14, yPos);
  yPos += introLines.length * 4 + 8;

  // CLÁUSULA 1 - DO OBJETO
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(CONTRACT_CLAUSES[0].title, 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const clause1Lines = doc.splitTextToSize(CONTRACT_CLAUSES[0].content, pageWidth - 28);
  doc.text(clause1Lines, 14, yPos);
  yPos += clause1Lines.length * 4 + 8;

  // Margem de rodapé mínima de 1cm (aproximadamente 10mm = ~28 pontos do topo da página 297mm)
  const pageHeight = doc.internal.pageSize.height;
  const footerMargin = 20; // ~1cm de margem inferior
  const maxY = pageHeight - footerMargin;

  // CLÁUSULA 2 - PRODUTOS (com tabela)
  if (yPos > maxY - 60) {
    doc.addPage();
    yPos = addHeader(doc, logo, pageWidth);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(CONTRACT_CLAUSES[1].title, 14, yPos);
  yPos += 8;

  // Verificar se há desconto para adicionar nota
  const hasDiscount = contract.products.some(p => p.discount_percentage > 0) || 
    (contract.recurring_total_discounted < contract.recurring_total_full);

  // Tabela de produtos com novas colunas
  autoTable(doc, {
    startY: yPos,
    head: [['PRODUTO', 'QTD.', 'IMPLANTAÇÃO', 'MENSALIDADE', '% DESC', 'VALOR C/ DESC', 'VALIDADE DESC', 'FIDELIDADE']],
    body: contract.products.map(p => {
      // Determinar validade do desconto
      let discountValidity = '-';
      if (p.discount_percentage > 0) {
        if (p.discount_period_type === 'indefinite' || p.discount_period_type === 'indeterminate') {
          discountValidity = 'Indeterminado';
        } else if (p.discount_period_type === 'months' && p.discount_months) {
          discountValidity = `${p.discount_months} meses`;
        } else if (p.discount_period_type === 'fixed_date' && p.discount_end_date) {
          discountValidity = p.discount_end_date;
        }
      }
      
      return [
        p.product.name,
        p.quantity.toString(),
        formatCurrency((p.custom_enrollment_price ?? p.product.setup_price ?? 0) * p.quantity),
        formatCurrency(p.full_price),
        p.discount_percentage > 0 ? `${p.discount_percentage}%` : '-',
        formatCurrency(p.discounted_price),
        discountValidity,
        `${p.product.fidelity_months} Meses`
      ];
    }),
    foot: [[
      'TOTAL',
      contract.products.reduce((sum, p) => sum + (p.quantity || 1), 0).toString(),
      formatCurrency(contract.setup_total), 
      formatCurrency(contract.recurring_total_full),
      '',
      formatCurrency(contract.recurring_total_discounted), 
      '',
      `${contract.fidelity_months} Meses`
    ]],
    theme: 'striped',
    headStyles: { fillColor: [34, 52, 79], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 7 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 13, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Condição especial de desconto (junto da tabela)
  if (hasDiscount) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const finalMonthlyValue = contract.recurring_total_discounted - (contract.extra_discount_value ?? 0);
    const discountNote = `*FOI CONCEDIDO UM DESCONTO SOBRE O VALOR DA MENSALIDADE, QUE DEVERÁ TER A COBRANÇA DE ${formatCurrency(finalMonthlyValue)} NO CNPJ POR PERÍODO INDETERMINADO.`;
    const discountNoteLines = doc.splitTextToSize(discountNote, pageWidth - 28);
    doc.text(discountNoteLines, 14, yPos);
    yPos += discountNoteLines.length * 3 + 5;

    // Cláusula especial de desconto logo abaixo da OBS
    if (yPos > maxY - 40) {
      doc.addPage();
      yPos = addHeader(doc, logo, pageWidth);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(DISCOUNT_CLAUSE.title, 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const discountClauseLines = doc.splitTextToSize(DISCOUNT_CLAUSE.content, pageWidth - 28);
    doc.text(discountClauseLines, 14, yPos);
    yPos += discountClauseLines.length * 4 + 8;
  }

  yPos += 5;

  // CLÁUSULA 3 - VIGÊNCIA
  if (yPos > maxY - 40) {
    doc.addPage();
    yPos = addHeader(doc, logo, pageWidth);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(CONTRACT_CLAUSES[2].title, 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const clause3Content = CONTRACT_CLAUSES[2].content
    .replace('[FIDELIDADE_MESES]', contract.fidelity_months.toString());
  const clause3Lines = doc.splitTextToSize(clause3Content, pageWidth - 28);
  doc.text(clause3Lines, 14, yPos);
  yPos += clause3Lines.length * 4 + 8;

  // CLÁUSULA 4 - MENSALIDADES
  if (yPos > maxY - 40) {
    doc.addPage();
    yPos = addHeader(doc, logo, pageWidth);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(CONTRACT_CLAUSES[3].title, 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const clause4Content = CONTRACT_CLAUSES[3].content
    .replace('[DIA_VENCIMENTO]', contract.billing_day.toString());
  const clause4Lines = doc.splitTextToSize(clause4Content, pageWidth - 28);
  doc.text(clause4Lines, 14, yPos);
  yPos += clause4Lines.length * 4 + 8;

  // Demais cláusulas (5 a 12)
  for (let i = 4; i < CONTRACT_CLAUSES.length; i++) {
    if (yPos > maxY - 40) {
      doc.addPage();
      yPos = addHeader(doc, logo, pageWidth);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(CONTRACT_CLAUSES[i].title, 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(CONTRACT_CLAUSES[i].content, pageWidth - 28);
    doc.text(lines, 14, yPos);
    yPos += lines.length * 4 + 8;
  }

  // (Cláusula especial já inserida após a OBS da tabela de produtos)

  // OBSERVAÇÕES - Datas de pagamento
  if (contract.implementation_payment_date || contract.first_monthly_payment_date) {
    if (yPos > maxY - 80) {
      doc.addPage();
      yPos = addHeader(doc, logo, pageWidth);
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (contract.implementation_payment_date) {
      doc.text(`Data de pagamento da implantação: ${format(new Date(contract.implementation_payment_date), "dd/MM/yyyy")}`, 14, yPos);
      yPos += 6;
    }
    
    if (contract.first_monthly_payment_date) {
      doc.text(`Data de pagamento da primeira mensalidade: ${format(new Date(contract.first_monthly_payment_date), "dd/MM/yyyy")}`, 14, yPos);
      yPos += 6;
    }
    
    yPos += 10;
  }

  // Assinaturas
  if (yPos > maxY - 60) {
    doc.addPage();
    yPos = addHeader(doc, logo, pageWidth);
  }

  yPos += 15;
  doc.setFontSize(9);
  doc.text('E por estarem assim justas e contratadas, as partes assinam o presente instrumento.', 14, yPos);
  yPos += 8;
  doc.text(`${contract.client.address_city}/${contract.client.address_state}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, yPos);
  yPos += 25;

  // Linhas de assinatura
  doc.line(14, yPos, 90, yPos);
  doc.line(110, yPos, 196, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.text('CONTRATADA', 52, yPos, { align: 'center' });
  doc.text('CONTRATANTE', 153, yPos, { align: 'center' });
  yPos += 4;
  doc.setFontSize(8);
  doc.text('COMPETI SISTEMAS LTDA', 52, yPos, { align: 'center' });
  doc.text(contract.legal_representative.legal_name, 153, yPos, { align: 'center' });

  // Salvar
  const filename = `contrato_${contract.client.trade_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  await finalizePdf(doc, filename, options.mode ?? 'download');
}

export async function generateClientSheetPDF(contract: Contract, options: PdfOptions = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Carregar logo
  const logo = await loadLogo();
  
  let yPos = addHeader(doc, logo, pageWidth);

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
  doc.text(`Inscrição Estadual: ${(contract.client as any).state_registration || 'Não informada'}`, 20, yPos);
  yPos += 5;
  doc.text(`E-mail: ${contract.client.email}`, 20, yPos);
  yPos += 5;
  doc.text(`Telefone: ${contract.client.phone}`, 20, yPos);
  yPos += 5;
  doc.text(`Endereço: ${contract.client.address_street}, ${contract.client.address_number} - ${contract.client.address_neighborhood}`, 20, yPos);
  yPos += 5;
  doc.text(`${contract.client.address_city}/${contract.client.address_state} - CEP: ${contract.client.address_zip}`, 20, yPos);
  yPos += 15;

  // Informações da Implantação
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DA IMPLANTAÇÃO', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Envio do Contrato: ${format(new Date(contract.created_at), "dd/MM/yyyy")}`, 14, yPos);
  yPos += 5;
  const implType = (contract as any).implementation_type === 'presencial' ? 'Presencial' : 'Remota';
  doc.text(`Tipo de Implantação: ${implType}`, 14, yPos);
  yPos += 5;
  const certType = (contract as any).certificate_type;
  doc.text(`Tipo de Certificado: ${certType || 'Não informado'}`, 14, yPos);
  yPos += 5;
  const trainingName = (contract as any).training_contact_name;
  const trainingPhone = (contract as any).training_contact_phone;
  doc.text(`Responsável pela Implantação: ${trainingName || 'Não informado'}${trainingPhone ? ` - Tel: ${trainingPhone}` : ''}`, 14, yPos);
  yPos += 5;
  doc.text(`Emite Nota Fiscal: ${(contract.client as any).issues_invoice ? 'Sim' : 'Não'}`, 14, yPos);
  yPos += 5;
  const taxRegimeLabels: Record<string, string> = {
    simples_nacional: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
    mei: 'MEI',
  };
  const taxRegime = (contract.client as any).tax_regime;
  doc.text(`Regime Tributário: ${taxRegimeLabels[taxRegime] || 'Não informado'}`, 14, yPos);
  yPos += 5;
  const invoiceTypes = (contract as any).invoice_types as string[] | undefined;
  doc.text(`Tipos de Notas Emitidas: ${invoiceTypes && invoiceTypes.length > 0 ? invoiceTypes.join(', ') : 'Não informado'}`, 14, yPos);
  yPos += 10;

  // Products as text list (not table)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MÓDULOS CONTRATADOS', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  contract.products.forEach(p => {
    doc.text(`• ${p.product.name} — Quantidade: ${p.quantity}`, 18, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Este documento é de uso interno e não contém informações de preços ou descontos.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, yPos, { align: 'center' });

  // Save/Open
  const filename = `ficha_cliente_${contract.client.trade_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  await finalizePdf(doc, filename, options.mode ?? 'download');
}
