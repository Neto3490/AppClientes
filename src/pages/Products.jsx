import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, X, Image as ImageIcon, Upload } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', valor: '', estoque: '', imagem: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true });
      
    if (error) console.error('Erro ao buscar produtos:', error);
    else setProducts(data || []);
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ 
        nome: product.nome, 
        valor: product.valor, 
        estoque: product.estoque || '', 
        imagem: product.imagem || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', valor: '', estoque: '', imagem: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ nome: '', valor: '', estoque: '', imagem: '' });
    setEditingId(null);
  };

  const handleImageUpload = async (e) => {
    try {
      setUploadingImage(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
      
      setFormData({ ...formData, imagem: data.publicUrl });
    } catch (error) {
      alert('Erro ao fazer upload da imagem. O bucket "produtos" foi criado e é público?');
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dataToSave = {
      nome: formData.nome,
      valor: parseFloat(formData.valor) || 0,
      estoque: parseInt(formData.estoque) || 0,
      imagem: formData.imagem
    };

    if (editingId) {
      const { error } = await supabase.from('produtos').update(dataToSave).eq('id', editingId);
      if (error) alert('Erro ao atualizar produto');
    } else {
      const { error } = await supabase.from('produtos').insert([dataToSave]);
      if (error) alert('Erro ao salvar produto');
    }
    closeModal();
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) alert('Erro ao excluir produto');
      else fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar produto..."
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
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {filteredProducts.map(product => (
            <div key={product.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                width: '100%', 
                height: '120px', 
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {product.imagem ? (
                  <img src={product.imagem} alt={product.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={32} color="var(--border)" />
                )}
              </div>
              
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {product.nome}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '15px' }}>
                  R$ {Number(product.valor).toFixed(2).replace('.', ',')}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {product.estoque || 0} em est.
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <button onClick={() => openModal(product)} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                  <Edit2 size={16} color="var(--text-main)" />
                </button>
                <button onClick={() => handleDelete(product.id)} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                  <Trash2 size={16} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}>
              <h2 style={{ fontSize: '18px' }}>{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ 
                  width: '120px', height: '120px', borderRadius: 'var(--radius-md)', 
                  border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', overflow: 'hidden', marginBottom: '12px',
                  backgroundColor: 'var(--background)'
                }}>
                  {formData.imagem ? (
                    <img src={formData.imagem} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="var(--border)" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Upload size={18} />
                  {uploadingImage ? 'Enviando...' : 'Escolher Imagem'}
                </button>
              </div>

              <div className="input-group">
                <label>Nome do Produto *</label>
                <input required type="text" name="nome" value={formData.nome} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Valor (R$) *</label>
                  <input required type="number" step="0.01" name="valor" value={formData.valor} onChange={handleInputChange} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Estoque</label>
                  <input type="number" name="estoque" value={formData.estoque} onChange={handleInputChange} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={closeModal} className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
