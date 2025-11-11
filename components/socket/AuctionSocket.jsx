'use client';

import { useEffect, useState } from 'react';
import { getSocket, joinAuction, leaveAuction } from '@/lib/socket';

export default function useAuctionSocket(tournamentId, onEvent = null) {
  const [socket, setSocket] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBidPrice, setCurrentBidPrice] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!tournamentId) return;

    const socketInstance = getSocket();
    setSocket(socketInstance);

    // Join auction room
    joinAuction(tournamentId);

    // Listen for auction events
    socketInstance.on('auction:started', (data) => {
      setIsActive(data.isActive);
    });

    socketInstance.on('player:selected', (data) => {
      setCurrentPlayer(data.player);
      setCurrentBidPrice(data.currentBidPrice);
      setIsActive(true);
      if (onEvent) {
        onEvent({ type: 'playerSelected', player: data.player });
      }
    });

    socketInstance.on('bid:placed', (data) => {
      setCurrentBidPrice(data.currentBidPrice);
      if (onEvent) {
        onEvent({ type: 'bid', teamName: data.teamName, bidAmount: data.bidAmount });
      }
    });

    socketInstance.on('player:sold', (data) => {
      setCurrentPlayer(null);
      setCurrentBidPrice(null);
      setIsActive(false);
      if (onEvent) {
        onEvent({
          type: 'sold',
          playerName: data.player.name,
          teamName: data.team.name,
          price: data.player.soldPrice,
        });
      }
      // Update teams
      setTeams((prevTeams) =>
        prevTeams.map((team) =>
          team._id === data.team.id
            ? {
                ...team,
                remainingAmount: data.team.remainingAmount,
                playerCount: data.team.playerCount,
              }
            : team
        )
      );
    });

    socketInstance.on('player:unsold', (data) => {
      setCurrentPlayer(null);
      setCurrentBidPrice(null);
      setIsActive(false);
      if (onEvent) {
        onEvent({
          type: 'unsold',
          playerName: data.player.name,
          teamName: null,
          price: null,
        });
      }
    });

    socketInstance.on('team:updated', (data) => {
      setTeams((prevTeams) =>
        prevTeams.map((team) =>
          team._id === data.teamId
            ? {
                ...team,
                remainingAmount: data.remainingAmount,
                playerCount: data.playerCount,
              }
            : team
        )
      );
    });

    // Cleanup
    return () => {
      leaveAuction(tournamentId);
    };
  }, [tournamentId]);

  return {
    socket,
    currentPlayer,
    currentBidPrice,
    isActive,
    teams,
    setTeams,
    setCurrentPlayer,
    setCurrentBidPrice,
    setIsActive,
  };
}

