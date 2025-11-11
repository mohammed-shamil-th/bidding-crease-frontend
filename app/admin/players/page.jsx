'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { playerAPI, tournamentAPI, teamAPI } from '@/lib/api';
import Table from '@/components/shared/Table';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Pagination from '@/components/shared/Pagination';
import SearchInput from '@/components/shared/SearchInput';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import { formatCurrency, debounce } from '@/lib/utils';

// Validation schema
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

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [teams, setTeams] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      mobile: '',
      role: 'Batter',
      battingStyle: '',
      bowlingStyle: '',
      category: 'Local',
      basePrice: '',
      tournamentId: '',
    },
    validationSchema: playerSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setSubmitError('');
        const formDataToSend = new FormData();
        
        Object.keys(values).forEach((key) => {
          if (values[key] !== '' && values[key] !== null) {
            formDataToSend.append(key, values[key]);
          }
        });
        
        if (imageFile) {
          formDataToSend.append('image', imageFile);
        }

        if (editingPlayer) {
          await playerAPI.update(editingPlayer._id, formDataToSend);
        } else {
          await playerAPI.create(formDataToSend);
        }
        
        setIsModalOpen(false);
        setEditingPlayer(null);
        setImageFile(null);
        setImagePreview('');
        resetForm();
        fetchPlayers();
      } catch (error) {
        console.error('Error saving player:', error);
        setSubmitError(error.response?.data?.message || 'Error saving player');
        if (error.response?.data?.errors) {
          Object.keys(error.response.data.errors).forEach((key) => {
            formik.setFieldError(key, error.response.data.errors[key]);
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    fetchTournaments();
    fetchPlayers(1, 10);
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
    }
  }, [selectedTournament]);

  const fetchTeams = async () => {
    try {
      const params = selectedTournament ? { tournamentId: selectedTournament } : {};
      const response = await teamAPI.getAll(params);
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };


  // Debounced search handler
  const debouncedSearchRef = useRef(
    debounce((value) => {
      setSearchQuery(value);
    }, 500)
  );

  useEffect(() => {
    debouncedSearchRef.current(searchInput);
  }, [searchInput]);

  useEffect(() => {
    fetchPlayers(1, pagination.limit);
  }, [selectedTournament, filter, categoryFilter, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    if (tournaments.length > 0 && !formik.values.tournamentId && selectedTournament) {
      formik.setFieldValue('tournamentId', selectedTournament);
    }
  }, [tournaments, selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
      if (response.data.data.length > 0 && !selectedTournament) {
        setSelectedTournament(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };


  const fetchPlayers = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (selectedTournament) params.tournamentId = selectedTournament;
      if (filter === 'sold') params.sold = 'true';
      if (filter === 'unsold') params.unsold = 'true';
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await playerAPI.getAll(params);
      setPlayers(response.data.data);
      setPagination({
        page: response.data.page,
        limit: limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchPlayers(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    fetchPlayers(1, newLimit);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setSubmitError('');
    setImagePreview(player.image || '');
    setImageFile(null);
    setIsModalOpen(true);
    // Use setTimeout to ensure modal is open before setting form values
    setTimeout(() => {
      formik.setValues({
        name: player.name || '',
        mobile: player.mobile || '',
        role: player.role || '',
        battingStyle: player.battingStyle || '',
        bowlingStyle: player.bowlingStyle || '',
        category: player.category || 'Local',
        basePrice: player.basePrice ? player.basePrice.toString() : '',
        tournamentId: player.tournamentId?._id || player.tournamentId || selectedTournament || '',
        // For sold players, allow editing sale details
        soldPrice: player.soldPrice ? player.soldPrice.toString() : '',
        soldTo: player.soldTo?._id || player.soldTo || '',
      });
    }, 0);
  };

  const handleDelete = (id, name) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await playerAPI.delete(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
      fetchPlayers(pagination.page, pagination.limit);
    } catch (error) {
      console.error('Error deleting player:', error);
      alert(error.response?.data?.message || 'Error deleting player');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setImageFile(null);
    setImagePreview('');
    setSubmitError('');
    formik.resetForm();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Players</h1>
          <p className="mt-2 text-sm text-gray-600">Manage players</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search players..."
          />
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Players</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            <option value="Icon">Icon</option>
            <option value="Local">Local</option>
            <option value="Guest">Guest</option>
          </select>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </select>
          <button
            onClick={() => {
              setEditingPlayer(null);
              setSubmitError('');
              setImageFile(null);
              setImagePreview('');
              formik.resetForm();
              if (selectedTournament) {
                formik.setFieldValue('tournamentId', selectedTournament);
              }
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Add Player
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          headers={['Image', 'Name', 'Role', 'Category', 'Base Price', 'Sold Price', 'Team', 'Actions']}
        >
          {players.map((player) => (
            <tr key={player._id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <PlayerAvatar player={player} size="sm" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <Link href={`/admin/players/${player._id}`} className="text-primary-600 hover:text-primary-900">
                  {player.name}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {player.role}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  {player.category === 'Icon' && (
                    <span className="text-yellow-500" title="Icon Player">⭐</span>
                  )}
                  <span>{player.category}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatCurrency(player.basePrice)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {player.soldPrice ? formatCurrency(player.soldPrice) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {player.soldTo?.name ? (
                  <Link href={`/admin/teams/${player.soldTo._id || player.soldTo}`} className="text-primary-600 hover:text-primary-900">
                    {player.soldTo.name}
                  </Link>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => handleEdit(player)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(player._id, player.name)}
                  className="text-red-600 hover:text-red-900"
                  disabled={player.soldPrice !== null}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        limit={pagination.limit}
        onLimitChange={handleLimitChange}
        totalItems={pagination.total}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPlayer ? 'Edit Player' : 'Add Player'}
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
            <label className="block text-sm font-medium text-gray-700">
              Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
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
          {editingPlayer && editingPlayer.soldPrice && editingPlayer.soldTo && (
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
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? 'Saving...' : editingPlayer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title="Delete Player"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
