// src/components/Layout/Sidebar.js (Updated)
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: '', label: 'Dashboard' },
    { path: '/members', icon: '', label: 'Members' },
    { path: '/events', icon: '', label: 'Events' },
    { path: '/attendance', icon: '', label: 'Attendance' },
    { path: '/financial', icon: '', label: 'Financial Ledger' },
    { path: '/calendar', icon: '', label: 'Calendar' },
    { path: '/settings', icon: '', label: 'Settings' },
  ];

  const handleItemClick = () => {
    // Close sidebar on mobile when an item is clicked
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'active' : ''}`}>
      <div className="sidebar-menu">
        {menuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={handleItemClick}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;