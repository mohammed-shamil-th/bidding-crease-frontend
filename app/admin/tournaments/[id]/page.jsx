'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tournamentAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import FormInput from '@/components/shared/FormInput';
import ImageCropModal from '@/components/shared/ImageCropModal';

const bidIncrementSchema = Yup.object().shape({
  minPrice: Yup.number().required('Min price is required').min(0, 'Min price must be >= 0'),
  maxPrice: Yup.number().nullable().test('max-greater', 'Max price must be greater than min price', function(value) {
    const { minPrice } = this.parent;
    if (value === null || value === undefined) return true; // null is allowed for last range
    return value > minPrice;
  }),
  increment: Yup.number().required('Increment is required').min(1, 'Increment must be >= 1'),
});

const categorySchema = Yup.object().shape({
  name: Yup.string().required('Category name is required').min(1, 'Category name cannot be empty'),
  basePrice: Yup.number().required('Base price is required').min(0, 'Base price must be >= 0'),
  minPlayers: Yup.number().required('Min players is required').min(0, 'Min players must be >= 0'),
  icon: Yup.string().nullable(),
});

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bidIncrements, setBidIncrements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [croppingCategoryIndex, setCroppingCategoryIndex] = useState(null);

  useEffect(() => {
    if (params.id) {
      fetchTournament();
    }
  }, [params.id]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await tournamentAPI.getById(params.id);
      const data = response.data.data;
      setTournament(data);
      
      // Initialize bid increments (use defaults if not set)
      setBidIncrements(
        data.bidIncrements && data.bidIncrements.length > 0
          ? data.bidIncrements
          : [
              { minPrice: 1, maxPrice: 1000, increment: 100 },
              { minPrice: 1001, maxPrice: 5000, increment: 200 },
              { minPrice: 5001, maxPrice: null, increment: 500 }
            ]
      );
      
      // Initialize categories
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setError('Error fetching tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBidIncrement = () => {
    const lastIncrement = bidIncrements[bidIncrements.length - 1];
    const newMinPrice = lastIncrement?.maxPrice ? lastIncrement.maxPrice + 1 : 1000;
    
    setBidIncrements([
      ...bidIncrements.slice(0, -1), // All except last
      { ...lastIncrement, maxPrice: newMinPrice - 1 }, // Update last to have maxPrice
      { minPrice: newMinPrice, maxPrice: null, increment: 100 } // New last range
    ]);
  };

  const handleRemoveBidIncrement = (index) => {
    if (bidIncrements.length <= 1) {
      setError('At least one bid increment range is required');
      return;
    }
    
    const newIncrements = bidIncrements.filter((_, i) => i !== index);
    
    // If we removed the last one, make the new last one have maxPrice: null
    if (index === bidIncrements.length - 1) {
      newIncrements[newIncrements.length - 1].maxPrice = null;
    }
    
    setBidIncrements(newIncrements);
  };

  const handleUpdateBidIncrement = (index, field, value) => {
    const updated = [...bidIncrements];
    updated[index] = {
      ...updated[index],
      [field]: field === 'maxPrice' && value === '' ? null : (field === 'minPrice' || field === 'maxPrice' || field === 'increment' ? Number(value) : value)
    };
    setBidIncrements(updated);
  };

  const handleAddCategory = () => {
    setCategories([...categories, { name: '', basePrice: 0, minPlayers: 0, icon: '' }]);
  };

  const handleRemoveCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleUpdateCategory = (index, field, value) => {
    const updated = [...categories];
    updated[index] = {
      ...updated[index],
      [field]: field === 'basePrice' || field === 'minPlayers' ? Number(value) : value
    };
    setCategories(updated);
  };

  const handleCategoryIconChange = (index, file) => {
    if (file) {
      setImageToCrop(file);
      setCroppingCategoryIndex(index);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = async (croppedFile) => {
    if (croppingCategoryIndex === null) return;
    
    try {
      // Upload icon to Cloudinary
      const formData = new FormData();
      formData.append('image', croppedFile);
      
      // For now, we'll need to upload via a separate endpoint or handle in update
      // For simplicity, let's use a data URL approach or upload separately
      // Actually, we can handle this in the save function by uploading icons first
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // For now, store as data URL - in production, upload to Cloudinary
        const updated = [...categories];
        updated[croppingCategoryIndex] = {
          ...updated[croppingCategoryIndex],
          icon: reader.result
        };
        setCategories(updated);
        setShowCropModal(false);
        setImageToCrop(null);
        setCroppingCategoryIndex(null);
      };
      reader.readAsDataURL(croppedFile);
    } catch (error) {
      console.error('Error processing icon:', error);
      setError('Error processing icon');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Validate bid increments
      for (let i = 0; i < bidIncrements.length; i++) {
        try {
          await bidIncrementSchema.validate(bidIncrements[i]);
        } catch (err) {
          setError(`Bid increment ${i + 1}: ${err.message}`);
          setSaving(false);
          return;
        }
      }
      
      // Validate categories
      for (let i = 0; i < categories.length; i++) {
        try {
          await categorySchema.validate(categories[i]);
        } catch (err) {
          setError(`Category ${i + 1}: ${err.message}`);
          setSaving(false);
          return;
        }
      }
      
      // Prepare form data
      const formData = new FormData();
      formData.append('bidIncrements', JSON.stringify(bidIncrements));
      formData.append('categories', JSON.stringify(categories));
      
      // Upload category icons that are files
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        if (category.icon && category.icon.startsWith('data:')) {
          // This is a data URL from crop, we need to convert to file
          // For now, we'll skip file upload and handle icons as URLs
          // In production, you'd want to upload these to Cloudinary
        }
      }
      
      await tournamentAPI.update(params.id, formData);
      setSuccess('Tournament updated successfully');
      setTimeout(() => {
        fetchTournament(); // Refresh to get updated data
      }, 1000);
    } catch (error) {
      console.error('Error saving tournament:', error);
      setError(error.response?.data?.message || 'Error saving tournament');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-8">
        <div className="text-xl text-red-600">Tournament not found</div>
        <Link href="/admin/tournaments" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/tournaments"
          className="text-primary-600 hover:text-primary-900 mb-2 inline-block"
        >
          ← Back to Tournaments
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
        <p className="mt-2 text-sm text-gray-600">Tournament Configuration</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {/* Bid Increments Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bid Price Distribution</h2>
          <button
            onClick={handleAddBidIncrement}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
          >
            Add Range
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Configure bid increments for different price ranges. Leave max price empty for the last range (no upper limit).
        </p>
        
        <div className="space-y-4">
          {bidIncrements.map((increment, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  type="number"
                  value={increment.minPrice}
                  onChange={(e) => handleUpdateBidIncrement(index, 'minPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price {index === bidIncrements.length - 1 && '(Optional)'}
                </label>
                <input
                  type="number"
                  value={increment.maxPrice === null ? '' : increment.maxPrice}
                  onChange={(e) => handleUpdateBidIncrement(index, 'maxPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={increment.minPrice + 1}
                  placeholder={index === bidIncrements.length - 1 ? 'No limit' : ''}
                  disabled={index === bidIncrements.length - 1 && increment.maxPrice === null}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Increment</label>
                <input
                  type="number"
                  value={increment.increment}
                  onChange={(e) => handleUpdateBidIncrement(index, 'increment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveBidIncrement(index)}
                  disabled={bidIncrements.length <= 1}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Player Categories</h2>
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
          >
            Add Category
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Configure player categories with base prices and minimum player requirements. Icons are optional.
        </p>
        
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No categories configured. Click "Add Category" to get started.
            </div>
          ) : (
            categories.map((category, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => handleUpdateCategory(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Icon"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                    <input
                      type="number"
                      value={category.basePrice}
                      onChange={(e) => handleUpdateCategory(index, 'basePrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Players</label>
                    <input
                      type="number"
                      value={category.minPlayers}
                      onChange={(e) => handleUpdateCategory(index, 'minPlayers', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Optional)</label>
                    <div className="flex items-center gap-2">
                      {category.icon && (
                        <img
                          src={category.icon}
                          alt={category.name || 'Category icon'}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleCategoryIconChange(index, file);
                          e.target.value = '';
                        }}
                        className="flex-1 text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleRemoveCategory(index)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href="/admin/tournaments"
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setImageToCrop(null);
          setCroppingCategoryIndex(null);
        }}
        imageFile={imageToCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
}

