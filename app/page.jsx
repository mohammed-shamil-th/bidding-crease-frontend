'use client';

import { useEffect, useState } from 'react';
import { tournamentAPI, auctionAPI, teamAPI, playerAPI } from '@/lib/api';
import useAuctionSocket from '@/components/socket/AuctionSocket';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PlayerAvatar from '@/components/shared/PlayerAvatar';

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [teams, setTeams] = useState([]);
  const [lastPlayers, setLastPlayers] = useState([]);
  const [currentBidTeam, setCurrentBidTeam] = useState(null);
  const [notification, setNotification] = useState(null);
  const [maxBids, setMaxBids] = useState({});

  const {
    currentPlayer,
    currentBidPrice,
    isActive,
    teams: socketTeams,
    setTeams: setSocketTeams,
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

  const fetchLastPlayers = async () => {
    if (!selectedTournament) return;
    try {
      // Get last 5 sold players first
      const soldResponse = await playerAPI.getAll({
        tournamentId: selectedTournament,
        sold: 'true',
        limit: 5,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      
      // If we have less than 5 sold players, get unsold ones too
      let recentPlayers = soldResponse.data.data || [];
      if (recentPlayers.length < 5) {
        const unsoldResponse = await playerAPI.getAll({
          tournamentId: selectedTournament,
          unsold: 'true',
          limit: 5 - recentPlayers.length,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        recentPlayers = [...recentPlayers, ...(unsoldResponse.data.data || [])].slice(0, 5);
      }
      
      setLastPlayers(recentPlayers);
    } catch (error) {
      console.error('Error fetching last players:', error);
    }
  };

  const fetchCurrentAuction = async () => {
    try {
      const response = await auctionAPI.getCurrent(selectedTournament);
      if (response.data.success && response.data.data.currentPlayer) {
        // Current player and bid will be updated via socket
      }
    } catch (error) {
      console.error('Error fetching current auction:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary-600">BiddingCrease</h1>
            <nav className="flex space-x-4">
              <Link href="/players" className="text-gray-600 hover:text-gray-900">
                Players
              </Link>
              <Link href="/teams" className="text-gray-600 hover:text-gray-900">
                Teams
              </Link>
              <Link href="/tournament" className="text-gray-600 hover:text-gray-900">
                Tournament
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tournament
          </label>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select Tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name} ({tournament.status})
              </option>
            ))}
          </select>
        </div>

        {/* Live Auction */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Player */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Live Auction</h2>
                {isActive && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              {currentPlayer ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <PlayerAvatar player={currentPlayer} size="xl" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/players/${currentPlayer._id}`} className="text-3xl font-bold text-gray-900 hover:text-primary-600">
                          {currentPlayer.name}
                        </Link>
                        {currentPlayer.category === 'Icon' && (
                          <span className="text-yellow-500 text-2xl" title="Icon Player">⭐</span>
                        )}
                      </div>
                      <p className="text-xl text-gray-600">{currentPlayer.role}</p>
                      {currentPlayer.battingStyle && (
                        <p className="text-sm text-gray-500">Batting: {currentPlayer.battingStyle}</p>
                      )}
                      {currentPlayer.bowlingStyle && (
                        <p className="text-sm text-gray-500">Bowling: {currentPlayer.bowlingStyle}</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(currentPlayer.basePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-2xl font-bold text-gray-900">Current Bid:</span>
                      <span className="text-4xl font-bold text-primary-600">
                        {formatCurrency(currentBidPrice || currentPlayer.basePrice)}
                      </span>
                    </div>
                    {currentBidTeam && (
                      <div className="mt-2 text-center">
                        <span className="text-sm text-gray-600">Bid by: </span>
                        <span className="text-sm font-bold text-primary-600">{currentBidTeam}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-xl">No auction in progress</p>
                  <p className="text-sm mt-2">Wait for the auction to start</p>
                </div>
              )}
              
              {/* Notification */}
              {notification && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    notification.type === 'sold'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{notification.playerName}</p>
                      {notification.type === 'sold' ? (
                        <p className="text-sm text-green-700">
                          SOLD to {notification.teamName} for {formatCurrency(notification.price)}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700">UNSOLD</p>
                      )}
                    </div>
                    <button
                      onClick={() => setNotification(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Last 5 Players */}
              {lastPlayers.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Players</h3>
                  <div className="space-y-2">
                    {lastPlayers.map((player) => (
                      <div
                        key={player._id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
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
                        <div className="text-right">
                          {player.soldPrice ? (
                            <>
                              <p className="text-sm font-bold text-green-600">
                                {formatCurrency(player.soldPrice)}
                              </p>
                              <Link href={`/teams/${player.soldTo?._id || player.soldTo}`} className="text-xs text-gray-500 hover:text-primary-600">
                                {player.soldTo?.name || 'Sold'}
                              </Link>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Unsold</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Teams List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Teams</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <div key={team._id} className="p-3 rounded-md border border-gray-200">
                  <Link href={`/teams/${team._id}`} className="font-medium text-gray-900 hover:text-primary-600">
                    {team.name}
                  </Link>
                  <div className="text-sm text-gray-600">
                    Balance: {formatCurrency(team.remainingAmount)}
                  </div>
                  {maxBids[team._id] !== undefined && (
                    <div className="text-sm font-medium text-primary-600">
                      Max Bid: {formatCurrency(maxBids[team._id])}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Players: {team.players?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

