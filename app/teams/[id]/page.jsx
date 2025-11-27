'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { teamAPI, tournamentAPI } from '@/lib/api';
import { formatCurrency, getCategoryIcon } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Link from 'next/link';
import UserHeader from '@/components/shared/UserHeader';

export default function TeamDetailPage() {
  const params = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [tournament, setTournament] = useState(null);
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

      // Fetch tournament to get categories
      if (teamData.tournamentId) {
        const tournamentId = teamData.tournamentId._id || teamData.tournamentId;
        try {
          const tournamentResponse = await tournamentAPI.getById(tournamentId);
          setTournament(tournamentResponse.data.data);
        } catch (error) {
          console.error('Error fetching tournament:', error);
        }
      }

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
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/teams"
              className="text-primary-600 hover:text-primary-900 mb-2 inline-block text-sm sm:text-base"
            >
              ← Back to Teams
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{team.name}</h1>
            <p className="mt-2 text-sm text-gray-600">Team Details and Squad</p>
          </div>
          {team.logo && (
            <img src={team.logo} alt={team.name} className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg flex-shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Team Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Team Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Owner</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{team.owner}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Mobile</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{team.mobile}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Budget</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{formatCurrency(team.budget)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Remaining Amount</p>
                  <p className="text-base sm:text-lg font-bold text-primary-600">
                    {formatCurrency(team.remainingAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Spent</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Players Count</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{players.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Squad */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Squad</h2>
              {players.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {players.map((player) => (
                    <div
                      key={player._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 gap-3 sm:gap-0"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <PlayerAvatar player={player} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/players/${player._id}`}
                              className="text-base sm:text-lg font-bold text-gray-900 hover:text-primary-600 truncate"
                            >
                              {player.name}
                            </Link>
                            {(() => {
                              const categoryIcon = getCategoryIcon(player, tournament);
                              return categoryIcon ? (
                                <span className="flex-shrink-0" role="img" aria-label={player.category || 'Category icon'} title={player.category}>
                                  {categoryIcon}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">{player.role}</p>
                          <p className="text-xs text-gray-500">{player.category}</p>
                          {player.location && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="text-xs text-gray-500">{player.location}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="text-base sm:text-lg font-bold text-green-600">
                          {formatCurrency(player.soldPrice)}
                        </p>
                        <p className="text-xs text-gray-500">Sold Price</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <p className="text-lg sm:text-xl">No players in squad yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

