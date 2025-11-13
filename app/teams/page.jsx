'use client';

import { useEffect, useState } from 'react';
import { teamAPI, tournamentAPI, playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import ImageViewerModal from '@/components/shared/ImageViewerModal';
import UserHeader from '@/components/shared/UserHeader';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPlayerImage, setSelectedPlayerImage] = useState({ url: '', name: '' });

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

  // Calculate summary statistics
  const totalTeams = teams.length;
  const totalPlayers = teams.reduce((sum, team) => sum + (team.playersData?.length || 0), 0);
  const totalBudget = teams.reduce((sum, team) => sum + (team.budget || 0), 0);
  const totalRemaining = teams.reduce((sum, team) => sum + (team.remainingAmount || 0), 0);

  // Get role-based gradient colors for player avatars
  const getRoleGradient = (role) => {
    switch (role) {
      case 'All-Rounder':
        return 'from-green-500 to-emerald-600';
      case 'Bowler':
        return 'from-blue-500 to-indigo-600';
      case 'Batter':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-purple-500 to-pink-600';
    }
  };

  // Get team header background colors
  const getTeamHeaderColor = (index) => {
    const colors = [
      'bg-gradient-to-br from-orange-400 to-orange-500',
      'bg-gradient-to-br from-green-400 to-green-500',
      'bg-gradient-to-br from-red-400 to-red-500',
      'bg-gradient-to-br from-blue-400 to-blue-500',
      'bg-gradient-to-br from-purple-400 to-purple-500',
      'bg-gradient-to-br from-pink-400 to-pink-500',
      'bg-gradient-to-br from-indigo-400 to-indigo-500',
      'bg-gradient-to-br from-teal-400 to-teal-500',
    ];
    return colors[index % colors.length];
  };

  // Get team accent colors (for progress bar and accents)
  const getTeamAccentColor = (index) => {
    const colors = [
      { gradient: 'from-orange-500 to-orange-600', text: 'text-orange-700' },
      { gradient: 'from-green-500 to-green-600', text: 'text-green-700' },
      { gradient: 'from-red-500 to-red-600', text: 'text-red-700' },
      { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-700' },
      { gradient: 'from-purple-500 to-purple-600', text: 'text-purple-700' },
      { gradient: 'from-pink-500 to-pink-600', text: 'text-pink-700' },
      { gradient: 'from-indigo-500 to-indigo-600', text: 'text-indigo-700' },
      { gradient: 'from-teal-500 to-teal-600', text: 'text-teal-700' },
    ];
    return colors[index % colors.length];
  };

  // Get player initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">Teams</h1>
          <p className="text-base sm:text-lg text-gray-600">View all teams and squads</p>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Teams</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Players</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : totalPlayers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Budget</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Remaining</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No teams found"
            message="No teams available for this tournament"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map((team, index) => {
              const spent = team.budget - team.remainingAmount;
              const spentPercentage = team.budget > 0 ? (spent / team.budget) * 100 : 0;
              const headerColor = getTeamHeaderColor(index);
              const accent = getTeamAccentColor(index);
              
              return (
                <div
                  key={team._id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  {/* Team Header - Colored Background */}
                  <div className={`${headerColor} p-6 text-white`}>
                    <Link href={`/teams/${team._id}`} className="block">
                      <h2 className="text-2xl sm:text-3xl font-bold mb-2 hover:opacity-90 transition-opacity">
                        {team.name}
                      </h2>
                    </Link>
                    <p className="text-white/90 text-sm sm:text-base">Owner: {team.owner}</p>
                  </div>

                  {/* Budget Section */}
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Budget</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(team.budget)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Spent</span>
                        <span className="text-base font-semibold text-gray-900">{formatCurrency(spent)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 bg-gradient-to-r ${accent.gradient}`}
                          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{spentPercentage.toFixed(1)}% used</span>
                        <span className={`font-semibold ${accent.text}`}>{formatCurrency(team.remainingAmount)} left</span>
                      </div>
                    </div>

                    {/* Players Count */}
                    <div className="mb-4">
                      <p className="text-base font-semibold text-gray-700">
                        {team.playersData?.length || 0} Player{team.playersData?.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Squad Section */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Squad</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {team.playersData && team.playersData.length > 0 ? (
                        team.playersData.map((player) => {
                          const initials = getInitials(player.name);
                          const roleGradient = getRoleGradient(player.role);
                          
                          return (
                            <Link
                              key={player._id}
                              href={`/players/${player._id}`}
                              className="flex items-center gap-3 p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                              onClick={(e) => {
                                if (player.image) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedPlayerImage({ url: player.image, name: player.name });
                                  setShowImageViewer(true);
                                }
                              }}
                            >
                              {player.image ? (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                  <Image
                                    src={player.image}
                                    alt={player.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center flex-shrink-0`}>
                                  <span className="text-white text-sm font-bold">{initials}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{player.name}</p>
                                  {player.category === 'Icon' && (
                                    <span className="text-yellow-500 text-sm flex-shrink-0">⭐</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">{player.role}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                                {formatCurrency(player.soldPrice)}
                              </p>
                            </Link>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No players yet</p>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedPlayerImage.url}
        playerName={selectedPlayerImage.name}
      />
    </div>
  );
}

