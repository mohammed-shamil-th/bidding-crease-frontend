'use client';

import { useEffect, useState } from 'react';
import { teamAPI, tournamentAPI, playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PlayerAvatar from '@/components/shared/PlayerAvatar';

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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-3xl font-bold text-primary-600">
              BiddingCrease
            </Link>
            <nav className="flex space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Live Auction
              </Link>
              <Link href="/players" className="text-gray-600 hover:text-gray-900">
                Players
              </Link>
              <Link href="/teams" className="text-gray-900 font-medium">
                Teams
              </Link>
              <Link href="/tournament" className="text-gray-600 hover:text-gray-900">
                Tournament
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="mt-2 text-sm text-gray-600">View all teams and squads</p>
          </div>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div key={team._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
                {team.logo && (
                  <img src={team.logo} alt={team.name} className="h-12 w-12 object-cover" />
                )}
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">Owner: {team.owner}</p>
                <p className="text-sm text-gray-600">
                  Budget: {formatCurrency(team.budget)}
                </p>
                <p className="text-sm font-bold text-gray-900">
                  Remaining: {formatCurrency(team.remainingAmount)}
                </p>
                <p className="text-sm text-gray-600">
                  Players: {team.playersData?.length || 0}
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Squad</h3>
                <div className="space-y-2">
                  {team.playersData && team.playersData.length > 0 ? (
                    team.playersData.map((player) => (
                      <div key={player._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <PlayerAvatar player={player} size="sm" />
                          <div>
                            <div className="flex items-center space-x-1">
                              <p className="text-sm font-medium text-gray-900">{player.name}</p>
                              {player.category === 'Icon' && (
                                <span className="text-yellow-500" title="Icon Player">⭐</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{player.role}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(player.soldPrice)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No players yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

