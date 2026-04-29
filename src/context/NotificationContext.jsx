import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // Lembretes de retorno (30 dias atrás)
      const trintaDiasAtrasInicio = new Date(hoje);
      trintaDiasAtrasInicio.setDate(trintaDiasAtrasInicio.getDate() - 30);
      trintaDiasAtrasInicio.setHours(0, 0, 0, 0);
      
      const trintaDiasAtrasFim = new Date(trintaDiasAtrasInicio);
      trintaDiasAtrasFim.setHours(23, 59, 59, 999);
      
      const { data: retornosData } = await supabase
        .from('vendas')
        .select('id, data, total, status, clientes(nome, telefone, local)')
        .gte('data', trintaDiasAtrasInicio.toISOString())
        .lte('data', trintaDiasAtrasFim.toISOString())
        .gt('total', 0);

      // Vendas pendentes com mais de 7 dias (exemplo de outra notificação)
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      
      const { data: pendentesData } = await supabase
        .from('vendas')
        .select('id, data, total, status, clientes(nome)')
        .in('status', ['Pendente', 'Parcial'])
        .lte('data', seteDiasAtras.toISOString())
        .gt('total', 0);

      const allNotifications = [
        ...(retornosData || []).map(v => ({
          id: `retorno-${v.id}`,
          type: 'retorno',
          title: 'Lembrete de Retorno',
          message: `O cliente ${v.clientes?.nome} comprou há 30 dias.`,
          data: v.data,
          vendaId: v.id,
          cliente: v.clientes
        })),
        ...(pendentesData || []).map(v => ({
          id: `pendente-${v.id}`,
          type: 'pendente',
          title: 'Cobrança Pendente',
          message: `A venda de ${v.clientes?.nome} (R$ ${Number(v.total).toFixed(2)}) está pendente há mais de 7 dias.`,
          data: v.data,
          vendaId: v.id,
          total: v.total
        }))
      ];

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Atualizar a cada hora
    const interval = setInterval(fetchNotifications, 3600000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, fetchNotifications, loading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
