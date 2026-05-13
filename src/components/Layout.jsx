import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout({ title }) {
  return (
    <>
      {title && (
        <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{title}</h1>
        </header>
      )}
      
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
