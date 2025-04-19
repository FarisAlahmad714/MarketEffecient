// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to My App</h1>
        <p className="text-xl text-gray-600">
          A full-stack application built with FastAPI, SQLAlchemy, PostgreSQL, and React
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">Manage Items</h2>
          <p className="mb-4">
            Create, view, update, and delete items with our easy-to-use interface.
          </p>
          <Link
            to="/items"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Items
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <p className="mb-4">
            This is a boilerplate application demonstrating modern full-stack development practices.
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>FastAPI for backend API</li>
            <li>SQLAlchemy with PostgreSQL for data storage</li>
            <li>React with TypeScript for frontend</li>
          </ul>
        </div>
      </div>
    </div>
  );
};