'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { teamAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Link from 'next/link';

export default function TeamDetailPage() {
  const params = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchTeamDetails();
    }
  }, [params.id]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Team not found</div>
          <Link href="/teams" className="text-primary-600 hover:underline">
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  const totalSpent = players.reduce((sum, player) => sum + (player.soldPrice || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-primary-600 hover:text-primary-900 mb-2 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-primary-600">BiddingCrease</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/teams"
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
                            <Link
                              href={`/players/${player._id}`}
                              className="text-lg font-bold text-gray-900 hover:text-primary-600"
                            >
                              {player.name}
                            </Link>
                            {player.category === 'Icon' && (
                              <span className="text-yellow-500" title="Icon Player">⭐</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{player.role}</p>
                          <p className="text-xs text-gray-500">{player.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(player.soldPrice)}
                        </p>
                        <p className="text-xs text-gray-500">Sold Price</p>
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
      </main>
    </div>
  );
}

