import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Filter, X, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { generatePDF } from '../services/pdfService';

export default function Reports() {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // States for Sale Details and Partial Payments
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [salePayments, setSalePayments] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [partialPayment, setPartialPayment] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  useEffect(() => {
    fetchDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  async function fetchDados() {
    setLoading(true);

    // Buscar clientes para mapear nomes
    const { data: cData } = await supabase.from('clientes').select('id, nome, local');
    const cMap = {};
    if (cData) {
      cData.forEach(c => { cMap[c.id] = c; });
      setClientes(cMap);
    }

    // Buscar vendas no período
    const { data: vData, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('data', `${startDate}T00:00:00.000Z`)
      .lte('data', `${endDate}T23:59:59.999Z`)
      .order('data', { ascending: false });

    if (!error && vData) {
      setVendas(vData);
    }

    setLoading(false);
  };

  const handleStatusChange = async (vendaId, newStatus) => {
    const { error } = await supabase.from('vendas').update({ status: newStatus }).eq('id', vendaId);
    if (!error) {
      setVendas(vendas.map(v => v.id === vendaId ? { ...v, status: newStatus } : v));
    } else {
      alert('Erro ao atualizar status');
    }
  };

  const openSaleDetail = async (sale) => {
    setSelectedSaleDetail(sale);
    setPartialPayment('');
    setLoadingItems(true);
    setSalePayments([]);

    const { data, error } = await supabase
      .from('itens_venda')
      .select('quantidade, valor, produtos(nome)')
      .eq('venda_id', sale.id);

    if (!error && data) {
      const formattedItems = data.map(item => ({
        produto_nome: item.produtos?.nome || 'Produto Removido',
        quantidade: item.quantidade,
        valor: item.valor
      }));
      setSaleItems(formattedItems);
    }

    const { data: payData } = await supabase
      .from('pagamentos')
      .select('valor, data')
      .eq('venda_id', sale.id)
      .order('data', { ascending: true });

    if (payData) {
      setSalePayments(payData);
    }

    setLoadingItems(false);
  };

  const closeSaleDetail = () => {
    setSelectedSaleDetail(null);
    setSaleItems([]);
    setSalePayments([]);
    setPartialPayment('');
  };

  const handleGeneratePDF = () => {
    if (!selectedSaleDetail) return;
    const cliente = clientes[selectedSaleDetail.cliente_id];

    const originalTotal = saleItems.reduce((acc, item) => acc + (item.quantidade * item.valor), 0);

    const vendaMock = {
      id: selectedSaleDetail.id,
      total: selectedSaleDetail.total, // Saldo Devedor
      originalTotal: originalTotal, // Total da compra original
      status: selectedSaleDetail.status,
      data: selectedSaleDetail.data,
      pagamentos: salePayments
    };

    generatePDF(vendaMock, cliente, saleItems);
  };

  const handlePartialPayment = async () => {
    if (!partialPayment || isNaN(partialPayment) || Number(partialPayment) <= 0) {
      alert('Digite um valor válido.');
      return;
    }

    const paymentValue = Number(partialPayment);
    const currentTotal = Number(selectedSaleDetail.total);
    const newTotal = currentTotal - paymentValue;

    let newStatus = selectedSaleDetail.status;
    if (newTotal <= 0) {
      newStatus = 'Pago';
    } else if (newStatus === 'Pendente' || newStatus === 'Parcial') {
      newStatus = 'Parcial';
    }

    setIsUpdatingPayment(true);

    const { error } = await supabase
      .from('vendas')
      .update({ total: newTotal < 0 ? 0 : newTotal, status: newStatus })
      .eq('id', selectedSaleDetail.id);

    if (!error) {
      // Registrar no histórico de pagamentos
      await supabase.from('pagamentos').insert({ venda_id: selectedSaleDetail.id, valor: paymentValue });

      const newPayData = [...salePayments, { valor: paymentValue, data: new Date().toISOString() }];
      setSalePayments(newPayData);

      setVendas(vendas.map(v => v.id === selectedSaleDetail.id ? { ...v, total: newTotal < 0 ? 0 : newTotal, status: newStatus } : v));
      setSelectedSaleDetail({ ...selectedSaleDetail, total: newTotal < 0 ? 0 : newTotal, status: newStatus });
      setPartialPayment('');
      alert('Pagamento descontado com sucesso!');
    } else {
      alert('Erro ao registrar pagamento.');
    }

    setIsUpdatingPayment(false);
  };

  const filteredVendas = vendas.filter(v => {
    const cliente = clientes[v.cliente_id];
    const matchName = cliente ? cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchLocal = cliente && cliente.local ? cliente.local.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchSearch = matchName || matchLocal;

    const matchStatus = statusFilter === 'Todos' || v.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalPeriodo = filteredVendas.reduce((acc, v) => acc + Number(v.total), 0);
  const totalPendente = filteredVendas.filter(v => v.status === 'Pendente').reduce((acc, v) => acc + Number(v.total), 0);

  return (
    <div style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={20} /> Filtros
        </h2>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Data Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Data Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label>Buscar Cliente ou Local</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Digite o nome ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Pendente">Pendentes</option>
            <option value="Pago">Pagos</option>
            <option value="Parcial">Parciais</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Total no Período</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>R$ {totalPeriodo.toFixed(2)}</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--danger)', color: 'white', border: 'none' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Pendentes</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>R$ {totalPendente.toFixed(2)}</div>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Histórico de Vendas</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : filteredVendas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma venda encontrada para os filtros aplicados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredVendas.map(venda => (
            <div key={venda.id} className="card" onClick={() => openSaleDetail(venda)} style={{ padding: '12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ fontWeight: '600', fontSize: '15px' }}>
                    {clientes[venda.cliente_id]?.nome || 'Cliente Removido'}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(venda.data).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)' }}>
                  R$ {Number(venda.total).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <span className={`badge badge-${venda.status.toLowerCase()}`}>
                  {venda.status}
                </span>

                <select
                  value={venda.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleStatusChange(venda.id, e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontSize: '12px'
                  }}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Pago">Pago</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px' }}>Detalhes e Pagamento</h2>
              <button onClick={closeSaleDetail} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Data: {new Date(selectedSaleDetail.data).toLocaleDateString('pt-BR')}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Cliente: {clientes[selectedSaleDetail.cliente_id]?.nome || 'Desconhecido'}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
                  Saldo Devedor: R$ {Number(selectedSaleDetail.total).toFixed(2).replace('.', ',')}
                </div>
                <div style={{ marginTop: '8px' }}><span className={`badge badge-${selectedSaleDetail.status.toLowerCase()}`}>{selectedSaleDetail.status}</span></div>
              </div>

              {selectedSaleDetail.status !== 'Pago' && Number(selectedSaleDetail.total) > 0 && (
                <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-main)', fontWeight: '600' }}>Registrar Pagamento Parcial</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ flex: 4, marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>Valor Pago (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={partialPayment}
                        onChange={(e) => setPartialPayment(e.target.value)}
                        placeholder="Ex: 50.00"
                        style={{ padding: '12px 16px', fontSize: '18px', width: '100%' }}
                      />
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={handlePartialPayment}
                      disabled={isUpdatingPayment || !partialPayment}
                      style={{ flex: 1, padding: '8px 4px', height: '48px', fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isUpdatingPayment ? '...' : 'Descontar'}
                    </button>
                  </div>
                </div>
              )}

              {salePayments.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-muted)' }}>Histórico de Pagamentos</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {salePayments.map((pay, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(pay.data).toLocaleString('pt-BR')}</div>
                        <div style={{ fontWeight: '600', color: 'var(--success)' }}>R$ {Number(pay.valor).toFixed(2).replace('.', ',')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-muted)' }}>Itens Comprados</h3>

              {loadingItems ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando itens...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {saleItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{item.produto_nome}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.quantidade}x R$ {Number(item.valor).toFixed(2).replace('.', ',')}</div>
                      </div>
                      <div style={{ fontWeight: '600' }}>R$ {(item.quantidade * item.valor).toFixed(2).replace('.', ',')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={loadingItems} style={{ width: '100%' }}>
                <Download size={18} />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
