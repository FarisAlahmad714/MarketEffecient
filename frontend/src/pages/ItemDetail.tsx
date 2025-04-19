// src/pages/ItemDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemService } from '../services/itemService';
import { ItemForm } from '../components/forms/ItemForm';
import { Item, ItemUpdate } from '../types/items';

export const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const data = await itemService.getItem(parseInt(id));
        setItem(data);
      } catch (err) {
        setError('Failed to fetch item details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleUpdate = async (updatedItem: ItemUpdate) => {
    if (!id || !item) return;
    
    setSubmitting(true);
    try {
      const data = await itemService.updateItem(parseInt(id), updatedItem);
      setItem(data);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemService.deleteItem(parseInt(id));
        navigate('/items');
      } catch (err) {
        setError('Failed to delete item');
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <p>Loading item details...</p>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;
  }

  if (!item) {
    return <p>Item not found</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => navigate('/items')}
          className="text-blue-500 hover:underline"
        >
          ← Back to Items
        </button>
      </div>

      {isEditing ? (
        <div>
          <h1 className="text-2xl font-bold mb-4">Edit Item</h1>
          <ItemForm 
            item={item} 
            onSubmit={handleUpdate} 
            isLoading={submitting} 
          />
          <button
            onClick={() => setIsEditing(false)}
            className="mt-4 text-gray-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded p-6">
            <div className="mb-4">
              <span className="font-semibold">Status: </span>
              <span className={`${item.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {item.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {item.description && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Description:</h3>
                <p>{item.description}</p>
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              <p>Created: {new Date(item.created_at).toLocaleString()}</p>
              {item.updated_at && (
                <p>Last updated: {new Date(item.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};