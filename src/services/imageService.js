import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const shareReceiptImage = async (element, fileName = 'comprovante.png') => {
  if (!element) {
    console.error('Elemento para captura não encontrado');
    return;
  }

  try {
    // 1. Capturar o elemento como canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Melhor qualidade
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    // 2. Converter para Base64
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];

    if (Capacitor.isNativePlatform()) {
      // 3. Salvar no sistema de arquivos do dispositivo (Cache)
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // 4. Abrir o menu de compartilhamento
      await Share.share({
        title: 'Comprovante de Venda',
        text: 'Segue o comprovante da sua compra na RSN CLEAN.',
        url: savedFile.uri,
        dialogTitle: 'Compartilhar Comprovante'
      });
    } else {
      // No navegador, fazer download da imagem como fallback
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    }
  } catch (error) {
    console.error('Erro ao compartilhar imagem:', error);
    alert('Não foi possível gerar ou compartilhar a imagem do comprovante.');
  }
};
