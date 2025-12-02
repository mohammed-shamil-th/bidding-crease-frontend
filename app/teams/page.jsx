'use client';

import { useEffect, useState } from 'react';
import { teamAPI, tournamentAPI } from '@/lib/api';
import { formatCurrency, getCategoryIcon } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import TeamAvatar from '@/components/shared/TeamAvatar';
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
  const [showTeamImageViewer, setShowTeamImageViewer] = useState(false);
  const [selectedTeamImage, setSelectedTeamImage] = useState({ url: '', name: '' });
  const [pdfModalTeam, setPdfModalTeam] = useState(null);
  const [downloadingTeamId, setDownloadingTeamId] = useState(null);

  useEffect(() => {
    fetchTournaments();
    // Load tournament from sessionStorage
    try {
      const saved = sessionStorage.getItem('selectedTournament');
      if (saved) {
        setSelectedTournament(saved);
      }
    } catch (error) {
      console.error('Error loading tournament from sessionStorage:', error);
    }

    // Listen for tournament changes from header
    const handleTournamentChange = (event) => {
      setSelectedTournament(event.detail || '');
    };
    window.addEventListener('tournamentChanged', handleTournamentChange);
    return () => window.removeEventListener('tournamentChanged', handleTournamentChange);
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
      // Only set default if no tournament is already selected from sessionStorage
      try {
        const saved = sessionStorage.getItem('selectedTournament');
        if (!saved && response.data.data.length > 0) {
          setSelectedTournament(response.data.data[0]._id);
        }
      } catch (error) {
        // If sessionStorage fails, just set first tournament
        if (response.data.data.length > 0) {
          setSelectedTournament(response.data.data[0]._id);
        }
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

  const handleOpenPdfModal = (team) => {
    setPdfModalTeam(team);
  };

  const handleClosePdfModal = () => {
    if (downloadingTeamId) return;
    setPdfModalTeam(null);
  };

  const handleDownloadTeamPdf = async (includePrices) => {
    if (!pdfModalTeam) return;
    try {
      setDownloadingTeamId(pdfModalTeam._id);
      const response = await teamAPI.downloadTeamReport(pdfModalTeam._id, includePrices);
      if (typeof window === 'undefined') return;

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const suffix = includePrices ? 'with-prices' : 'players';
      link.href = url;
      link.download = `${pdfModalTeam.name?.replace(/\s+/g, '_') || 'team'}_${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPdfModalTeam(null);
    } catch (error) {
      console.error('Error downloading team PDF:', error);
      alert('Unable to download the PDF right now. Please try again.');
    } finally {
      setDownloadingTeamId(null);
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          onClick={(e) => {
                            if (team.logo && team.logo.trim() !== '') {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTeamImage({ url: team.logo, name: team.name });
                              setShowTeamImageViewer(true);
                            }
                          }}
                        >
                          <TeamAvatar
                            team={team}
                            size="lg"
                            clickable={team.logo && team.logo.trim() !== ''}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/teams/${team._id}`} className="block">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-1 hover:opacity-90 transition-opacity">
                              {team.name}
                            </h2>
                          </Link>
                          <p className="text-white/90 text-sm sm:text-base">Owner: {team.owner}</p>
                        </div>
                      </div>
                      {/* <button
                        type="button"
                        onClick={() => handleOpenPdfModal(team)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:bg-white/25 transition-all"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5m0 0l5-5m-5 5V3" />
                        </svg>
                        <span>Download PDF</span>
                      </button> */}
                    </div>
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
                                  {(() => {
                                    const tournament = tournaments.find(t => t._id === selectedTournament);
                                    const categoryIcon = getCategoryIcon(player, tournament);
                                    return categoryIcon ? (
                                      <span className="text-sm flex-shrink-0" role="img" aria-label={player.category || 'Category icon'} title={player.category}>
                                        {categoryIcon}
                                      </span>
                                    ) : null;
                                  })()}
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

      {pdfModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={handleClosePdfModal}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-gray-100">
            <button
              onClick={handleClosePdfModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
              disabled={!!downloadingTeamId}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-5">
              <p className="text-lg font-semibold text-gray-900">Download "{pdfModalTeam.name}" Squad</p>
              <p className="text-sm text-gray-500 mt-1">
                Choose what details to include in the PDF. Files are generated instantly with premium formatting.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleDownloadTeamPdf(true)}
                disabled={downloadingTeamId === pdfModalTeam._id}
                className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-primary-600 text-white text-sm font-semibold shadow-lg shadow-primary-600/30 hover:bg-primary-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>Include Prices</span>
                {downloadingTeamId === pdfModalTeam._id ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <span className="text-white/90 text-xs">Player list + prices</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTeamPdf(false)}
                disabled={downloadingTeamId === pdfModalTeam._id}
                className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white hover:border-gray-300 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>Player List Only</span>
                <span className="text-gray-500 text-xs">Names + roles</span>
              </button>
              <button
                type="button"
                onClick={handleClosePdfModal}
                disabled={downloadingTeamId === pdfModalTeam._id}
                className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedPlayerImage.url}
        playerName={selectedPlayerImage.name}
      />

      <ImageViewerModal
        isOpen={showTeamImageViewer}
        onClose={() => setShowTeamImageViewer(false)}
        imageUrl={selectedTeamImage.url}
        teamName={selectedTeamImage.name}
      />
    </div>
  );
}

