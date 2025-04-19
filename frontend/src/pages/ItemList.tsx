// src/pages/ItemList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItem';
import { ItemForm } from '../components/forms/ItemForm';
import { ItemCreate } from '../types/items';

export const ItemList: React.FC = () => {
  const { 
    items, 
    isLoading, 
    error, 
    createItem, 
    deleteItem,
  } = useItems();
  
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (item: ItemCreate) => {
    setSubmitting(true);
    try {
      await createItem(item);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(id);
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Items</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {showForm && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl mb-4">Add New Item</h2>
          <ItemForm onSubmit={handleSubmit} isLoading={submitting} />
        </div>
      )}

      {isLoading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items found. Create your first item!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              {item.description && <p className="mb-2">{item.description}</p>}
              <div className="flex justify-between items-center mt-4">
                <Link
                  to={`/items/${item.id}`}
                  className="text-blue-500 hover:underline"
                >
                  View Details
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

