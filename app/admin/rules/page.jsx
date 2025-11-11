'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ruleAPI, tournamentAPI } from '@/lib/api';
import Table from '@/components/shared/Table';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Pagination from '@/components/shared/Pagination';

// Validation schema
const ruleSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters'),
});

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
    },
    validationSchema: ruleSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setSubmitError('');
        const data = {
          ...values,
          tournamentId: selectedTournament,
        };

        if (editingRule) {
          await ruleAPI.update(editingRule._id, data);
        } else {
          await ruleAPI.create(data);
        }
        
        setIsModalOpen(false);
        setEditingRule(null);
        resetForm();
        fetchRules(pagination.page, pagination.limit);
      } catch (error) {
        console.error('Error saving rule:', error);
        setSubmitError(error.response?.data?.message || 'Error saving rule');
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
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchRules(1, pagination.limit);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedTournament(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchRules = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const response = await ruleAPI.getByTournament(selectedTournament, { page, limit });
      setRules(response.data.data);
      setPagination({
        page: response.data.page,
        limit: limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchRules(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    fetchRules(1, newLimit);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setSubmitError('');
    formik.setValues({
      title: rule.title,
      description: rule.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id, title) => {
    setDeleteConfirm({ isOpen: true, id, title });
  };

  const confirmDelete = async () => {
    try {
      await ruleAPI.delete(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      fetchRules(pagination.page, pagination.limit);
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert(error.response?.data?.message || 'Error deleting rule');
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Rules</h1>
          <p className="mt-2 text-sm text-gray-600">Manage tournament rules</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select Tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingRule(null);
              setSubmitError('');
              formik.resetForm();
              setIsModalOpen(true);
            }}
            disabled={!selectedTournament}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Rule
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table headers={['Title', 'Description', 'Actions']}>
          {rules.map((rule) => (
            <tr key={rule._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {rule.title}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {rule.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => handleEdit(rule)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(rule._id, rule.title)}
                  className="text-red-600 hover:text-red-900"
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
        title={editingRule ? 'Edit Rule' : 'Add Rule'}
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{submitError}</div>
            </div>
          )}

          {!selectedTournament && (
            <div className="rounded-md bg-yellow-50 p-4 mb-4">
              <div className="text-sm text-yellow-700">
                Please select a tournament first
              </div>
            </div>
          )}

          <FormInput
            label="Title"
            name="title"
            type="text"
            required
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.title}
            touched={formik.touched.title}
            placeholder="Enter rule title"
          />

          <FormInput
            label="Description"
            name="description"
            type="textarea"
            required
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.description}
            touched={formik.touched.description}
            placeholder="Enter rule description"
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
              disabled={formik.isSubmitting || !selectedTournament}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? 'Saving...' : editingRule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
