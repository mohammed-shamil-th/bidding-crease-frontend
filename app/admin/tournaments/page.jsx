'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { tournamentAPI } from '@/lib/api';
import Table from '@/components/shared/Table';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { formatDate } from '@/lib/utils';

// Validation schema
const tournamentSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters'),
  logo: Yup.mixed(),
  category: Yup.string()
    .oneOf(['open', 'private'], 'Category must be open or private')
    .required('Category is required'),
  location: Yup.string()
    .required('Location is required')
    .min(2, 'Location must be at least 2 characters'),
  auctionDate: Yup.date()
    .required('Auction date is required')
    .typeError('Please enter a valid date'),
  tournamentDate: Yup.date()
    .required('Tournament date is required')
    .typeError('Please enter a valid date')
    .min(Yup.ref('auctionDate'), 'Tournament date must be after auction date'),
  teamBudget: Yup.number()
    .required('Team budget is required')
    .min(0, 'Team budget must be 0 or greater')
    .typeError('Team budget must be a number'),
  minPlayers: Yup.number()
    .required('Min players is required')
    .min(1, 'Min players must be at least 1')
    .typeError('Min players must be a number'),
  maxPlayers: Yup.number()
    .required('Max players is required')
    .min(1, 'Max players must be at least 1')
    .typeError('Max players must be a number')
    .test('greater-than-or-equal-min', 'Max players must be greater than or equal to min players', function(value) {
      return value >= this.parent.minPlayers;
    }),
  totalTeams: Yup.number()
    .required('Total teams is required')
    .min(1, 'Total teams must be at least 1')
    .typeError('Total teams must be a number'),
  totalPlayers: Yup.number()
    .required('Total players is required')
    .min(1, 'Total players must be at least 1')
    .typeError('Total players must be a number'),
  status: Yup.string()
    .oneOf(['upcoming', 'ongoing', 'completed'], 'Invalid status')
    .required('Status is required'),
});

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      category: 'open',
      location: '',
      auctionDate: '',
      tournamentDate: '',
      teamBudget: '',
      minPlayers: '',
      maxPlayers: '',
      totalTeams: '',
      totalPlayers: '',
      status: 'upcoming',
    },
    validationSchema: tournamentSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setSubmitError('');
        const formData = new FormData();
        
        Object.keys(values).forEach((key) => {
          if (values[key] !== '' && values[key] !== null && values[key] !== undefined) {
            if (['teamBudget', 'minPlayers', 'maxPlayers', 'totalTeams', 'totalPlayers'].includes(key)) {
              formData.append(key, Number(values[key]));
            } else {
              formData.append(key, values[key]);
            }
          }
        });
        
        if (logoFile) {
          formData.append('logo', logoFile);
        }

        if (editingTournament) {
          await tournamentAPI.update(editingTournament._id, formData);
        } else {
          await tournamentAPI.create(formData);
        }
        
        setIsModalOpen(false);
        setEditingTournament(null);
        setLogoFile(null);
        setLogoPreview('');
        resetForm();
        fetchTournaments(pagination.page, pagination.limit);
      } catch (error) {
        console.error('Error saving tournament:', error);
        setSubmitError(error.response?.data?.message || 'Error saving tournament');
        // Set field errors if provided by backend
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
    fetchTournaments(1, 10);
  }, []);

  const fetchTournaments = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const response = await tournamentAPI.getAll({ page, limit });
      setTournaments(response.data.data);
      setPagination({
        page: response.data.page,
        limit: limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchTournaments(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    fetchTournaments(1, newLimit);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageToCrop(file);
      setShowCropModal(true);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedFile) => {
    setLogoFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(croppedFile);
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleEdit = (tournament) => {
    setEditingTournament(tournament);
    setSubmitError('');
    setLogoFile(null);
    setLogoPreview(tournament.logo || '');
    formik.setValues({
      name: tournament.name,
      category: tournament.category,
      location: tournament.location,
      auctionDate: tournament.auctionDate.split('T')[0],
      tournamentDate: tournament.tournamentDate.split('T')[0],
      teamBudget: tournament.teamBudget.toString(),
      minPlayers: tournament.minPlayers.toString(),
      maxPlayers: tournament.maxPlayers.toString(),
      totalTeams: tournament.totalTeams.toString(),
      totalPlayers: tournament.totalPlayers.toString(),
      status: tournament.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id, name) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await tournamentAPI.delete(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
      fetchTournaments(pagination.page, pagination.limit);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert(error.response?.data?.message || 'Error deleting tournament');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTournament(null);
    setSubmitError('');
    setLogoFile(null);
    setLogoPreview('');
    formik.resetForm();
  };

  // Removed loading check - will show skeleton in table instead

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
          <p className="mt-2 text-sm text-gray-600">Manage tournaments</p>
        </div>
        <button
          onClick={() => {
            setEditingTournament(null);
            setSubmitError('');
            formik.resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          Add Tournament
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : tournaments.length === 0 ? (
          <EmptyState
            title="No tournaments found"
            message="Create your first tournament to get started"
          />
        ) : (
          <Table
            headers={['Name', 'Category', 'Location', 'Auction Date', 'Status', 'Actions']}
          >
            {tournaments.map((tournament) => (
              <tr key={tournament._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link href={`/admin/tournaments/${tournament._id}`} className="text-primary-600 hover:text-primary-900">
                    {tournament.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tournament.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tournament.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(tournament.auctionDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tournament.status === 'ongoing'
                        ? 'bg-green-100 text-green-800'
                        : tournament.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tournament.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(tournament)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tournament._id, tournament.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
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
        title={editingTournament ? 'Edit Tournament' : 'Add Tournament'}
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
            required
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            placeholder="Enter tournament name"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {logoPreview && (
              <div className="mt-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-20 w-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview('');
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <ImageCropModal
            isOpen={showCropModal}
            onClose={() => {
              setShowCropModal(false);
              setImageToCrop(null);
            }}
            imageFile={imageToCrop}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
          />

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
              { value: 'open', label: 'Open' },
              { value: 'private', label: 'Private' },
            ]}
          />

          <FormInput
            label="Location"
            name="location"
            type="text"
            required
            value={formik.values.location}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.location}
            touched={formik.touched.location}
            placeholder="Enter location"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Auction Date"
              name="auctionDate"
              type="date"
              required
              value={formik.values.auctionDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.auctionDate}
              touched={formik.touched.auctionDate}
            />

            <FormInput
              label="Tournament Date"
              name="tournamentDate"
              type="date"
              required
              value={formik.values.tournamentDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tournamentDate}
              touched={formik.touched.tournamentDate}
            />
          </div>

          <FormInput
            label="Team Budget"
            name="teamBudget"
            type="number"
            required
            min="0"
            value={formik.values.teamBudget}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.teamBudget}
            touched={formik.touched.teamBudget}
            placeholder="Enter team budget"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Min Players"
              name="minPlayers"
              type="number"
              required
              min="1"
              value={formik.values.minPlayers}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.minPlayers}
              touched={formik.touched.minPlayers}
              placeholder="Min players"
            />

            <FormInput
              label="Max Players"
              name="maxPlayers"
              type="number"
              required
              min="1"
              value={formik.values.maxPlayers}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.maxPlayers}
              touched={formik.touched.maxPlayers}
              placeholder="Max players"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Total Teams"
              name="totalTeams"
              type="number"
              required
              min="1"
              value={formik.values.totalTeams}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.totalTeams}
              touched={formik.touched.totalTeams}
              placeholder="Total teams"
            />

            <FormInput
              label="Total Players"
              name="totalPlayers"
              type="number"
              required
              min="1"
              value={formik.values.totalPlayers}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.totalPlayers}
              touched={formik.touched.totalPlayers}
              placeholder="Total players"
            />
          </div>

          <FormInput
            label="Status"
            name="status"
            type="select"
            required
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.status}
            touched={formik.touched.status}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'ongoing', label: 'Ongoing' },
              { value: 'completed', label: 'Completed' },
            ]}
          />

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
              {formik.isSubmitting
                ? 'Saving...'
                : editingTournament
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title="Delete Tournament"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
