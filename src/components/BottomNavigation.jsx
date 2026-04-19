import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingCart, FileText } from 'lucide-react';

export default function BottomNavigation() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <LayoutDashboard size={24} />
        <span>Início</span>
      </NavLink>
      
      <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ShoppingCart size={24} />
        <span>Vender</span>
      </NavLink>
      
      <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Users size={24} />
        <span>Clientes</span>
      </NavLink>
      
      <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Package size={24} />
        <span>Produtos</span>
      </NavLink>
      
      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FileText size={24} />
        <span>Relatórios</span>
      </NavLink>
    </nav>
  );
}
