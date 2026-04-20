import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, FileText, MessageCircle } from 'lucide-react';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { generatePDF } from '../services/pdfService';

export default function Sales() {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [cart, setCart] = useState([]);
  

  
  const [loading, setLoading] = useState(false);
  const [savedVendaId, setSavedVendaId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

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
      // Create venda
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert([{
          cliente_id: selectedCliente,
          total: totalGeral,
          status: status
        }])
        .select()
        .single();
        
      if (vendaError) throw vendaError;
      
      // Create itens
      const itensToInsert = cart.map(item => ({
        venda_id: vendaData.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor: item.valor
      }));
      
      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensToInsert);
        
      if (itensError) throw itensError;
      
      setSavedVendaId(vendaData.id);
      alert('Venda salva com sucesso!');
      
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
    setSavedVendaId(null);
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

  return (
    <div style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Nova Venda</h2>
        
        <div className="input-group">
          <label>Cliente *</label>
          <select value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)} required disabled={savedVendaId}>
            <option value="">Selecione o cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        
        <div className="input-group">
          <label>Status do Pagamento</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Pendente">Pendente</option>
            <option value="Parcial">Parcial</option>
            <option value="Pago">Pago</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: '600', padding: '0 4px' }}>Toque para Adicionar</h3>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '16px', paddingLeft: '4px', paddingRight: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {produtos.map(p => (
            <div key={p.id} onClick={() => handleAddToCart(p.id)} className="card" style={{ padding: '12px', minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--background)', marginBottom: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                {p.imagem ? (
                  <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                     <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem Img</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{p.nome}</div>
              <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', marginTop: '4px' }}>R$ {parseValue(p.valor).toFixed(2).replace('.', ',')}</div>
            </div>
          ))}
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
              <span style={{ color: 'var(--primary)' }}>R$ {totalGeral.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!savedVendaId ? (
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || cart.length === 0 || !selectedCliente}>
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Venda'}
          </button>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--secondary)', fontWeight: 'bold' }}>
              Venda salva com sucesso!
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handlePDF}>
                <FileText size={18} />
                PDF
              </button>
              <button className="btn" style={{ flex: 1, background: '#25D366', color: 'white', border: 'none' }} onClick={handleWhatsApp}>
                <MessageCircle size={18} />
                WhatsApp
              </button>
            </div>
            
            <button className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', marginTop: '8px' }} onClick={resetForm}>
              Nova Venda
            </button>
          </>
        )}
      </div>
    </div>
  );
}
