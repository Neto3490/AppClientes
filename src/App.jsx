import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
