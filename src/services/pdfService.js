import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const generatePDF = async (venda, cliente, itens) => {
  const doc = new jsPDF();

  // Cores do tema (Primary: 79, 70, 229 / #4F46E5)
  const primaryColor = [79, 70, 229];

  // Cabeçalho da Empresa
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold"); // define a fonte como negrito
  doc.text('RSN CLEAN', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Recibo de Venda', 14, 28);

  // Informações do Pedido e Cliente
  doc.setFontSize(12);
  doc.setTextColor(40);

  doc.text('Dados do Cliente', 14, 45);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Nome: ${cliente?.nome || 'N/A'}`, 14, 52);
  doc.text(`Telefone: ${cliente?.telefone || 'N/A'}`, 14, 58);
  doc.text(`Local: ${cliente?.local || 'N/A'}`, 14, 64);

  // Status e Data alinhados à direita
  doc.setFontSize(10);
  doc.text(`Data: ${new Date(venda.data || new Date()).toLocaleDateString('pt-BR')}`, 140, 52);
  doc.text(`Status: ${venda.status}`, 140, 58);
  doc.text(`Pedido Nº: ${venda.id ? String(venda.id).substring(0, 8).toUpperCase() : 'NOVO'}`, 140, 64);

  // Tabela de Itens
  const tableData = itens.map(item => [
    item.produto_nome || 'Produto',
    item.quantidade.toString(),
    `R$ ${Number(item.valor).toFixed(2)}`,
    `R$ ${(item.quantidade * item.valor).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Produto', 'Qtd', 'V. Unit', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  // Totais
  let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 75;

  const hasPagamentos = venda.pagamentos && venda.pagamentos.length > 0;
  const originalTotal = venda.originalTotal || venda.total;

  if (hasPagamentos) {
    finalY += 10;
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Pagamentos', 14, finalY);
    doc.setFont('helvetica', 'normal');

    const pagamentosData = venda.pagamentos.map(p => [
      new Date(p.data).toLocaleString('pt-BR'),
      `R$ ${Number(p.valor).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Data do Pagamento', 'Valor Pago']],
      body: pagamentosData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35, halign: 'right' }
      }
    });

    finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || (finalY + 20);
  }

  doc.setFillColor(243, 244, 246);
  doc.rect(110, finalY + 10, 85, hasPagamentos ? 35 : 25, 'F');

  if (hasPagamentos) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Total da Compra:', 115, finalY + 20);
    doc.text(`R$ ${Number(originalTotal).toFixed(2)}`, 190, finalY + 20, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Saldo Devedor:', 115, finalY + 35);

    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${Number(venda.total).toFixed(2)}`, 190, finalY + 35, { align: 'right' });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Total do Pedido:', 115, finalY + 20);

    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${Number(venda.total).toFixed(2)}`, 190, finalY + 20, { align: 'right' });
  }

  // Rodapé
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Obrigado pela preferência!', 105, 280, { align: 'center' });

  // Salvar PDF
  const fileBaseName = `Recibo_${cliente?.nome?.split(' ')[0] || 'Venda'}_${new Date().getTime()}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Salva no Cache (Pasta segura e que NUNCA falha por permissão)
      const savedFile = await Filesystem.writeFile({
        path: fileBaseName,
        data: pdfBase64,
        directory: Directory.Cache
      });

      // Abre o menu de compartilhamento do Android
      // O usuário pode escolher "Salvar no dispositivo", "WhatsApp", etc.
      await Share.share({
        title: 'Recibo de Venda',
        text: `Recibo de ${cliente?.nome || 'Cliente'}`,
        url: savedFile.uri,
        dialogTitle: 'Abrir ou Enviar Recibo'
      });

    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      alert('Não foi possível gerar ou compartilhar o PDF.');
    }
  } else {
    // No navegador (PC), baixa direto
    doc.save(fileBaseName);
  }
};

export const generateSummaryPDF = async (vendas, clientes, startDate, endDate, totalPeriodo, totalPendente) => {
  const doc = new jsPDF();
  const primaryColor = [79, 70, 229];

  // Cabeçalho
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text('RSN CLEAN - RELATÓRIO GERAL', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`, 14, 30);

  // Resumo
  doc.setFillColor(243, 244, 246);
  doc.rect(14, 38, 182, 20, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text('RESUMO DO PERÍODO', 18, 45);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total no Período: R$ ${totalPeriodo.toFixed(2)}`, 18, 52);
  doc.text(`Total Pendente: R$ ${totalPendente.toFixed(2)}`, 100, 52);

  // Tabela de Vendas
  const tableData = vendas.map(v => [
    new Date(v.data).toLocaleDateString('pt-BR'),
    clientes[v.cliente_id]?.nome || 'N/A',
    v.status,
    `R$ ${Number(v.total).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['Data', 'Cliente', 'Status', 'Valor/Saldo']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  const fileBaseName = `Relatorio_Geral_${startDate}_${endDate}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileBaseName,
        data: pdfBase64,
        directory: Directory.Cache
      });
      await Share.share({
        title: 'Relatório Geral de Vendas',
        url: savedFile.uri
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar relatório.');
    }
  } else {
    doc.save(fileBaseName);
  }
};
