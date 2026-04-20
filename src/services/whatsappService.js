export const sendWhatsAppMessage = (telefone, venda, cliente, itens) => {
  if (!telefone) {
    alert('Cliente não possui telefone cadastrado.');
    return;
  }

  const num = telefone.replace(/\D/g, '');

  let texto = `*Pedido de Venda*\n\n`;
  texto += `*Cliente:* ${cliente.nome}\n`;
  texto += `*Data:* ${new Date(venda.data || new Date()).toLocaleDateString('pt-BR')}\n`;
  texto += `*Status:* ${venda.status}\n\n`;

  texto += `*Itens do Pedido:*\n`;
  itens.forEach(item => {
    texto += `- ${item.quantidade} ${item.produto_nome} R$ ${(Number(item.quantidade) * Number(item.valor)).toFixed(2).replace('.', ',')}\n`;
  });

  texto += `\n*Total:* R$ ${Number(venda.total).toFixed(2)}`;

  const encodedText = encodeURIComponent(texto);
  const url = `https://wa.me/55${num}?text=${encodedText}`;

  window.open(url, '_blank');
};
