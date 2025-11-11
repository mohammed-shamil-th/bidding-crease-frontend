'use client';

import { useEffect, useState } from 'react';
import { teamAPI, tournamentAPI, playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import UserHeader from '@/components/shared/UserHeader';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
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

  const fetchTeams = async () => {
    try {
      const params = selectedTournament ? { tournamentId: selectedTournament } : {};
      const response = await teamAPI.getAll(params);
      // Players are already populated from backend
      const teamsWithPlayers = response.data.data.map((team) => {
        // If players are already populated objects, use them directly
        // Otherwise, they might be IDs that need fetching
        const playersData = (team.players || []).map((player) => {
          // If it's already an object (populated), use it
          if (typeof player === 'object' && player !== null && player.name) {
            return player;
          }
          // Otherwise it's an ID, return null (will be filtered out)
          return null;
        }).filter((p) => p !== null);
        
        return { ...team, playersData };
      });
      setTeams(teamsWithPlayers);
    } catch (error) {
      console.error('Error fetching teams:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teams</h1>
            <p className="mt-2 text-sm text-gray-600">View all teams and squads</p>
          </div>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {teams.length > 0 ? (
            teams.map((team) => (
              <div key={team._id} className="bg-white shadow rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Link href={`/teams/${team._id}`} className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-primary-600">
                    {team.name}
                  </Link>
                  {team.logo && (
                    <img src={team.logo} alt={team.name} className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded" />
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-xs sm:text-sm text-gray-600">Owner: {team.owner}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Budget: {formatCurrency(team.budget)}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-gray-900">
                    Remaining: {formatCurrency(team.remainingAmount)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Players: {team.playersData?.length || 0}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Squad</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {team.playersData && team.playersData.length > 0 ? (
                      team.playersData.map((player) => (
                        <Link key={player._id} href={`/players/${player._id}`} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <PlayerAvatar player={player} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{player.name}</p>
                                {player.category === 'Icon' && (
                                  <span className="text-yellow-500 flex-shrink-0" title="Icon Player">⭐</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{player.role}</p>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                            {formatCurrency(player.soldPrice)}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-500">No players yet</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p className="text-lg">No teams found</p>
              <p className="text-sm mt-2">Try selecting a different tournament</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

