'use client';

import { useEffect, useState } from 'react';
import { tournamentAPI, ruleAPI } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import UserHeader from '@/components/shared/UserHeader';

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    // Listen for tournament changes from header
    const handleTournamentChange = (event) => {
      const tournamentId = event.detail || '';
      if (tournamentId && tournaments.length > 0) {
        const tournament = tournaments.find(t => t._id === tournamentId);
        if (tournament) {
          setSelectedTournament(tournament);
        } else {
          setSelectedTournament(null);
        }
      } else {
        setSelectedTournament(null);
      }
    };
    window.addEventListener('tournamentChanged', handleTournamentChange);
    return () => window.removeEventListener('tournamentChanged', handleTournamentChange);
  }, [tournaments]);

  useEffect(() => {
    // Update selectedTournament when tournaments are loaded and we have a saved tournament
    try {
      const saved = sessionStorage.getItem('selectedTournament');
      if (saved && tournaments.length > 0) {
        const tournament = tournaments.find(t => t._id === saved);
        if (tournament) {
          setSelectedTournament(tournament);
        }
      } else if (!saved && tournaments.length > 0 && !selectedTournament) {
        // Only set default if no tournament is selected and no saved tournament
        setSelectedTournament(tournaments[0]);
      }
    } catch (error) {
      console.error('Error loading tournament from sessionStorage:', error);
    }
  }, [tournaments]);

  useEffect(() => {
    if (selectedTournament) {
      fetchRules();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    if (!selectedTournament) return;
    try {
      const response = await ruleAPI.getByTournament(selectedTournament._id);
      setRules(response.data.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tournament Information</h1>
          <p className="mt-2 text-sm text-gray-600">View tournament details and rules</p>
        </div>

        {/* Tournament selection is now in header */}

        {selectedTournament && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Tournament Info */}
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {selectedTournament.name}
                </h2>
                {selectedTournament.logo && (
                  <img
                    src={selectedTournament.logo}
                    alt={selectedTournament.name}
                    className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded flex-shrink-0"
                  />
                )}
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <span className="ml-2 text-sm text-gray-900 capitalize">
                    {selectedTournament.category}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Location:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedTournament.location}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Auction Date:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {formatDateTime(selectedTournament.auctionDate)}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Tournament Date:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {formatDateTime(selectedTournament.tournamentDate)}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Team Budget:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    ₹{selectedTournament.teamBudget.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Players:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedTournament.minPlayers} - {selectedTournament.maxPlayers}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Teams:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedTournament.totalTeams}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Players:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedTournament.totalPlayers}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedTournament.status === 'ongoing'
                        ? 'bg-green-100 text-green-800'
                        : selectedTournament.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedTournament.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Rules</h2>
              <div className="space-y-4">
                {rules.length > 0 ? (
                  rules.map((rule) => (
                    <div key={rule._id} className="border-l-4 border-primary-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">{rule.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No rules added yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

