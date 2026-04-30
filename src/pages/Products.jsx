import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Search, Plus, Edit2, Trash2, X, Image as ImageIcon, Upload, Camera } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', valor: '', fabricante: 'Natu', imagem: '' });
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
        fabricante: product.fabricante || 'Natu', 
        imagem: product.imagem || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', valor: '', fabricante: 'Natu', imagem: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ nome: '', valor: '', fabricante: 'Natu', imagem: '' });
    setEditingId(null);
  };

  const processAndUploadImage = async (file) => {
    if (!file) return;
    try {
      setUploadingImage(true);

      // Redimensiona para 700x933 e converte para WebP
      const webpBlob = await resizeToWebP(file, 700, 933);
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, webpBlob, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('produtos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, imagem: data.publicUrl }));
    } catch (error) {
      alert('Erro ao fazer upload da imagem. O bucket "produtos" foi criado e é público?');
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const resizeToWebP = (file, targetW, targetH) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);

        // Centraliza mantendo proporção (cover)
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (targetW - drawW) / 2;
        const offsetY = (targetH - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Conversão falhou')), 'image/webp', 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleImageUpload = (e) => processAndUploadImage(e.target.files[0]);

  // Abre a câmera nativa via @capacitor/camera
  const handleCameraCapture = async () => {
    if (uploadingImage) return;

    try {
      // Se não for nativo (ex: testando no navegador), tenta o input de arquivo com capture
      if (!Capacitor.isNativePlatform()) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = (e) => processAndUploadImage(e.target.files[0]);
        input.click();
        return;
      }

      // No Android Nativo
      await CapCamera.requestPermissions();
      
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
        saveToGallery: false,
      });

      if (photo && photo.base64String) {
        const base64 = photo.base64String;
        const mimeType = `image/${photo.format}`;
        const byteChars = atob(base64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNums);
        const blob = new Blob([byteArray], { type: mimeType });
        await processAndUploadImage(blob);
      }
    } catch (err) {
      if (err?.message !== 'User cancelled photos app' && err?.message !== 'User cancelled photo selection') {
        console.error('Erro ao abrir câmera:', err);
        alert('Erro ao abrir câmera: ' + (err.message || 'Verifique as permissões.'));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dataToSave = {
      nome: formData.nome,
      valor: parseFloat(formData.valor) || 0,
      fabricante: formData.fabricante || 'Natu',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {filteredProducts.map(product => (
            <div key={product.id} className="card" style={{ padding: '8px', display: 'flex', flexDirection: 'column' }}>
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
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  background: product.fabricante === 'Solar' ? 'rgba(245, 158, 11, 0.15)' : product.fabricante === 'Ambos' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: product.fabricante === 'Solar' ? '#b45309' : product.fabricante === 'Ambos' ? 'var(--primary)' : 'var(--secondary)'
                }}>
                  {product.fabricante || 'Natu'}
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{ flex: 1 }}
                  >
                    <Upload size={18} />
                    {uploadingImage ? 'Enviando...' : 'Galeria'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCameraCapture}
                    disabled={uploadingImage}
                    style={{ flex: 1 }}
                  >
                    <Camera size={18} />
                    {uploadingImage ? 'Enviando...' : 'Câmera'}
                  </button>
                </div>
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
                  <label>Fabricante</label>
                  <select name="fabricante" value={formData.fabricante} onChange={handleInputChange}>
                    <option value="Natu">Natu</option>
                    <option value="Solar">Solar</option>
                    <option value="Ambos">Ambos</option>
                  </select>
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
