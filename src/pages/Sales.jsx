import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, FileText, MessageCircle, Image, Search, X } from 'lucide-react';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { generatePDF } from '../services/pdfService';
import { shareReceiptImage } from '../services/imageService';
import { scheduleReturnNotification } from '../services/notificationService';
import ReceiptToImage from '../components/ReceiptToImage';

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [status, setStatus] = useState('Pendente');
  const [cart, setCart] = useState([]);
  const [desconto, setDesconto] = useState('');
  
  const receiptRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [savedVendaId, setSavedVendaId] = useState(null);
  const [editingVendaId, setEditingVendaId] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [fabricanteFilter, setFabricanteFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.editVendaId && produtos.length > 0 && clientes.length > 0) {
      loadSaleForEditing(location.state.editVendaId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, produtos, clientes]);

  async function loadSaleForEditing(vendaId) {
    setEditingVendaId(vendaId);
    setLoading(true);
    
    const { data: vendaData } = await supabase.from('vendas').select('*').eq('id', vendaId).single();
    if (vendaData) {
      setSelectedCliente(vendaData.cliente_id);
      setStatus(vendaData.status);
      setDesconto(vendaData.desconto || '');
    }

    const { data: itensData } = await supabase
      .from('itens_venda')
      .select('produto_id, quantidade, valor, produtos(nome, imagem)')
      .eq('venda_id', vendaId);

    if (itensData) {
      setCart(itensData.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produtos?.nome,
        valor: item.valor,
        imagem: item.produtos?.imagem,
        quantidade: item.quantidade
      })));
    }
    setLoading(false);
  }

  async function fetchData() {
    const { data: cData } = await supabase.from('clientes').select('*').order('nome');
    const { data: pData } = await supabase.from('produtos').select('*').order('nome');
    
    if (cData) setClientes(cData);
    if (pData) setProdutos(pData);
  };

  const handleAddToCart = (produtoId) => {
    if (savedVendaId) return;
    
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.produto_id === produtoId);
      
      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantidade: newCart[existingItemIndex].quantidade + 1
        };
        return newCart;
      } else {
        return [...prevCart, {
          produto_id: produto.id,
          produto_nome: produto.nome,
          valor: produto.valor,
          imagem: produto.imagem,
          quantidade: 1
        }];
      }
    });
  };

  const removeFromCart = (index) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const parseValue = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const parsed = Number(String(val).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const updateQuantity = (index, delta) => {
    if (savedVendaId) return;
    setCart(prevCart => {
      const newCart = [...prevCart];
      const newQuantity = Number(newCart[index].quantidade) + Number(delta);
      if (newQuantity > 0) {
        newCart[index] = { ...newCart[index], quantidade: newQuantity };
        return newCart;
      }
      return prevCart;
    });
  };

  const totalGeral = cart.reduce((acc, item) => acc + (parseValue(item.valor) * Number(item.quantidade)), 0);

  const handleSave = async () => {
    if (!selectedCliente) return alert('Selecione um cliente.');
    if (cart.length === 0) return alert('Adicione produtos ao pedido.');
    
    setLoading(true);
    try {
      let currentVendaId = editingVendaId;
      
      const totalVenda = totalGeral - Number(desconto || 0);
      const isPago = status === 'Pago';
      const balance = isPago ? 0 : totalVenda;

      if (editingVendaId) {
        const { error: vendaError } = await supabase
          .from('vendas')
          .update({
            cliente_id: selectedCliente,
            total: balance,
            desconto: Number(desconto || 0),
            status: status
          })
          .eq('id', editingVendaId);
          
        if (vendaError) throw vendaError;
        
        await supabase.from('itens_venda').delete().eq('venda_id', editingVendaId);
      } else {
        const { data: vendaData, error: vendaError } = await supabase
          .from('vendas')
          .insert([{
            cliente_id: selectedCliente,
            total: balance,
            desconto: Number(desconto || 0),
            status: status
          }])
          .select()
          .single();
          
        if (vendaError) throw vendaError;
        currentVendaId = vendaData.id;
      }

      // Registrar o pagamento se for marcado como Pago
      if (isPago) {
        await supabase.from('pagamentos').insert({
          venda_id: currentVendaId,
          valor: totalVenda,
          data: new Date().toISOString()
        });
      }
      
      const itensToInsert = cart.map(item => ({
        venda_id: currentVendaId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor: item.valor
      }));
      
      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensToInsert);
        
      if (itensError) throw itensError;
      
      setSavedVendaId(currentVendaId);
      
      if (!editingVendaId) {
        const cliente = clientes.find(c => c.id === selectedCliente);
        if (cliente) {
          scheduleReturnNotification(currentVendaId, cliente.nome);
        }
      }
      
      alert(editingVendaId ? 'Venda atualizada com sucesso!' : 'Venda salva com sucesso!');
      
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar a venda.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCliente('');
    setCart([]);
    setStatus('Pendente');
    setDesconto('');
    setSavedVendaId(null);
    setEditingVendaId(null);
  };

  const handlePDF = () => {
    const cliente = clientes.find(c => c.id === selectedCliente);
    if (!cliente) return;
    
    const vendaMock = {
      id: savedVendaId,
      total: totalGeral,
      status: status,
      data: new Date()
    };
    
    generatePDF(vendaMock, cliente, cart);
  };

  const handleWhatsApp = () => {
    const cliente = clientes.find(c => c.id === selectedCliente);
    if (!cliente) return;
    
    const vendaMock = {
      total: totalGeral,
      status: status,
      data: new Date()
    };
    
    sendWhatsAppMessage(cliente.telefone, vendaMock, cliente, cart);
  };

  const handleShareImage = async () => {
    if (!receiptRef.current) return;
    setIsSharing(true);
    try {
      const fileName = `Comprovante_${clientes.find(c => c.id === selectedCliente)?.nome.split(' ')[0] || 'Venda'}.png`;
      await shareReceiptImage(receiptRef.current, fileName);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div style={{ padding: '16px 0', paddingBottom: '80px' }}>
      {/* Elemento oculto para captura de imagem */}
      <ReceiptToImage 
        ref={receiptRef}
        venda={{ 
          id: savedVendaId, 
          status: status, 
          data: new Date(), 
          desconto: Number(desconto || 0) 
        }}
        cliente={clientes.find(c => c.id === selectedCliente)}
        itens={cart}
        pagamentos={status === 'Pago' ? [{ valor: totalGeral - Number(desconto || 0), data: new Date().toISOString() }] : []}
      />

      <div className="card" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Nova Venda</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Cliente *</label>
          
          {selectedCliente ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.05)' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px', color: 'var(--primary)' }}>
                  {clientes.find(c => c.id === selectedCliente)?.nome}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {clientes.find(c => c.id === selectedCliente)?.local || 'Sem local'}
                </div>
              </div>
              {!savedVendaId && (
                <button 
                  onClick={() => setSelectedCliente('')} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsClientModalOpen(true)}
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Search size={18} />
              Selecionar Cliente
            </button>
          )}
        </div>
        
        <div className="input-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={savedVendaId}>
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
          </select>
        </div>

        <div className="input-group">
          <label>Desconto (R$)</label>
          <input 
            type="number" 
            step="0.01" 
            value={desconto} 
            onChange={(e) => setDesconto(e.target.value)} 
            placeholder="0,00"
            disabled={savedVendaId}
          />
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Toque para Adicionar</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{produtos.length} itens</div>
        </div>

        {/* Fabricante Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 4px', marginBottom: '10px' }}>
          {['Todos', 'Natu', 'Solar'].map(fab => (
            <button
              key={fab}
              onClick={() => setFabricanteFilter(fab)}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: fabricanteFilter === fab ? 'var(--primary)' : 'var(--border)',
                background: fabricanteFilter === fab ? 'var(--primary)' : 'var(--surface)',
                color: fabricanteFilter === fab ? 'white' : 'var(--text-muted)',
              }}
            >
              {fab}
            </button>
          ))}
        </div>

        {/* Product Search Bar */}
        <div style={{ padding: '0 4px', marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px 8px 36px', 
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '13px'
              }}
              id="productSearch"
            />
          </div>
        </div>
        
        {/* Scrollable Product Grid */}
        <div className="product-grid-scroll" style={{ 
          maxHeight: '340px', 
          overflowY: 'auto', 
          padding: '4px',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '10px'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '10px', 
          }}>
            {produtos
              .filter(p => {
                const matchSearch = p.nome.toLowerCase().includes(productSearchTerm.toLowerCase());
                const matchFab = fabricanteFilter === 'Todos'
                  ? true
                  : p.fabricante === fabricanteFilter || p.fabricante === 'Ambos';
                return matchSearch && matchFab;
              })
              .map(p => (
              <div 
                key={p.id} 
                onClick={() => handleAddToCart(p.id)} 
                className="card product-card-hover"
                style={{ 
                  padding: '10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  height: '100%',
                  transition: 'transform 0.1s',
                  position: 'relative'
                }}
              >
                <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px', background: 'var(--background)', marginBottom: '8px', overflow: 'hidden' }}>
                  {p.imagem ? (
                    <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                       <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sem Img</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{p.nome}</div>
                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', marginTop: '2px' }}>R$ {parseValue(p.valor).toFixed(2).replace('.', ',')}</div>
                
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Carrinho ({cart.length})</h3>
        
        {cart.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '10px' }}>Nenhum produto adicionado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cart.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--background)', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.05)' }}>
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.produto_nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sem Img</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{item.produto_nome}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--background)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <button onClick={() => updateQuantity(index, -1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-main)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>-</button>
                        <span style={{ fontWeight: '600', fontSize: '14px', minWidth: '16px', textAlign: 'center', color: 'var(--text-main)' }}>{item.quantidade}</span>
                        <button onClick={() => updateQuantity(index, 1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-main)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+</button>
                      </div>
                      <div>
                        R$ {parseValue(item.valor).toFixed(2).replace('.', ',')} = <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>R$ {(Number(item.quantidade) * parseValue(item.valor)).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontWeight: 'bold', fontSize: '18px' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--primary)' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!savedVendaId ? (
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || cart.length === 0 || !selectedCliente}>
            <Save size={18} />
            {loading ? 'Salvando...' : (editingVendaId ? 'Atualizar Venda' : 'Salvar Venda')}
          </button>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--secondary)', fontWeight: 'bold' }}>
              Venda salva com sucesso!
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={handlePDF}>
                <FileText size={18} />
                PDF
              </button>
              <button className="btn" style={{ background: '#25D366', color: 'white', border: 'none' }} onClick={handleWhatsApp}>
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button 
                className="btn" 
                style={{ gridColumn: 'span 2', background: 'var(--surface)', border: '1px solid var(--primary)', color: 'var(--primary)' }} 
                onClick={handleShareImage}
                disabled={isSharing}
              >
                <Image size={18} />
                {isSharing ? 'Gerando Imagem...' : 'Compartilhar Imagem'}
              </button>
            </div>
            
            <button className="btn" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', marginTop: '8px' }} onClick={resetForm}>
              Nova Venda
            </button>
          </>
        )}
      </div>

      {/* Client Selection Modal */}
      {isClientModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px' }}>Selecione o Cliente</h2>
              <button onClick={() => setIsClientModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 10px 10px 36px', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clientes
                .filter(c => c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                .map(client => (
                  <div 
                    key={client.id} 
                    onClick={() => { 
                      setSelectedCliente(client.id); 
                      setClientSearchTerm(''); 
                      setIsClientModalOpen(false); 
                    }}
                    className="card" 
                    style={{ padding: '12px', cursor: 'pointer', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{client.nome}</div>
                      {client.local && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>📍 {client.local}</div>}
                    </div>
                  </div>
                ))}
              {clientes.filter(c => c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                 <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Nenhum cliente encontrado</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
