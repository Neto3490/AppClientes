import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, X, FileText, Calendar, Download } from 'lucide-react';
import { generatePDF } from '../services/pdfService';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', local: '', telefone: '' });

  // History state
  const [selectedClientHistory, setSelectedClientHistory] = useState(null);
  const [clientSales, setClientSales] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sale detail state
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });
      
    if (error) console.error('Erro ao buscar clientes:', error);
    else setClients(data || []);
    setLoading(false);
  };

  const handleMaskPhone = (value) => {
    return value
      .replace(/\\D/g, '')
      .replace(/(\\d{2})(\\d)/, '($1) $2')
      .replace(/(\\d{4,5})(\\d{4})/, '$1-$2')
      .slice(0, 15);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'telefone' ? handleMaskPhone(value) : value
    });
  };

  const openModal = (client = null) => {
    if (client) {
      setEditingId(client.id);
      setFormData({ nome: client.nome, local: client.local || '', telefone: client.telefone || '' });
    } else {
      setEditingId(null);
      setFormData({ nome: '', local: '', telefone: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ nome: '', local: '', telefone: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from('clientes').update(formData).eq('id', editingId);
      if (error) alert('Erro ao atualizar cliente');
    } else {
      const { error } = await supabase.from('clientes').insert([formData]);
      if (error) alert('Erro ao salvar cliente');
    }
    closeModal();
    fetchClients();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) alert('Erro ao excluir cliente');
      else fetchClients();
    }
  };

  const openHistory = async (client) => {
    setSelectedClientHistory(client);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('cliente_id', client.id)
      .order('data', { ascending: false });
      
    if (!error) setClientSales(data || []);
    setLoadingHistory(false);
  };

  const closeHistory = () => {
    setSelectedClientHistory(null);
    setClientSales([]);
  };

  const openSaleDetail = async (sale) => {
    setSelectedSaleDetail(sale);
    setLoadingItems(true);
    
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
    setLoadingItems(false);
  };

  const closeSaleDetail = () => {
    setSelectedSaleDetail(null);
    setSaleItems([]);
  };

  const handleGeneratePDF = () => {
    if (!selectedClientHistory || !selectedSaleDetail) return;
    
    const vendaMock = {
      id: selectedSaleDetail.id,
      total: selectedSaleDetail.total,
      status: selectedSaleDetail.status,
      data: selectedSaleDetail.data
    };
    
    generatePDF(vendaMock, selectedClientHistory, saleItems);
  };

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 40px', 
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>
        <button 
          onClick={() => openModal()}
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 'var(--radius-full)',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Plus size={24} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredClients.map(client => (
            <div key={client.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{client.nome}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {client.local && <span>📍 {client.local}</span>}
                  {client.telefone && <span>📞 {client.telefone}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openHistory(client)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '8px' }}>
                  <FileText size={18} />
                </button>
                <button onClick={() => openModal(client)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px' }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(client.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px' }}>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
              <div className="input-group">
                <label>Nome do Cliente *</label>
                <input required type="text" name="nome" value={formData.nome} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label>Local / Bairro / Cidade</label>
                <input type="text" name="local" value={formData.local} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label>Telefone</label>
                <input type="tel" name="telefone" value={formData.telefone} onChange={handleInputChange} placeholder="(00) 00000-0000" />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={closeModal} className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedClientHistory && !selectedSaleDetail && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px' }}>Histórico: {selectedClientHistory.nome}</h2>
              <button onClick={closeHistory} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando histórico...</div>
              ) : clientSales.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma compra encontrada.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {clientSales.map(sale => (
                    <div key={sale.id} onClick={() => openSaleDetail(sale)} className="card" style={{ cursor: 'pointer', padding: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          <Calendar size={14} /> {new Date(sale.data).toLocaleDateString('pt-BR')}
                        </div>
                        <span className={`badge badge-${sale.status.toLowerCase()}`}>{sale.status}</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>
                        R$ {Number(sale.total).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
              <h2 style={{ fontSize: '18px' }}>Detalhes da Compra</h2>
              <button onClick={closeSaleDetail} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Data: {new Date(selectedSaleDetail.data).toLocaleDateString('pt-BR')}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>Total: R$ {Number(selectedSaleDetail.total).toFixed(2).replace('.', ',')}</div>
                <div style={{ marginTop: '8px' }}><span className={`badge badge-${selectedSaleDetail.status.toLowerCase()}`}>{selectedSaleDetail.status}</span></div>
              </div>

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
