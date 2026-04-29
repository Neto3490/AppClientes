import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  
  const status = await LocalNotifications.checkPermissions();
  if (status.display === 'granted') return true;
  
  const request = await LocalNotifications.requestPermissions();
  return request.display === 'granted';
};

/**
 * Gera um ID numérico determinístico a partir de uma string (UUID da venda)
 */
const getNumericId = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Agendar uma notificação de retorno para o cliente
 * @param {string} vendaId - ID da venda
 * @param {string} clienteNome - Nome do cliente
 * @param {number} dias - Quantidade de dias para o aviso (padrão 30)
 */
export const scheduleReturnNotification = async (vendaId, clienteNome, dias = 30) => {
  if (!Capacitor.isNativePlatform()) {
    console.log(`[Simulação] Notificação agendada para ${clienteNome} em ${dias} dias.`);
    return;
  }

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('Permissão de notificação negada.');
      return;
    }

    // Calcular data: 30 dias a partir de agora
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + dias);
    // Definir um horário padrão para o aviso (ex: 10:00 da manhã)
    scheduleDate.setHours(10, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Lembrete de Retorno 🛍️',
          body: `O cliente ${clienteNome} comprou há ${dias} dias. Que tal oferecer uma reposição?`,
          id: getNumericId(vendaId), // ID determinístico
          schedule: { at: scheduleDate },
          extra: { vendaId },
          smallIcon: 'ic_stat_name', 
          actionTypeId: '',
        }
      ]
    });

    console.log(`Notificação agendada com sucesso para ${scheduleDate.toLocaleString()}`);
  } catch (error) {
    console.error('Erro ao agendar notificação:', error);
  }
};

/**
 * Cancela uma notificação agendada para uma venda
 * @param {string} vendaId 
 */
export const cancelNotification = async (vendaId) => {
  if (!Capacitor.isNativePlatform() || !vendaId) return;
  
  try {
    const id = getNumericId(vendaId);
    await LocalNotifications.cancel({ notifications: [{ id }] });
    console.log(`Notificação ${id} cancelada para venda ${vendaId}`);
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
};
