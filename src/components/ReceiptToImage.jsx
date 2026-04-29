import React, { forwardRef } from 'react';

const ReceiptToImage = forwardRef(({ venda, cliente, itens, pagamentos = [] }, ref) => {
  if (!venda || !cliente) return null;

  const totalItens = itens.reduce((acc, item) => acc + (Number(item.valor) * Number(item.quantidade)), 0);
  const valorDesconto = Number(venda.desconto || 0);
  const totalComDesconto = totalItens - valorDesconto;
  
  // Calcular quanto já foi pago através do histórico de pagamentos
  const valorPagoHistorico = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
  
  // Se a venda estiver como 'Pago' mas não tiver histórico (venda nova já paga), 
  // consideramos o total como pago.
  let valorPagoTotal = valorPagoHistorico;
  if (venda.status === 'Pago' && valorPagoHistorico === 0) {
    valorPagoTotal = totalComDesconto;
  }

  const saldoDevedor = Math.max(0, totalComDesconto - valorPagoTotal);

  return (
    <div 
      ref={ref}
      style={{
        padding: '30px',
        background: 'white',
        width: '400px',
        fontFamily: "'Inter', sans-serif",
        color: '#1e293b',
        position: 'fixed',
        left: '-9999px', // Hide from view but keep in DOM for capture
        top: 0
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
        <h1 style={{ color: '#4f46e5', fontSize: '28px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>RSN CLEAN</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '5px', fontWeight: '500' }}>COMPROVANTE DE VENDA</p>
      </div>

      {/* Transaction Details */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>DATA / HORA</span>
          <span style={{ fontWeight: '600', fontSize: '12px' }}>{new Date(venda.data || new Date()).toLocaleString('pt-BR')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>ID DA TRANSAÇÃO</span>
          <span style={{ fontWeight: '600', fontSize: '12px' }}>#{venda.id && typeof venda.id === 'string' ? venda.id.substring(0, 8).toUpperCase() : 'NOVO'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>STATUS</span>
          <span style={{ 
            fontWeight: '700', 
            fontSize: '11px', 
            background: venda.status === 'Pago' ? '#dcfce7' : (venda.status === 'Parcial' ? '#fef3c7' : '#fee2e2'), 
            color: venda.status === 'Pago' ? '#15803d' : (venda.status === 'Parcial' ? '#92400e' : '#b91c1c'),
            padding: '2px 8px',
            borderRadius: '12px',
            textTransform: 'uppercase'
          }}>
            {venda.status}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '25px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Cliente</p>
        <p style={{ fontSize: '16px', fontWeight: '700', margin: '0' }}>{cliente.nome}</p>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>{cliente.telefone || ''}</p>
        {cliente.local && <p style={{ fontSize: '13px', color: '#64748b', margin: '0' }}>{cliente.local}</p>}
      </div>

      {/* Items */}
      <div style={{ marginBottom: '25px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '600', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>Itens do Pedido</p>
        {itens.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600' }}>{item.produto_nome}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{item.quantidade}x R$ {Number(item.valor).toFixed(2).replace('.', ',')}</div>
            </div>
            <div style={{ fontWeight: '700', alignSelf: 'center' }}>
              R$ {(item.quantidade * item.valor).toFixed(2).replace('.', ',')}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '15px', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
          <span style={{ color: '#64748b' }}>SUBTOTAL</span>
          <span style={{ fontWeight: '600' }}>R$ {totalItens.toFixed(2).replace('.', ',')}</span>
        </div>
        
        {valorDesconto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
            <span style={{ color: '#ef4444' }}>DESCONTO</span>
            <span style={{ fontWeight: '600', color: '#ef4444' }}>- R$ {valorDesconto.toFixed(2).replace('.', ',')}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
          <span style={{ color: '#10b981' }}>TOTAL PAGO</span>
          <span style={{ fontWeight: '600', color: '#10b981' }}>R$ {valorPagoTotal.toFixed(2).replace('.', ',')}</span>
        </div>

        {pagamentos.length > 0 && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
            <p style={{ fontSize: '10px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px', borderBottom: '1px solid rgba(21, 128, 61, 0.1)', paddingBottom: '3px' }}>
              Histórico de Pagamentos
            </p>
            {pagamentos.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#15803d', marginBottom: '2px' }}>
                <span>{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                <span style={{ fontWeight: '600' }}>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>SALDO DEVEDOR</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: saldoDevedor > 0 ? '#ef4444' : '#10b981' }}>
            R$ {saldoDevedor.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <div style={{ display: 'inline-block', padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
          Obrigado por comprar conosco!
        </div>
      </div>
    </div>
  );
});

ReceiptToImage.displayName = 'ReceiptToImage';

export default ReceiptToImage;
