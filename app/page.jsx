'use client';

import { useEffect, useState } from 'react';
import { tournamentAPI, auctionAPI, teamAPI, playerAPI } from '@/lib/api';
import useAuctionSocket from '@/components/socket/AuctionSocket';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import UserHeader from '@/components/shared/UserHeader';
import ImageViewerModal from '@/components/shared/ImageViewerModal';

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [teams, setTeams] = useState([]);
  const [lastPlayers, setLastPlayers] = useState([]);
  const [lastPlayersLimit, setLastPlayersLimit] = useState(5);
  const [hasMorePlayers, setHasMorePlayers] = useState(false);
  const [currentBidTeam, setCurrentBidTeam] = useState(null);
  const [notification, setNotification] = useState(null);
  const [maxBids, setMaxBids] = useState({});
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPlayerImage, setSelectedPlayerImage] = useState({ url: '', name: '' });

  const {
    currentPlayer,
    currentBidPrice,
    isActive,
    teams: socketTeams,
    setTeams: setSocketTeams,
    setCurrentPlayer,
    setCurrentBidPrice,
    setIsActive,
  } = useAuctionSocket(selectedTournament, (data) => {
    // Handle bid placed - show team name
    if (data.type === 'bid') {
      setCurrentBidTeam(data.teamName);
    }
    // Handle player sold/unsold
    if (data.type === 'sold' || data.type === 'unsold') {
      setNotification({
        type: data.type,
        playerName: data.playerName,
        teamName: data.teamName,
        price: data.price,
      });
      // Fetch last 5 players
      fetchLastPlayers();
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
    // Handle new player selected
    if (data.type === 'playerSelected') {
      fetchLastPlayers();
      setCurrentBidTeam(null);
    }
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
      fetchCurrentAuction();
      fetchLastPlayers();
      fetchMaxBids();
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (socketTeams.length > 0) {
      setTeams(socketTeams);
    }
  }, [socketTeams]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
      // Select first ongoing tournament, or first tournament
      const ongoing = response.data.data.find((t) => t.status === 'ongoing');
      if (ongoing) {
        setSelectedTournament(ongoing._id);
      } else if (response.data.data.length > 0) {
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
      setTeams(response.data.data);
      setSocketTeams(response.data.data);
      fetchMaxBids();
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMaxBids = async () => {
    if (!selectedTournament) return;
    try {
      const response = await auctionAPI.getMaxBids(selectedTournament);
      if (response.data.success) {
        const bidsMap = {};
        response.data.data.forEach((item) => {
          bidsMap[item.teamId] = item.maxBid;
        });
        setMaxBids(bidsMap);
      }
    } catch (error) {
      console.error('Error fetching max bids:', error);
    }
  };

  const fetchLastPlayers = async (limit = lastPlayersLimit) => {
    if (!selectedTournament) return;
    try {
      // Get only players that have been auctioned (wasAuctioned = true)
      // This includes both sold and unsold players who appeared in the auction
      const response = await playerAPI.getAll({
        tournamentId: selectedTournament,
        wasAuctioned: 'true',
        limit: limit + 1, // Fetch one more to check if there are more
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      
      const players = response.data.data || [];
      
      // Check if there are more players available
      setHasMorePlayers(players.length > limit || response.data.total > limit);
      
      // Slice to the requested limit
      setLastPlayers(players.slice(0, limit));
    } catch (error) {
      console.error('Error fetching last players:', error);
    }
  };

  const handleSeeMore = () => {
    const newLimit = lastPlayersLimit + 10;
    setLastPlayersLimit(newLimit);
    fetchLastPlayers(newLimit);
  };

  const fetchCurrentAuction = async () => {
    try {
      const response = await auctionAPI.getCurrent(selectedTournament);
      if (response.data.success && response.data.data) {
        const { currentPlayer: player, currentBidPrice: bidPrice, isActive: active } = response.data.data;
        // Set initial state from API response (socket will update it in real-time)
        if (player) {
          setCurrentPlayer(player);
          setCurrentBidPrice(bidPrice || player.basePrice);
          setIsActive(active || true);
        } else {
          // No active auction
          setCurrentPlayer(null);
          setCurrentBidPrice(null);
          setIsActive(false);
        }
      }
    } catch (error) {
      console.error('Error fetching current auction:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tournament Selector - Enhanced */}
        <div className="mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-2xl p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Select Tournament
              </label>
              {selectedTournament ? (() => {
                const selectedTournamentData = tournaments.find(t => t._id === selectedTournament);
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      {selectedTournamentData?.logo ? (
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                          <Image
                            src={selectedTournamentData.logo}
                            alt={selectedTournamentData.name || 'Tournament Logo'}
                            fill
                            className="object-contain rounded-lg"
                            sizes="(max-width: 640px) 48px, 56px"
                          />
                        </div>
                      ) : (
                        <span className="text-2xl sm:text-3xl flex-shrink-0">🏆</span>
                      )}
                      <h3 className="text-2xl sm:text-3xl font-bold text-primary-700">
                        {selectedTournamentData?.name || 'Tournament'}
                      </h3>
                    </div>
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/80 backdrop-blur-sm text-primary-700 border border-primary-200 shadow-sm">
                      {selectedTournamentData?.status || ''}
                    </span>
                  </div>
                );
              })() : (
                <p className="text-lg sm:text-xl font-semibold text-gray-400 italic">
                  No tournament selected
                </p>
              )}
            </div>
            <div className="sm:w-72 flex-shrink-0">
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full px-4 py-3 text-sm border-2 border-primary-200 rounded-xl shadow-sm bg-white text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300"
              >
                <option value="">Select Tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name} ({tournament.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Auction */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Player - Enhanced */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Auction</h2>
                {isActive && (
                  <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-sm font-bold shadow-lg animate-pulse w-fit flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    LIVE
                  </span>
                )}
              </div>
              {currentPlayer ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-blue-200 rounded-full blur-xl opacity-50"></div>
                      <PlayerAvatar
                        player={currentPlayer}
                        size="xl"
                        clickable={!!currentPlayer?.image}
                        onClick={() => {
                          if (currentPlayer?.image) {
                            setSelectedPlayerImage({ url: currentPlayer.image, name: currentPlayer.name });
                            setShowImageViewer(true);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <Link href={`/players/${currentPlayer._id}`} className="text-3xl sm:text-4xl font-bold text-gray-900 hover:text-primary-600 break-words transition-colors">
                          {currentPlayer.name}
                        </Link>
                        {currentPlayer.category === 'Icon' && (
                          <span className="text-yellow-500 text-2xl sm:text-3xl flex-shrink-0" title="Icon Player">⭐</span>
                        )}
                      </div>
                      <p className="text-xl sm:text-2xl text-gray-600 font-medium mb-2">{currentPlayer.role}</p>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        {currentPlayer.battingStyle && (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            Batting: {currentPlayer.battingStyle}
                          </span>
                        )}
                        {currentPlayer.bowlingStyle && (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            Bowling: {currentPlayer.bowlingStyle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl">
                      <span className="text-base font-medium text-gray-600">Base Price</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(currentPlayer.basePrice)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 px-5 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border-2 border-primary-200">
                      <span className="text-xl sm:text-2xl font-bold text-gray-700">Current Bid</span>
                      <span className="text-4xl sm:text-5xl font-bold text-primary-600 transition-all duration-300 transform hover:scale-105">
                        {formatCurrency(currentBidPrice || currentPlayer.basePrice)}
                      </span>
                    </div>
                    {currentBidTeam && (
                      <div className="text-center sm:text-left pt-2">
                        <span className="text-sm text-gray-600">Bid by: </span>
                        <span className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                          {currentBidTeam}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 text-gray-400">
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="text-xl font-medium">No auction in progress</p>
                  <p className="text-sm mt-2">Wait for the auction to start</p>
                </div>
              )}
              
              {/* Notification - Enhanced */}
              {notification && (
                <div
                  className={`mt-6 p-5 rounded-xl border-2 shadow-md ${
                    notification.type === 'sold'
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900 mb-1">{notification.playerName}</p>
                      {notification.type === 'sold' ? (
                        <p className="text-sm font-medium text-green-700">
                          ✅ SOLD to <span className="font-bold">{notification.teamName}</span> for {formatCurrency(notification.price)}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-gray-700">❌ UNSOLD</p>
                      )}
                    </div>
                    <button
                      onClick={() => setNotification(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Players - Enhanced */}
              {lastPlayers.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Recent Players</h3>
                  </div>
                  <div className="space-y-2">
                    {lastPlayers.map((player, index) => (
                      <div
                        key={player._id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } border border-gray-100`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <PlayerAvatar
                            player={player}
                            size="sm"
                            clickable={!!player.image}
                            onClick={() => {
                              if (player.image) {
                                setSelectedPlayerImage({ url: player.image, name: player.name });
                                setShowImageViewer(true);
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Link href={`/players/${player._id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate">
                                {player.name}
                              </Link>
                              {player.category === 'Icon' && (
                                <span className="text-yellow-500 text-sm flex-shrink-0" title="Icon Player">⭐</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 font-medium">{player.role}</p>
                            {player.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-xs text-gray-400">{player.location}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          {player.soldPrice ? (
                            <>
                              <p className="text-base font-bold text-green-600 mb-1">
                                {formatCurrency(player.soldPrice)}
                              </p>
                              <Link href={`/teams/${player.soldTo?._id || player.soldTo}`} className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline">
                                {player.soldTo?.name || 'Sold'}
                              </Link>
                            </>
                          ) : (
                            <span className="inline-block px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
                              Unsold
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMorePlayers && (
                    <button
                      onClick={handleSeeMore}
                      className="mt-4 w-full py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
                    >
                      See More (Load 10 more)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Teams List - Enhanced */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Teams</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {teams.length > 0 ? (
                teams.map((team, index) => {
                  const teamColors = [
                    'from-yellow-400 to-yellow-500',
                    'from-green-400 to-green-500',
                    'from-purple-400 to-purple-500',
                    'from-blue-400 to-blue-500',
                    'from-pink-400 to-pink-500',
                    'from-indigo-400 to-indigo-500',
                    'from-red-400 to-red-500',
                    'from-teal-400 to-teal-500',
                  ];
                  const colorClass = teamColors[index % teamColors.length];
                  const initials = team.name
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  
                  return (
                    <Link
                      key={team._id}
                      href={`/teams/${team._id}`}
                      className="block p-4 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 mb-2 truncate hover:text-primary-600 transition-colors">
                            {team.name}
                          </h3>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 font-medium">Balance</span>
                              <span className="text-sm font-bold text-gray-900">
                                {formatCurrency(team.remainingAmount)}
                              </span>
                            </div>
                            {maxBids[team._id] !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 font-medium">Max Bid</span>
                                <span className="text-sm font-bold text-primary-600">
                                  {formatCurrency(maxBids[team._id])}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 font-medium">Players</span>
                              <span className="text-sm font-bold text-gray-900">
                                {team.players?.length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No teams available</p>
              )}
            </div>
          </div>
        </div>
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

