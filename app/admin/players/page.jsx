'use client';

import { useEffect, useState, useRef, memo } from 'react';
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
import ImageViewerModal from '@/components/shared/ImageViewerModal';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { formatCurrency, debounce } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

const formatInviteDate = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    return '';
  }
};

// Validation schema
const playerSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  mobile: Yup.string()
    .required('Mobile is required')
    .matches(/^[0-9]{10,15}$/, 'Mobile must be 10-15 digits'),
  location: Yup.string(),
  role: Yup.string()
    .oneOf(['Batter', 'Bowler', 'All-Rounder', 'Wicket Keeper'], 'Invalid role')
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
  categoryId: Yup.string()
    .required('Category is required')
    .typeError('Base price must be a number'),
  tournamentId: Yup.string().required('Tournament is required'),
  note: Yup.string().max(500, 'Note must be 500 characters or fewer'),
});

export default function PlayersPage() {
  const { showToast } = useToast();
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
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [teams, setTeams] = useState([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPlayerImage, setSelectedPlayerImage] = useState({ url: '', name: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [copySuccessId, setCopySuccessId] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ label: '', maxUses: '', expiresAt: '' });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteDeleteConfirm, setInviteDeleteConfirm] = useState({ isOpen: false, inviteId: null, label: '' });
  const [appOrigin, setAppOrigin] = useState(PUBLIC_APP_URL);

  const getCategoryOptionsForFilter = () => {
    if (!tournaments.length) return [];

    if (selectedTournament) {
      const tournament = tournaments.find((t) => t._id === selectedTournament);
      if (!tournament || !Array.isArray(tournament.categories)) return [];

      const names = tournament.categories
        .map((c) => (c && c.name ? c.name.trim() : ''))
        .filter(Boolean);

      return Array.from(new Set(names));
    }

    const nameSet = new Set();
    tournaments.forEach((t) => {
      if (Array.isArray(t.categories)) {
        t.categories.forEach((c) => {
          const name = c && c.name ? c.name.trim() : '';
          if (name) {
            nameSet.add(name);
          }
        });
      }
    });

    return Array.from(nameSet);
  };

  const getCategoryOptionsForForm = () => {
    const tournamentId = formik.values.tournamentId || selectedTournament;
    if (!tournamentId) return [];

    const tournament = tournaments.find((t) => t._id === tournamentId);
    if (!tournament || !Array.isArray(tournament.categories)) return [];

    return tournament.categories
      .filter((c) => c && c._id)
      .map((c) => ({
        value: c._id.toString(),
        label: c.name || 'Unnamed Category'
      }));
  };

  const formik = useFormik({
    initialValues: {
    name: '',
    mobile: '',
    location: '',
    role: 'Batter',
    battingStyle: '',
    bowlingStyle: '',
    categoryId: '',
    basePrice: '', // Read-only, displayed from category
    tournamentId: '',
    note: '',
    },
    validationSchema: playerSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const formDataToSend = new FormData();
        
        Object.keys(values).forEach((key) => {
          // Skip basePrice as it's read-only and comes from category
          if (key === 'basePrice') return;
          if (values[key] !== '' && values[key] !== null) {
            formDataToSend.append(key, values[key]);
          }
        });
        
        if (imageFile) {
          formDataToSend.append('image', imageFile);
        }

        if (editingPlayer) {
          await playerAPI.update(editingPlayer._id, formDataToSend);
          showToast('Player updated successfully!', 'success');
        } else {
          await playerAPI.create(formDataToSend);
          showToast('Player created successfully!', 'success');
        }
        
        setIsModalOpen(false);
        setEditingPlayer(null);
        setImageFile(null);
        setImagePreview('');
        resetForm();
        fetchPlayers();
      } catch (error) {
        console.error('Error saving player:', error);
        const errorMessage = error.response?.data?.message || 'Error saving player';
        showToast(errorMessage, 'error');
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

  const handleCategoryChange = (e) => {
    formik.handleChange(e);

    const selectedCategoryId = e.target.value;
    const tournamentId = formik.values.tournamentId || selectedTournament;

    if (!tournamentId || !selectedCategoryId) {
      formik.setFieldValue('basePrice', '');
      return;
    }

    const tournament = tournaments.find((t) => t._id === tournamentId);

    if (!tournament || !Array.isArray(tournament.categories)) {
      formik.setFieldValue('basePrice', '');
      return;
    }

    const matchedCategory = tournament.categories.find(
      (c) => c && c._id && c._id.toString() === selectedCategoryId
    );

    if (matchedCategory && typeof matchedCategory.basePrice === 'number') {
      formik.setFieldValue('basePrice', matchedCategory.basePrice.toString());
    } else {
      formik.setFieldValue('basePrice', '');
    }
  };

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

  const fetchInvites = async () => {
    if (!selectedTournament) return;
    try {
      setInvitesLoading(true);
      const response = await tournamentAPI.getPlayerInvites(selectedTournament);
      setInvites(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      showToast(error.response?.data?.message || 'Error fetching invitation links', 'error');
    } finally {
      setInvitesLoading(false);
    }
  };


  // Debounced search handler
  const debouncedSearchRef = useRef(
    debounce((value) => {
      setSearchQuery(value);
    }, 500)
  );
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    debouncedSearchRef.current(searchInput);
  }, [searchInput]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!PUBLIC_APP_URL && typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    fetchPlayers(1, pagination.limit);
  }, [selectedTournament, filter, categoryFilter, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    if (selectedTournament) {
      fetchInvites();
    } else {
      setInvites([]);
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

  const getInviteUrl = (token) => {
    if (!appOrigin) return '';
    return `${appOrigin.replace(/\/$/, '')}/invite/${token}`;
  };

  const handleCopyInvite = async (invite) => {
    const inviteUrl = getInviteUrl(invite.token);
    if (!inviteUrl) {
      showToast('Unable to copy link. Missing site URL.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopySuccessId(invite._id);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopySuccessId(null), 2000);
      showToast('Invite link copied!', 'success');
    } catch (error) {
      console.error('Copy invite error:', error);
      showToast('Unable to copy link', 'error');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTournament) return;

    const payload = {};
    const trimmedLabel = inviteForm.label.trim();
    if (trimmedLabel) {
      payload.label = trimmedLabel;
    }
    if (inviteForm.maxUses) {
      const parsed = Number(inviteForm.maxUses);
      if (Number.isNaN(parsed) || parsed <= 0) {
        showToast('Max uses must be a positive number', 'error');
        return;
      }
      payload.maxUses = parsed;
    }
    if (inviteForm.expiresAt) {
      payload.expiresAt = inviteForm.expiresAt;
    }

    try {
      setInviteSubmitting(true);
      await tournamentAPI.createPlayerInvite(selectedTournament, payload);
      showToast('Invite link created!', 'success');
      setInviteModalOpen(false);
      setInviteForm({ label: '', maxUses: '', expiresAt: '' });
      fetchInvites();
    } catch (error) {
      console.error('Create invite error:', error);
      showToast(error.response?.data?.message || 'Error creating invite', 'error');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleToggleInvite = async (inviteId) => {
    if (!selectedTournament) return;
    try {
      await tournamentAPI.togglePlayerInvite(selectedTournament, inviteId);
      fetchInvites();
      showToast('Invite status updated', 'success');
    } catch (error) {
      console.error('Toggle invite error:', error);
      showToast(error.response?.data?.message || 'Error updating invite', 'error');
    }
  };

  const confirmInviteDelete = async () => {
    if (!inviteDeleteConfirm.inviteId || !selectedTournament) return;
    try {
      await tournamentAPI.deletePlayerInvite(
        selectedTournament,
        inviteDeleteConfirm.inviteId
      );
      showToast('Invite deleted', 'success');
      setInviteDeleteConfirm({ isOpen: false, inviteId: null, label: '' });
      fetchInvites();
    } catch (error) {
      console.error('Delete invite error:', error);
      showToast(error.response?.data?.message || 'Error deleting invite', 'error');
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setImagePreview(player.image || '');
    setImageFile(null);
    setIsModalOpen(true);
    // Use setTimeout to ensure modal is open before setting form values
    setTimeout(() => {
      const tournamentId = player.tournamentId?._id || player.tournamentId || selectedTournament || '';
      const tournament = tournaments.find((t) => t._id === tournamentId);
      let basePrice = '';
      
      // Get basePrice from category if available
      if (player.categoryId && tournament && Array.isArray(tournament.categories)) {
        const category = tournament.categories.find(
          (c) => c && c._id && c._id.toString() === player.categoryId.toString()
        );
        if (category && typeof category.basePrice === 'number') {
          basePrice = category.basePrice.toString();
        }
      }
      
      formik.setValues({
        name: player.name || '',
        mobile: player.mobile || '',
        location: player.location || '',
        role: player.role || '',
        battingStyle: player.battingStyle || '',
        bowlingStyle: player.bowlingStyle || '',
        categoryId: player.categoryId ? player.categoryId.toString() : '',
        basePrice: basePrice,
        tournamentId: tournamentId,
        note: player.note || '',
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
      showToast('Player deleted successfully!', 'success');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
      fetchPlayers(pagination.page, pagination.limit);
    } catch (error) {
      console.error('Error deleting player:', error);
      showToast(error.response?.data?.message || 'Error deleting player', 'error');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageToCrop(file);
      setShowCropModal(true);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedFile) => {
    setImageFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(croppedFile);
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setImageFile(null);
    setImagePreview('');
    formik.resetForm();
  };

  const selectedTournamentDetails = selectedTournament
    ? tournaments.find((t) => t._id === selectedTournament)
    : null;

  // Memoized table rows to prevent re-rendering on search
  const TableRows = memo(({ players, onEdit, onDelete, onImageClick }) => {
    return (
      <>
        {players.map((player) => (
          <tr key={player._id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <PlayerAvatar
                player={player}
                size="sm"
                clickable={!!player.image}
                onClick={() => player.image && onImageClick(player.image, player.name)}
              />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <Link href={`/admin/players/${player._id}`} className="text-primary-600 hover:text-primary-900">
                {player.name}
              </Link>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {player.location || '-'}
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
                onClick={() => onEdit(player)}
                className="text-primary-600 hover:text-primary-900"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(player._id, player.name)}
                className="text-red-600 hover:text-red-900"
                disabled={player.soldPrice !== null}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </>
    );
  });

  TableRows.displayName = 'TableRows';

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
            {getCategoryOptionsForFilter().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
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

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Player Invitation Links</h2>
            <p className="text-sm text-gray-500">
              Share a public link so players can self-register for{' '}
              {selectedTournamentDetails ? selectedTournamentDetails.name : 'the selected tournament'}.
            </p>
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            disabled={!selectedTournament}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Invite Link
          </button>
        </div>
        {!selectedTournament ? (
          <p className="mt-4 text-sm text-gray-500">
            Select a tournament to manage invitation links.
          </p>
        ) : invitesLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading invitation links...</p>
        ) : invites.length === 0 ? (
          <div className="mt-4 border border-dashed border-gray-300 rounded-md p-4 text-sm text-gray-500">
            No invitation links yet. Create one to allow players to register themselves.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {invites.map((invite) => {
              return (
                <div
                  key={invite._id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{invite.label}</p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          invite.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {invite.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {/* <p className="text-sm text-gray-500">
                      Link hidden here. Use the copy link button to share with players.
                    </p> */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span>
                        Usage: {invite.usageCount}
                        {invite.maxUses ? ` / ${invite.maxUses}` : ''}
                      </span>
                      {invite.expiresAt && (
                        <span>
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {invite.lastUsedAt && (
                        <span>Last used {formatInviteDate(invite.lastUsedAt)}</span>
                      )}
                      {!invite.isActive && invite.deactivatedAt && (
                        <span>Deactivated {formatInviteDate(invite.deactivatedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyInvite(invite)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      {copySuccessId === invite._id ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() =>
                        setInviteDeleteConfirm({ isOpen: true, inviteId: invite._id, label: invite.label })
                      }
                      className="px-3 py-1.5 text-sm rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={9} />
        ) : players.length === 0 ? (
          <EmptyState
            title="No players found"
            message="Try adjusting your filters or add a new player"
          />
        ) : (
          <Table
            headers={['Image', 'Name', 'Location', 'Role', 'Category', 'Base Price', 'Sold Price', 'Team', 'Actions']}
          >
            <TableRows
              players={players}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onImageClick={(url, name) => {
                setSelectedPlayerImage({ url, name });
                setShowImageViewer(true);
              }}
            />
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
        title={editingPlayer ? 'Edit Player' : 'Add Player'}
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">

          <FormInput
            label="Tournament"
            name="tournamentId"
            type="select"
            required
            disabled={editingPlayer && editingPlayer.soldPrice && editingPlayer.soldTo}
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
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
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
            label="Location"
            name="location"
              type="text"
            value={formik.values.location}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.location}
            touched={formik.touched.location}
            placeholder="Enter location"
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
              { value: 'Wicket Keeper', label: 'Wicket Keeper' },
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
            name="categoryId"
            type="select"
            required
            value={formik.values.categoryId}
            onChange={handleCategoryChange}
            onBlur={formik.handleBlur}
            error={formik.errors.categoryId}
            touched={formik.touched.categoryId}
            options={[
              { value: '', label: 'Select Category' },
              ...getCategoryOptionsForForm()
            ]}
          />

          <FormInput
            label="Base Price (from category)"
            name="basePrice"
            type="text"
            disabled
            value={formik.values.basePrice ? formatCurrency(Number(formik.values.basePrice)) : 'N/A'}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.basePrice}
            touched={formik.touched.basePrice}
            placeholder="Auto-filled from category"
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

          <div className="border-t pt-4 mt-4">
            <FormInput
              label="Player Note"
              name="note"
              type="textarea"
              value={formik.values.note}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  formik.handleChange(e);
                }
              }}
              onBlur={formik.handleBlur}
              error={formik.errors.note}
              touched={formik.touched.note}
              placeholder="Share additional details (max 500 characters)"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {formik.values.note.length}/500 characters
            </p>
          </div>

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

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteForm({ label: '', maxUses: '', expiresAt: '' });
        }}
        title="Create Player Invitation"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <FormInput
            label="Link Label"
            name="inviteLabel"
            type="text"
            value={inviteForm.label}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Open Registration"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Max Uses (optional)"
              name="inviteMaxUses"
              type="number"
              min="1"
              value={inviteForm.maxUses}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              placeholder="Leave blank for unlimited"
            />
            <FormInput
              label="Expires On (optional)"
              name="inviteExpiresAt"
              type="date"
              value={inviteForm.expiresAt}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>
          <p className="text-sm text-gray-500">
            Players who receive this link will see the {selectedTournamentDetails?.name || 'tournament'} name and can submit their details without choosing a tournament.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setInviteModalOpen(false);
                setInviteForm({ label: '', maxUses: '', expiresAt: '' });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteSubmitting || !selectedTournament}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteSubmitting ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={inviteDeleteConfirm.isOpen}
        onClose={() => setInviteDeleteConfirm({ isOpen: false, inviteId: null, label: '' })}
        onConfirm={confirmInviteDelete}
        title="Delete Invitation Link"
        message={`Delete the invite "${inviteDeleteConfirm.label}"? Players will no longer be able to use it.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

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

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedPlayerImage.url}
        playerName={selectedPlayerImage.name}
      />
    </div>
  );
}
