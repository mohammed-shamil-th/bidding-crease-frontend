'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { teamAPI, playerAPI, tournamentAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Modal from '@/components/shared/Modal';
import FormInput from '@/components/shared/FormInput';
import Link from 'next/link';

export default function TeamDetailPage() {
  const params = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soldEditModal, setSoldEditModal] = useState({ isOpen: false, player: null });
  const [teams, setTeams] = useState([]);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchTeamDetails();
    }
  }, [params.id]);

  useEffect(() => {
    if (team && team.tournamentId) {
      fetchAllTeams();
    }
  }, [team]);

  const fetchAllTeams = async () => {
    try {
      const tournamentId = team?.tournamentId?._id || team?.tournamentId;
      if (tournamentId) {
        const response = await teamAPI.getAll({ tournamentId });
        setTeams(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getById(params.id);
      const teamData = response.data.data;
      setTeam(teamData);

      // Players are already populated from backend
      if (teamData.players && teamData.players.length > 0) {
        const playersData = teamData.players
          .map((player) => {
            // If it's already an object (populated), use it
            if (typeof player === 'object' && player !== null && player.name) {
              return player;
            }
            return null;
          })
          .filter((p) => p !== null);
        setPlayers(playersData);
      } else {
        setPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-8">
        <div className="text-xl text-red-600">Team not found</div>
        <Link href="/admin/teams" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Teams
        </Link>
      </div>
    );
  }

  const handleSoldEdit = async (soldPrice, soldTo) => {
    try {
      setSubmitError('');
      const formData = new FormData();
      formData.append('soldPrice', soldPrice || '');
      formData.append('soldTo', soldTo || '');
      
      await playerAPI.update(soldEditModal.player._id, formData);
      setSoldEditModal({ isOpen: false, player: null });
      // Refresh team details to get updated amounts and player counts
      fetchTeamDetails();
      fetchAllTeams();
    } catch (error) {
      console.error('Error updating sold player:', error);
      setSubmitError(error.response?.data?.message || 'Error updating sold player');
    }
  };

  const totalSpent = players.reduce((sum, player) => sum + (player.soldPrice || 0), 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/teams"
            className="text-primary-600 hover:text-primary-900 mb-2 inline-block"
          >
            ← Back to Teams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Team Details and Squad</p>
        </div>
        {team.logo && (
          <img src={team.logo} alt={team.name} className="h-20 w-20 object-cover rounded-lg" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Information */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Owner</p>
                <p className="text-lg font-medium text-gray-900">{team.owner}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="text-lg font-medium text-gray-900">{team.mobile}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-lg font-medium text-gray-900">{formatCurrency(team.budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining Amount</p>
                <p className="text-lg font-bold text-primary-600">
                  {formatCurrency(team.remainingAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Players Count</p>
                <p className="text-lg font-medium text-gray-900">{players.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Squad */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Squad</h2>
            {players.length > 0 ? (
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <PlayerAvatar player={player} size="md" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-bold text-gray-900">{player.name}</p>
                          {player.category === 'Icon' && (
                            <span className="text-yellow-500" title="Icon Player">⭐</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{player.role}</p>
                        <p className="text-xs text-gray-500">{player.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(player.soldPrice)}
                        </p>
                        <p className="text-xs text-gray-500">Sold Price</p>
                      </div>
                      <button
                        onClick={() => setSoldEditModal({ isOpen: true, player })}
                        className="px-3 py-1 text-sm text-primary-600 hover:text-primary-900 border border-primary-300 rounded-md hover:bg-primary-50"
                      >
                        Edit Sale
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl">No players in squad yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sold Player Edit Modal */}
      <Modal
        isOpen={soldEditModal.isOpen}
        onClose={() => {
          setSoldEditModal({ isOpen: false, player: null });
          setSubmitError('');
        }}
        title="Edit Sold Player Details"
      >
        {soldEditModal.player && (
          <SoldPlayerEditForm
            player={soldEditModal.player}
            teams={teams}
            onSave={handleSoldEdit}
            onCancel={() => {
              setSoldEditModal({ isOpen: false, player: null });
              setSubmitError('');
            }}
            error={submitError}
          />
        )}
      </Modal>
    </div>
  );
}

// Sold Player Edit Form Component
function SoldPlayerEditForm({ player, teams, onSave, onCancel, error }) {
  const [soldPrice, setSoldPrice] = useState(player.soldPrice?.toString() || '');
  const [soldTo, setSoldTo] = useState(player.soldTo?._id || player.soldTo || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(soldPrice, soldTo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Player Name
        </label>
        <input
          type="text"
          value={player.name}
          disabled
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-500 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sold Price <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={soldPrice}
          onChange={(e) => setSoldPrice(e.target.value)}
          min="0"
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter sold price"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sold To (Team) <span className="text-red-500">*</span>
        </label>
        <select
          value={soldTo}
          onChange={(e) => setSoldTo(e.target.value)}
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select Team</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Update'}
        </button>
      </div>
    </form>
  );
}

