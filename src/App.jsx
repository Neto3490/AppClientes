import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Sales from './pages/Sales';

// Detectar se estamos no Electron
const isElectron = !!(window.electronAPI?.isElectron);

function App() {
  // Electron usa HashRouter (file:// não suporta history API)
  // Mobile/Web usa BrowserRouter
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        <Route element={<Layout title="Vendas" />}>
          <Route path="/" element={<Sales />} />
          <Route path="/sales" element={<Navigate to="/" replace />} />
        </Route>

        {/* Redirecionar qualquer outra rota para o início */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
