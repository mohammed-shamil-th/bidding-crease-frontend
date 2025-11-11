'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Link from 'next/link';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const playerSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  mobile: Yup.string()
    .matches(/^[0-9]{10}$/, 'Mobile must be 10 digits')
    .required('Mobile is required'),
  role: Yup.string().oneOf(['Batter', 'Bowler', 'All-Rounder'], 'Invalid role').required('Role is required'),
  battingStyle: Yup.string().nullable(),
  bowlingStyle: Yup.string().nullable(),
  category: Yup.string().oneOf(['Icon', 'Guest', 'Local'], 'Invalid category').required('Category is required'),
  basePrice: Yup.number().min(0, 'Base price must be positive').required('Base price is required'),
});

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchPlayerDetails();
    }
  }, [params.id]);

  const fetchPlayerDetails = async () => {
    try {
      setLoading(true);
      const response = await playerAPI.getById(params.id);
      setPlayer(response.data.data);
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    enableReinitialize: false, // We'll manually set values when modal opens
    initialValues: {
      name: '',
      mobile: '',
      role: '',
      battingStyle: '',
      bowlingStyle: '',
      category: '',
      basePrice: 0,
    },
    validationSchema: playerSchema,
    onSubmit: async (values) => {
      try {
        setSubmitError('');
        const formData = new FormData();
        Object.keys(values).forEach((key) => {
          if (values[key] !== null && values[key] !== '') {
            formData.append(key, values[key]);
          }
        });

        await playerAPI.update(params.id, formData);
        setEditModal(false);
        fetchPlayerDetails();
      } catch (error) {
        console.error('Error updating player:', error);
        setSubmitError(error.response?.data?.message || 'Error updating player');
      }
    },
  });

  // Update form values when modal opens and player data is available
  useEffect(() => {
    if (editModal && player) {
      // Use setTimeout to ensure form is ready
      setTimeout(() => {
        formik.setValues({
          name: player.name || '',
          mobile: player.mobile || '',
          role: player.role || '',
          battingStyle: player.battingStyle || '',
          bowlingStyle: player.bowlingStyle || '',
          category: player.category || '',
          basePrice: player.basePrice || 0,
        });
      }, 0);
    }
  }, [editModal, player]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-8">
        <div className="text-xl text-red-600">Player not found</div>
        <Link href="/admin/players" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Players
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/players"
            className="text-primary-600 hover:text-primary-900 mb-2 inline-block"
          >
            ← Back to Players
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{player.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Player Profile</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setEditModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Edit Player
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Information */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-center mb-6">
              <PlayerAvatar player={player} size="xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Player Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-medium text-gray-900">{player.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="text-lg font-medium text-gray-900">{player.mobile}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-lg font-medium text-gray-900">{player.role}</p>
              </div>
              {player.battingStyle && (
                <div>
                  <p className="text-sm text-gray-600">Batting Style</p>
                  <p className="text-lg font-medium text-gray-900">{player.battingStyle}</p>
                </div>
              )}
              {player.bowlingStyle && (
                <div>
                  <p className="text-sm text-gray-600">Bowling Style</p>
                  <p className="text-lg font-medium text-gray-900">{player.bowlingStyle}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-medium text-gray-900">{player.category}</p>
                  {player.category === 'Icon' && (
                    <span className="text-yellow-500 text-xl" title="Icon Player">⭐</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Base Price</p>
                <p className="text-lg font-bold text-primary-600">{formatCurrency(player.basePrice)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sale Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sale Information</h2>
            {player.soldPrice && player.soldTo ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Status</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                      SOLD
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Sold Price</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(player.soldPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sold To</p>
                      <Link
                        href={`/admin/teams/${player.soldTo._id || player.soldTo}`}
                        className="text-lg font-medium text-primary-600 hover:text-primary-900"
                      >
                        {player.soldTo.name || 'Unknown Team'}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Status</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                    UNSOLD
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tournament Information */}
          {player.tournamentId && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tournament</h2>
              <p className="text-lg font-medium text-gray-900">
                {typeof player.tournamentId === 'object' ? player.tournamentId.name : 'N/A'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => {
          setEditModal(false);
          setSubmitError('');
          formik.resetForm();
        }}
        title="Edit Player"
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{submitError}</div>
            </div>
          )}

          <FormInput
            label="Name"
            name="name"
            type="text"
            formik={formik}
            required
          />

          <FormInput
            label="Mobile"
            name="mobile"
            type="text"
            formik={formik}
            required
          />

          <FormInput
            label="Role"
            name="role"
            type="select"
            formik={formik}
            required
            options={[
              { value: '', label: 'Select Role' },
              { value: 'Batter', label: 'Batter' },
              { value: 'Bowler', label: 'Bowler' },
              { value: 'All-Rounder', label: 'All-Rounder' },
            ]}
          />

          <FormInput
            label="Batting Style"
            name="battingStyle"
            type="select"
            formik={formik}
            options={[
              { value: '', label: 'Select Batting Style' },
              { value: 'Right-handed', label: 'Right-handed' },
              { value: 'Left-handed', label: 'Left-handed' },
            ]}
          />

          <FormInput
            label="Bowling Style"
            name="bowlingStyle"
            type="select"
            formik={formik}
            options={[
              { value: '', label: 'Select Bowling Style' },
              { value: 'Right-arm fast', label: 'Right-arm fast' },
              { value: 'Right-arm medium', label: 'Right-arm medium' },
              { value: 'Right-arm spin', label: 'Right-arm spin' },
              { value: 'Left-arm fast', label: 'Left-arm fast' },
              { value: 'Left-arm medium', label: 'Left-arm medium' },
              { value: 'Left-arm spin', label: 'Left-arm spin' },
            ]}
          />

          <FormInput
            label="Category"
            name="category"
            type="select"
            formik={formik}
            required
            options={[
              { value: '', label: 'Select Category' },
              { value: 'Icon', label: 'Icon' },
              { value: 'Guest', label: 'Guest' },
              { value: 'Local', label: 'Local' },
            ]}
          />

          <FormInput
            label="Base Price"
            name="basePrice"
            type="number"
            formik={formik}
            required
            min="0"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setEditModal(false);
                setSubmitError('');
                formik.resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? 'Updating...' : 'Update Player'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

