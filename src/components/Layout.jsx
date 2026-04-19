import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

export default function Layout({ title }) {
  return (
    <>
      {title && (
        <header className="top-header">
          <h1>{title}</h1>
        </header>
      )}
      
      <main className="container">
        <Outlet />
      </main>
      
      <BottomNavigation />
    </>
  );
}
