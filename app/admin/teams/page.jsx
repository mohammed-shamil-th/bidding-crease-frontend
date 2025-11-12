'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { teamAPI, tournamentAPI } from '@/lib/api';
import Table from '@/components/shared/Table';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { formatCurrency } from '@/lib/utils';

// Validation schema
const teamSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  logo: Yup.mixed(),
  owner: Yup.string()
    .required('Owner is required')
    .min(2, 'Owner name must be at least 2 characters'),
  mobile: Yup.string()
    .required('Mobile is required')
    .matches(/^[0-9]{10,15}$/, 'Mobile must be 10-15 digits'),
  budget: Yup.number()
    .min(0, 'Budget must be 0 or greater')
    .typeError('Budget must be a number'),
  tournamentId: Yup.string().required('Tournament is required'),
});

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
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
      owner: '',
      mobile: '',
      budget: '',
      tournamentId: '',
    },
    validationSchema: teamSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setSubmitError('');
        const formData = new FormData();
        
        Object.keys(values).forEach((key) => {
          if (values[key] !== '' && values[key] !== null && values[key] !== undefined) {
            if (key === 'budget' && values[key]) {
              formData.append(key, Number(values[key]));
            } else {
              formData.append(key, values[key]);
            }
          }
        });
        
        if (logoFile) {
          formData.append('logo', logoFile);
        }

        if (editingTeam) {
          await teamAPI.update(editingTeam._id, formData);
        } else {
          await teamAPI.create(formData);
        }
        
        setIsModalOpen(false);
        setEditingTeam(null);
        setLogoFile(null);
        setLogoPreview('');
        resetForm();
        fetchTeams(selectedTournament, pagination.page, pagination.limit);
      } catch (error) {
        console.error('Error saving team:', error);
        setSubmitError(error.response?.data?.message || 'Error saving team');
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
    fetchTeams('', 1, 10);
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams(selectedTournament, 1, pagination.limit);
    } else {
      fetchTeams('', 1, pagination.limit);
    }
  }, [selectedTournament]);

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

  const fetchTeams = async (tournamentId = '', page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(tournamentId || selectedTournament ? { tournamentId: tournamentId || selectedTournament } : {}),
      };
      const teamsResponse = await teamAPI.getAll(params);
      setTeams(teamsResponse.data.data);
      setPagination({
        page: teamsResponse.data.page,
        limit: limit,
        total: teamsResponse.data.total,
        totalPages: teamsResponse.data.totalPages,
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchTeams(selectedTournament, newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    fetchTeams(selectedTournament, 1, newLimit);
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

  const handleEdit = (team) => {
    setEditingTeam(team);
    setSubmitError('');
    setLogoFile(null);
    setLogoPreview(team.logo || '');
    formik.setValues({
      name: team.name,
      owner: team.owner,
      mobile: team.mobile,
      budget: team.budget ? team.budget.toString() : '',
      tournamentId: team.tournamentId._id || team.tournamentId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id, name) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await teamAPI.delete(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
      fetchTeams(selectedTournament, pagination.page, pagination.limit);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert(error.response?.data?.message || 'Error deleting team');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setSubmitError('');
    formik.resetForm();
  };

  // Removed loading check - will show skeleton in table instead

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="mt-2 text-sm text-gray-600">Manage teams</p>
        </div>
        <div className="flex space-x-4">
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
          <button
            onClick={() => {
              setEditingTeam(null);
              setSubmitError('');
              formik.resetForm();
              if (selectedTournament) {
                formik.setFieldValue('tournamentId', selectedTournament);
              }
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Add Team
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No teams found"
            message="Try adjusting your filters or add a new team"
          />
        ) : (
          <Table headers={['Name', 'Owner', 'Mobile', 'Budget', 'Remaining', 'Players', 'Actions']}>
            {teams.map((team) => (
              <tr key={team._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link href={`/admin/teams/${team._id}`} className="text-primary-600 hover:text-primary-900">
                    {team.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {team.owner}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {team.mobile}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(team.budget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(team.remainingAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {team.players?.length || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/admin/teams/${team._id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleEdit(team)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(team._id, team.name)}
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
        title={editingTeam ? 'Edit Team' : 'Add Team'}
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
            placeholder="Enter team name"
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
            label="Owner"
            name="owner"
            type="text"
            required
            value={formik.values.owner}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.owner}
            touched={formik.touched.owner}
            placeholder="Enter owner name"
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
            label="Budget"
            name="budget"
            type="number"
            min="0"
            value={formik.values.budget}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.budget}
            touched={formik.touched.budget}
            placeholder="Leave empty to use tournament default"
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
              {formik.isSubmitting ? 'Saving...' : editingTeam ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title="Delete Team"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
