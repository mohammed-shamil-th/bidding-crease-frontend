'use client';

import { useEffect, useState, useRef } from 'react';
import { playerAPI, tournamentAPI } from '@/lib/api';
import { formatCurrency, debounce } from '@/lib/utils';
import Link from 'next/link';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import Pagination from '@/components/shared/Pagination';
import SearchInput from '@/components/shared/SearchInput';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Debounced search handler
  const debouncedSearchRef = useRef(
    debounce((value) => {
      setSearchQuery(value);
    }, 500)
  );

  useEffect(() => {
    debouncedSearchRef.current(searchInput);
  }, [searchInput]);

  useEffect(() => {
    fetchPlayers(1, pagination.limit);
  }, [selectedTournament, filter, categoryFilter, sortBy, sortOrder, searchQuery]);

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

  const fetchPlayers = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (selectedTournament) params.tournamentId = selectedTournament;
      if (filter === 'sold') params.sold = 'true';
      if (filter === 'unsold') params.unsold = 'true';
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await playerAPI.getAll(params);
      setPlayers(response.data.data);
      setPagination({
        page: response.data.page,
        limit: limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchPlayers(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    fetchPlayers(1, newLimit);
  };

  // Filter players by search query on client side if backend doesn't support it
  const filteredPlayers = searchQuery
    ? players.filter((player) =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : players;

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
              <Link href="/players" className="text-gray-900 font-medium">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Players</h1>
            <p className="mt-2 text-sm text-gray-600">View all players</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search players..."
            />
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id}>
                  {tournament.name}
                </option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Players</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="Icon">Icon</option>
              <option value="Local">Local</option>
              <option value="Guest">Guest</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => (
            <div key={player._id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="flex justify-center items-center bg-gray-100 h-48">
                <PlayerAvatar player={player} size="xl" />
              </div>
              <div className="p-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-gray-900">{player.name}</h3>
                  {player.category === 'Icon' && (
                    <span className="text-yellow-500" title="Icon Player">⭐</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{player.role}</p>
                <p className="text-sm text-gray-500">{player.category}</p>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Base Price: {formatCurrency(player.basePrice)}
                  </p>
                  {player.soldPrice && (
                    <p className="text-sm font-bold text-green-600">
                      Sold: {formatCurrency(player.soldPrice)}
                    </p>
                  )}
                  {player.soldTo && (
                    <p className="text-sm text-gray-600">
                      Team:{' '}
                      <Link href={`/teams/${player.soldTo._id || player.soldTo}`} className="text-primary-600 hover:text-primary-900">
                        {player.soldTo.name}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPlayers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">No players found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          limit={pagination.limit}
          onLimitChange={handleLimitChange}
          totalItems={pagination.total}
        />
      </main>
    </div>
  );
}

