'use client';

import { useEffect, useState } from 'react';
import { tournamentAPI, ruleAPI } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchRules();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedTournament(response.data.data[0]);
      }
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
              <Link href="/teams" className="text-gray-600 hover:text-gray-900">
                Teams
              </Link>
              <Link href="/tournament" className="text-gray-900 font-medium">
                Tournament
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tournament Information</h1>
          <p className="mt-2 text-sm text-gray-600">View tournament details and rules</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tournament
          </label>
          <select
            value={selectedTournament?._id || ''}
            onChange={(e) => {
              const tournament = tournaments.find((t) => t._id === e.target.value);
              setSelectedTournament(tournament);
            }}
            className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        {selectedTournament && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tournament Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedTournament.name}
              </h2>
              {selectedTournament.logo && (
                <img
                  src={selectedTournament.logo}
                  alt={selectedTournament.name}
                  className="h-24 w-24 object-cover rounded mb-4"
                />
              )}
              <div className="space-y-3">
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

