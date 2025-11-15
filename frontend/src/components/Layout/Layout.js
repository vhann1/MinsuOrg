// src/components/Layout/Layout.js (updated)
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>MINSU OrgSuite</h2>
          <span>{user?.organization?.name}</span>
        </div>
        <div className="navbar-user">
          <span>Welcome, {user?.first_name} {user?.last_name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <div className="layout-container">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;