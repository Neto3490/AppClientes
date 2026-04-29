import React, { useState } from 'react';
import { Bell, X, MessageCircle, Clock, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleOpen = () => {
    if (!isOpen) {
      markAsRead();
    }
    setIsOpen(!isOpen);
  };

  const handleZapRetorno = (telefone, nome) => {
    const msg = `Olá ${nome}! Tudo bem? Passando para saber se seus produtos da RSN CLEAN estão acabando e se precisa de algo novo hoje. 😊`;
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={toggleOpen}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          cursor: 'pointer', 
          color: 'var(--text-main)', 
          position: 'relative',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'var(--danger)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'transparent',
              zIndex: 999
            }}
          />
          <div style={{
            position: 'absolute',
            top: '45px',
            right: '-10px',
            width: '320px',
            maxHeight: '450px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)'
          }}>
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'var(--surface)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Notificações</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px' }}>Nenhuma notificação no momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/reports', { state: { openVendaId: n.vendaId } });
                      }}
                      style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        background: n.type === 'retorno' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                        border: `1px solid ${n.type === 'retorno' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
                        transition: 'transform 0.1s'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: n.type === 'retorno' ? 'var(--primary)' : 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {n.type === 'retorno' ? <Clock size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>{n.title}</div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: '1.4' }}>{n.message}</p>
                          
                          {n.type === 'retorno' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleZapRetorno(n.cliente?.telefone, n.cliente?.nome); }}
                              style={{ 
                                background: '#25D366', 
                                color: 'white', 
                                border: 'none', 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                fontWeight: '600',
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                cursor: 'pointer' 
                              }}
                            >
                              <MessageCircle size={14} /> Chamar no WhatsApp
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div style={{ padding: '12px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--background)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Você tem {notifications.length} avisos importantes</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
