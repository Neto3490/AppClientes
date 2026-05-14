import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, FileText, MessageCircle, Image, Search, X, ShoppingCart, Check, Settings } from 'lucide-react';

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [cart, setCart] = useState([]);
  
  const receiptRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [savedVendaId, setSavedVendaId] = useState(null);
  const [editingVendaId, setEditingVendaId] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [fabricanteFilter, setFabricanteFilter] = useState('Todos');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  
  

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (produtos.length > 0) {
      if (location.state?.editVendaId) {
        loadSaleForEditing(location.state.editVendaId);
        navigate(location.pathname, { replace: true, state: {} });
      } else if (location.state?.selectedClientId) {
        // Fallback para quando o ID do cliente é passado, embora agora usemos nome
        setSelectedCliente(location.state.selectedClientId);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, produtos]);

  async function loadSaleForEditing(vendaId) {
    setEditingVendaId(vendaId);
    setLoading(true);
    
    const { data: vendaData } = await supabase.from('vendas').select('*, clientes(nome)').eq('id', vendaId).single();
    if (vendaData) {
      setSelectedCliente(vendaData.clientes?.nome || '');
      setStatus(vendaData.status);
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
    const { data: pData } = await supabase.from('produtos').select('*').order('nome');
    if (pData) setProdutos(pData);
  }

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
    if (!selectedCliente) return alert('Digite o nome do cliente.');
    if (cart.length === 0) return alert('Adicione produtos ao pedido.');
    
    setLoading(true);
    try {
      // 1. Montar a mensagem do WhatsApp
      let texto = `*NOVO PEDIDO*\n\n`;
      texto += `*Cliente:* ${selectedCliente}\n`;
      texto += `*Data:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;

      texto += `*Itens do Pedido:*\n`;
      cart.forEach(item => {
        texto += `- ${item.quantidade}x ${item.produto_nome} = R$ ${(Number(item.quantidade) * parseValue(item.valor)).toFixed(2).replace('.', ',')}\n`;
      });

      texto += `\n*Total:* R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

      const encodedText = encodeURIComponent(texto);
      const url = `https://wa.me/5571982983908?text=${encodedText}`;

      // 2. Abrir o WhatsApp direto
      window.open(url, '_blank');
      
      // 3. Feedback e Reset
      alert('Mensagem enviada com sucesso!');
      resetForm();
      setIsCartModalOpen(false);
      
    } catch (error) {
      console.error(error);
      alert('Erro ao processar o pedido.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCliente('');
    setCart([]);
    setStatus('Pendente');
    setSavedVendaId(null);
    setEditingVendaId(null);
  };

  const handleSendToWhatsApp = () => {
    let texto = `*NOVO PEDIDO*\n\n`;
    texto += `*Cliente:* ${selectedCliente}\n`;
    texto += `*Data:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;

    texto += `*Itens do Pedido:*\n`;
    cart.forEach(item => {
      texto += `- ${item.quantidade}x ${item.produto_nome} = R$ ${(Number(item.quantidade) * parseValue(item.valor)).toFixed(2).replace('.', ',')}\n`;
    });

    texto += `\n*Total:* R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

    const encodedText = encodeURIComponent(texto);
    const url = `https://wa.me/5571982983908?text=${encodedText}`;

    window.open(url, '_blank');
  };

  return (
    <div style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Nova Venda</h2>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Nome do Cliente *</label>
          <input 
            type="text"
            placeholder="Digite o nome..."
            value={selectedCliente}
            onChange={(e) => setSelectedCliente(e.target.value)}
            disabled={!!savedVendaId}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '16px'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Toque para Adicionar</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {produtos.filter(p => p.ativo === true).length} itens
            </div>
          </div>
        </div>

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
        
        <div className="product-grid-scroll" style={{ 
          maxHeight: 'calc(100vh - 300px)', 
          overflowY: 'auto', 
          padding: '4px',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {produtos
              .filter(p => {
                const matchSearch = p.nome.toLowerCase().includes(productSearchTerm.toLowerCase());
                const matchFab = fabricanteFilter === 'Todos' ? true : (p.fabricante === fabricanteFilter || p.fabricante === 'Ambos');
                const isAtivo = p.ativo === true;
                return matchSearch && matchFab && isAtivo;
              })
              .map(p => (
              <div 
                key={p.id} 
                onClick={() => handleAddToCart(p.id)} 
                className="card product-card-hover"
                style={{ 
                  padding: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer', 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  transition: 'transform 0.1s'
                }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--background)', overflow: 'hidden', flexShrink: 0 }}>
                  {p.imagem ? (
                    <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                       <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Sem Img</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{p.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.fabricante}</div>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '700' }}>R$ {parseValue(p.valor).toFixed(2).replace('.', ',')}</div>
                <Plus size={14} style={{ color: 'var(--primary)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setIsCartModalOpen(true)}
          style={{
            position: 'fixed', bottom: '90px', right: '20px', width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--primary)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, cursor: 'pointer'
          }}
        >
          <ShoppingCart size={28} />
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white',
            fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
          }}>
            {cart.reduce((sum, item) => sum + item.quantidade, 0)}
          </span>
        </button>
      )}

      {isCartModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', zIndex: 120,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ 
            width: '100%', maxWidth: '500px', padding: '0', maxHeight: '90vh', 
            display: 'flex', flexDirection: 'column', borderRadius: '24px 24px 0 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '18px' }}>Seu Carrinho</h2>
              </div>
              <button onClick={() => setIsCartModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: 'var(--background)', overflow: 'hidden' }}>
                      {item.imagem ? <img src={item.imagem} alt={item.produto_nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Img</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.produto_nome}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => updateQuantity(index, -1)} style={{ width: '24px', height: '24px' }}>-</button>
                        <span>{item.quantidade}</span>
                        <button onClick={() => updateQuantity(index, 1)} style={{ width: '24px', height: '24px' }}>+</button>
                        <span style={{ fontWeight: '600', color: 'var(--primary)', marginLeft: '8px' }}>R$ {(item.quantidade * item.valor).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)' }}><Trash2 size={18} /></button>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold', fontSize: '20px' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--primary)' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ width: '100%', height: '54px' }}>
                <MessageCircle size={20} /> {loading ? 'Enviando...' : 'Finalizar e Enviar WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
