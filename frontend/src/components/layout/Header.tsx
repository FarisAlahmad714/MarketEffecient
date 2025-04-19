// src/components/layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            My App
          </Link>
          
          <nav>
            <ul className="flex space-x-4">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive
                      ? 'border-b-2 border-white pb-1'
                      : 'hover:border-b-2 hover:border-white pb-1'
                  }
                  end
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/items"
                  className={({ isActive }) =>
                    isActive
                      ? 'border-b-2 border-white pb-1'
                      : 'hover:border-b-2 hover:border-white pb-1'
                  }
                >
                  Items
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

