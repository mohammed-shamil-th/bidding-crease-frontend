'use client';

import { useEffect, useState } from 'react';
import { auctionAPI, tournamentAPI, teamAPI, playerAPI } from '@/lib/api';
import useAuctionSocket from '@/components/socket/AuctionSocket';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Modal from '@/components/shared/Modal';
import { formatCurrency, calculateBidIncrement, getNextBidAmount } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Link from 'next/link';

export default function AuctionPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sellConfirm, setSellConfirm] = useState({ isOpen: false, playerName: '', teamName: '' });
  const [maxBids, setMaxBids] = useState({});
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  const {
    currentPlayer,
    currentBidPrice,
    isActive,
    teams: socketTeams,
    setTeams: setSocketTeams,
    setCurrentPlayer,
    setCurrentBidPrice,
    setIsActive,
  } = useAuctionSocket(selectedTournament);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
      fetchCurrentAuction();
      fetchMaxBids();
      fetchAllPlayers();
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (socketTeams.length > 0) {
      setTeams(socketTeams);
    }
  }, [socketTeams]);

  useEffect(() => {
    if (currentBidPrice) {
      setCustomBidAmount(getNextBidAmount(currentBidPrice).toString());
    } else if (currentPlayer) {
      setCustomBidAmount(getNextBidAmount(currentPlayer.basePrice).toString());
    }
  }, [currentBidPrice, currentPlayer]);

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
      setTeams(response.data.data);
      setSocketTeams(response.data.data);
      // Refresh max bids after teams update
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

  const fetchAllPlayers = async () => {
    if (!selectedTournament) return;
    try {
      const response = await playerAPI.getAll({ tournamentId: selectedTournament, limit: 1000 });
      setAllPlayers(response.data.data || []);
      // Filter unsold players
      const unsold = (response.data.data || []).filter(
        (p) => !p.soldPrice || !p.soldTo
      );
      setUnsoldPlayers(unsold);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchCurrentAuction = async () => {
    try {
      const response = await auctionAPI.getCurrent(selectedTournament);
      if (response.data.success && response.data.data.currentPlayer) {
        setCurrentPlayer(response.data.data.currentPlayer);
        setCurrentBidPrice(response.data.data.currentBidPrice);
        setIsActive(response.data.data.isActive);
      }
    } catch (error) {
      console.error('Error fetching current auction:', error);
    }
  };

  const handleStartAuction = async () => {
    if (!selectedTournament) {
      setError('Please select a tournament');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.start(selectedTournament);
      if (response.data.success) {
        setCurrentPlayer(response.data.data.currentPlayer);
        setCurrentBidPrice(response.data.data.currentBidPrice);
        setIsActive(true);
        setSelectedTeam(''); // Reset team selection
        // Refresh teams to get latest balances
        fetchTeams();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error starting auction');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffle = async () => {
    if (!selectedTournament) {
      setError('Please select a tournament');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.shuffle(selectedTournament);
      if (response.data.success) {
        setCurrentPlayer(response.data.data.currentPlayer);
        setCurrentBidPrice(response.data.data.currentBidPrice);
        setIsActive(true);
        setSelectedTeam(''); // Reset team selection
        // Refresh teams to get latest balances
        fetchTeams();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error shuffling player');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedTournament || !selectedTeam || !customBidAmount) {
      setError('Please select team and enter bid amount');
      return;
    }
    
    // Check max bid warning
    const bidAmount = parseInt(customBidAmount);
    const maxBid = maxBids[selectedTeam];
    if (maxBid !== undefined && bidAmount > maxBid) {
      const team = teams.find((t) => t._id === selectedTeam);
      if (!confirm(`Warning: This bid (${formatCurrency(bidAmount)}) exceeds the maximum available bid (${formatCurrency(maxBid)}) for ${team?.name}. The team may not be able to afford minimum required players. Do you want to continue?`)) {
        return;
      }
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.placeBid({
        tournamentId: selectedTournament,
        teamId: selectedTeam,
        bidAmount: bidAmount,
      });
      if (response.data.success) {
        setCurrentBidPrice(response.data.data.currentBidPrice);
        setCustomBidAmount(getNextBidAmount(response.data.data.currentBidPrice).toString());
        // Update team balance
        const updatedTeams = teams.map((team) =>
          team._id === selectedTeam
            ? { ...team, remainingAmount: response.data.data.team.remainingAmount }
            : team
        );
        setTeams(updatedTeams);
        setSocketTeams(updatedTeams);
        fetchMaxBids(); // Refresh max bids
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error placing bid');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = () => {
    if (!selectedTournament || !selectedTeam) {
      setError('Please select a team');
      return;
    }
    const team = teams.find((t) => t._id === selectedTeam);
    if (currentPlayer && team) {
      setSellConfirm({ isOpen: true, playerName: currentPlayer.name, teamName: team.name });
    }
  };

  const confirmSell = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.sell(selectedTournament, selectedTeam);
      if (response.data.success) {
        setCurrentPlayer(null);
        setCurrentBidPrice(null);
        setIsActive(false);
        setSelectedTeam('');
        setSellConfirm({ isOpen: false, playerName: '', teamName: '' });
        fetchTeams();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error selling player');
      setSellConfirm({ isOpen: false, playerName: '', teamName: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnsold = async () => {
    if (!selectedTournament) {
      setError('Please select a tournament');
      return;
    }
    if (!currentPlayer) {
      setError('No player selected');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.markUnsold(selectedTournament);
      if (response.data.success) {
        setCurrentPlayer(null);
        setCurrentBidPrice(null);
        setIsActive(false);
        setSelectedTeam('');
        fetchAllPlayers(); // Refresh players list
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error marking player as unsold');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = async (playerId) => {
    if (!selectedTournament) {
      setError('Please select a tournament');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await auctionAPI.selectPlayer(selectedTournament, playerId);
      if (response.data.success) {
        setCurrentPlayer(response.data.data.currentPlayer);
        setCurrentBidPrice(response.data.data.currentBidPrice);
        setIsActive(true);
        setSelectedTeam('');
        setShowPlayerSelect(false);
        fetchAllPlayers(); // Refresh players list
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error selecting player');
    } finally {
      setLoading(false);
    }
  };

  const incrementBid = (amount) => {
    const current = currentBidPrice || currentPlayer?.basePrice || 0;
    const next = current + amount;
    setCustomBidAmount(next.toString());
  };

  const selectedTeamData = teams.find((t) => t._id === selectedTeam);
  const increment = currentBidPrice
    ? calculateBidIncrement(currentBidPrice)
    : currentPlayer
    ? calculateBidIncrement(currentPlayer.basePrice)
    : 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Auction Control Panel</h1>
        <p className="mt-2 text-sm text-gray-600">Manage live auction</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

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
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Player */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Current Player</h2>
            {currentPlayer ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <PlayerAvatar player={currentPlayer} size="xl" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/players/${currentPlayer._id}`} className="text-2xl font-bold text-gray-900 hover:text-primary-600">
                        {currentPlayer.name}
                      </Link>
                      {currentPlayer.category === 'Icon' && (
                        <span className="text-yellow-500 text-2xl" title="Icon Player">⭐</span>
                      )}
                    </div>
                    <p className="text-gray-600">{currentPlayer.role}</p>
                    {currentPlayer.battingStyle && (
                      <p className="text-sm text-gray-500">Batting: {currentPlayer.battingStyle}</p>
                    )}
                    {currentPlayer.bowlingStyle && (
                      <p className="text-sm text-gray-500">Bowling: {currentPlayer.bowlingStyle}</p>
                    )}
                    {currentPlayer.soldPrice && currentPlayer.soldTo && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          SOLD
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          to <Link href={`/admin/teams/${currentPlayer.soldTo._id}`} className="text-primary-600 hover:underline">{currentPlayer.soldTo.name}</Link>
                        </span>
                      </div>
                    )}
                    {(!currentPlayer.soldPrice || !currentPlayer.soldTo) && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                          UNSOLD
                        </span>
                      </div>
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
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-600">Current Bid:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatCurrency(currentBidPrice || currentPlayer.basePrice)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Bid Increment: +{formatCurrency(increment)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No player selected. Start auction or shuffle to select a player.
              </div>
            )}
          </div>

          {/* Bid Controls */}
          {currentPlayer && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Place Bid</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Team</option>
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name} - Remaining: {formatCurrency(team.remainingAmount)}
                        </option>
                      ))
                    ) : (
                      <option disabled>No teams available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(e.target.value)}
                      min={getNextBidAmount(currentBidPrice || currentPlayer.basePrice)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter bid amount"
                    />
                    <button
                      onClick={() => incrementBid(increment)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      +{increment}
                    </button>
                  </div>
                </div>
                {selectedTeamData && (
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    <div className="text-sm text-gray-600">
                      Team Balance: {formatCurrency(selectedTeamData.remainingAmount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      After Bid: {formatCurrency(selectedTeamData.remainingAmount - parseInt(customBidAmount || 0))}
                    </div>
                    {maxBids[selectedTeam] !== undefined && (
                      <div className={`text-sm font-medium ${
                        parseInt(customBidAmount || 0) > maxBids[selectedTeam] ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Max Available Bid: {formatCurrency(maxBids[selectedTeam])}
                        {parseInt(customBidAmount || 0) > maxBids[selectedTeam] && (
                          <span className="ml-2">⚠️ Exceeds maximum!</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePlaceBid}
                      disabled={loading || !selectedTeam || !customBidAmount}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Place Bid
                    </button>
                    <button
                      onClick={handleSell}
                      disabled={loading || !selectedTeam || !currentBidPrice}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sell Player
                    </button>
                  </div>
                  <button
                    onClick={handleMarkUnsold}
                    disabled={loading || !currentPlayer}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark as Unsold
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Controls</h2>
            <div className="space-y-4">
              <button
                onClick={handleStartAuction}
                disabled={loading || !selectedTournament}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Auction
              </button>
              <button
                onClick={handleShuffle}
                disabled={loading || !selectedTournament}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Shuffle Player
              </button>
              <button
                onClick={() => setShowPlayerSelect(true)}
                disabled={loading || !selectedTournament}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select Player Manually
              </button>
            </div>
          </div>

          {/* Teams List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Teams</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <div
                  key={team._id}
                  className={`p-3 rounded-md border ${
                    selectedTeam === team._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <Link href={`/admin/teams/${team._id}`} className="font-medium text-gray-900 hover:text-primary-600">
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
      </div>

      <ConfirmationModal
        isOpen={sellConfirm.isOpen}
        onClose={() => setSellConfirm({ isOpen: false, playerName: '', teamName: '' })}
        onConfirm={confirmSell}
        title="Sell Player"
        message={`Sell "${sellConfirm.playerName}" to "${sellConfirm.teamName}" for ${formatCurrency(currentBidPrice || currentPlayer?.basePrice || 0)}?`}
        confirmText="Sell"
        cancelText="Cancel"
        type="primary"
      />

      {/* Manual Player Selection Modal */}
      <Modal
        isOpen={showPlayerSelect}
        onClose={() => setShowPlayerSelect(false)}
        title="Select Player for Auction"
      >
        <div className="max-h-96 overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Select a player to put on auction:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="text-sm">
                <span className="font-medium">Total Players:</span> {allPlayers.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Never Auctioned:</span> {unsoldPlayers.filter(p => !p.wasAuctioned).length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Auctioned but Unsold:</span> {unsoldPlayers.filter(p => p.wasAuctioned).length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Sold:</span> {allPlayers.length - unsoldPlayers.length}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {unsoldPlayers.length > 0 ? (
              unsoldPlayers.map((player) => (
                <button
                  key={player._id}
                  onClick={() => handleSelectPlayer(player._id)}
                  disabled={loading}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayerAvatar player={player} size="md" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{player.name}</p>
                      {player.category === 'Icon' && (
                        <span className="text-yellow-500" title="Icon Player">⭐</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{player.role}</p>
                    <p className="text-xs text-gray-500">Base: {formatCurrency(player.basePrice)}</p>
                  </div>
                  {player.wasAuctioned ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded" title="Was in auction but not sold">
                      UNSOLD (Auctioned)
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded" title="Never been in auction">
                      UNSOLD
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No unsold players available</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

