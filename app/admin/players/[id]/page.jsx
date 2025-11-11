'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { playerAPI, tournamentAPI, teamAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Link from 'next/link';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const playerSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  mobile: Yup.string()
    .required('Mobile is required')
    .matches(/^[0-9]{10,15}$/, 'Mobile must be 10-15 digits'),
  role: Yup.string()
    .oneOf(['Batter', 'Bowler', 'All-Rounder'], 'Invalid role')
    .required('Role is required'),
  battingStyle: Yup.string().oneOf(['Right', 'Left'], 'Invalid batting style'),
  bowlingStyle: Yup.string().oneOf(
    [
      'Right-arm medium',
      'Right-arm fast',
      'Right-arm spin',
      'Left-arm medium',
      'Left-arm fast',
      'Left-arm orthodox',
      'Left-arm unorthodox',
    ],
    'Invalid bowling style'
  ),
  category: Yup.string()
    .oneOf(['Icon', 'Guest', 'Local'], 'Invalid category')
    .required('Category is required'),
  basePrice: Yup.number()
    .required('Base price is required')
    .min(0, 'Base price must be 0 or greater')
    .typeError('Base price must be a number'),
  tournamentId: Yup.string().required('Tournament is required'),
});

export default function PlayerDetailPage() {
  const params = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (params.id) {
      fetchPlayerDetails();
      fetchTournaments();
    }
  }, [params.id]);

  useEffect(() => {
    if (player && player.tournamentId) {
      // Fetch teams when player data is loaded
      const tournamentId = typeof player.tournamentId === 'object' 
        ? player.tournamentId._id 
        : player.tournamentId;
      fetchTeams(tournamentId);
    }
  }, [player]);

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

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchTeams = async (tournamentId) => {
    try {
      const response = await teamAPI.getAll({ tournamentId });
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const formik = useFormik({
    enableReinitialize: false,
    initialValues: {
      name: '',
      mobile: '',
      role: '',
      battingStyle: '',
      bowlingStyle: '',
      category: '',
      basePrice: '',
      tournamentId: '',
      soldPrice: '',
      soldTo: '',
    },
    validationSchema: playerSchema,
    onSubmit: async (values) => {
      try {
        setSubmitError('');
        const formData = new FormData();
        Object.keys(values).forEach((key) => {
          if (values[key] !== null && values[key] !== '' && values[key] !== undefined) {
            formData.append(key, values[key]);
          }
        });

        if (imageFile) {
          formData.append('image', imageFile);
        }

        await playerAPI.update(params.id, formData);
        setEditModal(false);
        setImageFile(null);
        setImagePreview('');
        fetchPlayerDetails();
        // Refresh teams after update in case soldTo changed
        if (player && player.tournamentId) {
          const tournamentId = typeof player.tournamentId === 'object' 
            ? player.tournamentId._id 
            : player.tournamentId;
          fetchTeams(tournamentId);
        }
      } catch (error) {
        console.error('Error updating player:', error);
        setSubmitError(error.response?.data?.message || 'Error updating player');
      }
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update form values when modal opens and player data is available
  useEffect(() => {
    if (editModal && player) {
      // Use setTimeout to ensure form is ready
      setTimeout(() => {
        const tournamentId = typeof player.tournamentId === 'object' 
          ? player.tournamentId._id 
          : player.tournamentId;
        
        formik.setValues({
          name: player.name || '',
          mobile: player.mobile || '',
          role: player.role || '',
          battingStyle: player.battingStyle || '',
          bowlingStyle: player.bowlingStyle || '',
          category: player.category || '',
          basePrice: player.basePrice ? player.basePrice.toString() : '',
          tournamentId: tournamentId || '',
          soldPrice: player.soldPrice ? player.soldPrice.toString() : '',
          soldTo: player.soldTo?._id || player.soldTo || '',
        });
        // Set image preview
        setImagePreview(player.image || '');
        setImageFile(null);
        // Clear any previous errors
        formik.setErrors({});
        formik.setTouched({});
      }, 100);
    } else if (!editModal) {
      // Reset form when modal closes
      formik.resetForm();
      setImageFile(null);
      setImagePreview('');
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
          setImageFile(null);
          setImagePreview('');
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
            label="Tournament"
            name="tournamentId"
            type="select"
            required
            disabled={player && player.soldPrice && player.soldTo}
            value={formik.values.tournamentId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.tournamentId}
            touched={formik.touched.tournamentId}
            options={[
              { value: '', label: 'Select Tournament' },
              ...tournaments.map((tournament) => ({
                value: tournament._id,
                label: tournament.name,
              })),
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 h-20 w-20 object-cover rounded"
              />
            )}
          </div>

          <FormInput
            label="Name"
            name="name"
            type="text"
            required
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            placeholder="Enter player name"
          />

          <FormInput
            label="Mobile"
            name="mobile"
            type="text"
            required
            value={formik.values.mobile}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.mobile}
            touched={formik.touched.mobile}
            placeholder="10-15 digits"
          />

          <FormInput
            label="Role"
            name="role"
            type="select"
            required
            value={formik.values.role}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.role}
            touched={formik.touched.role}
            options={[
              { value: '', label: 'Select Role' },
              { value: 'Batter', label: 'Batter' },
              { value: 'Bowler', label: 'Bowler' },
              { value: 'All-Rounder', label: 'All-Rounder' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Batting Style"
              name="battingStyle"
              type="select"
              value={formik.values.battingStyle}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.battingStyle}
              touched={formik.touched.battingStyle}
              options={[
                { value: '', label: 'Select' },
                { value: 'Right', label: 'Right' },
                { value: 'Left', label: 'Left' },
              ]}
            />

            <FormInput
              label="Bowling Style"
              name="bowlingStyle"
              type="select"
              value={formik.values.bowlingStyle}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.bowlingStyle}
              touched={formik.touched.bowlingStyle}
              options={[
                { value: '', label: 'Select' },
                { value: 'Right-arm medium', label: 'Right-arm medium' },
                { value: 'Right-arm fast', label: 'Right-arm fast' },
                { value: 'Right-arm spin', label: 'Right-arm spin' },
                { value: 'Left-arm medium', label: 'Left-arm medium' },
                { value: 'Left-arm fast', label: 'Left-arm fast' },
                { value: 'Left-arm orthodox', label: 'Left-arm orthodox' },
                { value: 'Left-arm unorthodox', label: 'Left-arm unorthodox' },
              ]}
            />
          </div>

          <FormInput
            label="Category"
            name="category"
            type="select"
            required
            value={formik.values.category}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.category}
            touched={formik.touched.category}
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
            required
            min="0"
            value={formik.values.basePrice}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.basePrice}
            touched={formik.touched.basePrice}
            placeholder="Enter base price"
          />

          {/* Show sold player fields only when editing a sold player */}
          {player && player.soldPrice && player.soldTo && (
            <>
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Sale Details</h3>
              </div>
              <FormInput
                label="Sold Price"
                name="soldPrice"
                type="number"
                min="0"
                value={formik.values.soldPrice || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.soldPrice}
                touched={formik.touched.soldPrice}
                placeholder="Enter sold price"
              />
              <FormInput
                label="Sold To (Team)"
                name="soldTo"
                type="select"
                value={formik.values.soldTo || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.soldTo}
                touched={formik.touched.soldTo}
                options={[
                  { value: '', label: 'Select Team' },
                  ...teams.map((team) => ({
                    value: team._id,
                    label: team.name,
                  })),
                ]}
              />
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setEditModal(false);
                setSubmitError('');
                setImageFile(null);
                setImagePreview('');
                formik.resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? 'Updating...' : 'Update Player'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

