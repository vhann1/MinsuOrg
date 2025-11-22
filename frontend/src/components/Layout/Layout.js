// src/components/Layout/Layout.js (Updated)
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <button className="navbar-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <h2>MINSU OrgSuite</h2>
          <span>{user?.organization?.name}</span>
        </div>
        <div className="navbar-user">
          <span>Welcome, {user?.first_name} {user?.last_name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <div className="layout-container">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content" onClick={closeSidebar}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;