import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

function NotificationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupListener = async () => {
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const vendaId = notification.notification.extra?.vendaId;
        if (vendaId) {
          navigate('/reports', { state: { openVendaId: vendaId } });
        }
      });
    };

    setupListener();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <NotificationHandler />
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute><Layout title="Início" /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute><Layout title="Clientes" /></ProtectedRoute>}>
              <Route path="/clients" element={<Clients />} />
            </Route>
            
            <Route element={<ProtectedRoute><Layout title="Produtos" /></ProtectedRoute>}>
              <Route path="/products" element={<Products />} />
            </Route>
            
            <Route element={<ProtectedRoute><Layout title="Vendas" /></ProtectedRoute>}>
              <Route path="/sales" element={<Sales />} />
            </Route>
            
            <Route element={<ProtectedRoute><Layout title="Relatórios" /></ProtectedRoute>}>
              <Route path="/reports" element={<Reports />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
