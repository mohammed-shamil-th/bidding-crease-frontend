'use client';

import { useEffect, useState, useRef } from 'react';
import { playerAPI, tournamentAPI } from '@/lib/api';
import { formatCurrency, debounce, getCategoryIcon } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import ImageViewerModal from '@/components/shared/ImageViewerModal';
import Pagination from '@/components/shared/Pagination';
import SearchInput from '@/components/shared/SearchInput';
import UserHeader from '@/components/shared/UserHeader';
import EmptyState from '@/components/shared/EmptyState';
import PlayerCardSkeleton from '@/components/shared/PlayerCardSkeleton';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedTournamentData, setSelectedTournamentData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPlayerImage, setSelectedPlayerImage] = useState({ url: '', name: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const getCategoryOptions = () => {
    if (!tournaments.length) return [];

    if (selectedTournament) {
      const tournament = tournaments.find((t) => t._id === selectedTournament);
      if (!tournament || !Array.isArray(tournament.categories)) return [];

      const names = tournament.categories
        .map((c) => (c && c.name ? c.name.trim() : ''))
        .filter(Boolean);

      return Array.from(new Set(names));
    }

    const nameSet = new Set();
    tournaments.forEach((t) => {
      if (Array.isArray(t.categories)) {
        t.categories.forEach((c) => {
          const name = c && c.name ? c.name.trim() : '';
          if (name) {
            nameSet.add(name);
          }
        });
      }
    });

    return Array.from(nameSet);
  };

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

  // Backend handles search, so we use players directly
  const filteredPlayers = players;

  // Check if any filters are active
  const hasActiveFilters = selectedTournament || filter !== 'all' || categoryFilter !== 'all' || searchQuery;

  // Reset all filters
  const resetFilters = () => {
    setSelectedTournament('');
    setFilter('all');
    setCategoryFilter('all');
    setSearchInput('');
    setSearchQuery('');
    setSortBy('name');
    setSortOrder('asc');
  };

  // Get role-based gradient colors
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

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">Players</h1>
          <p className="text-base sm:text-lg text-gray-600">View and explore all players</p>
        </div>

        {/* Filters Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Bar */}
            <div className="w-full lg:flex-1 lg:min-w-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search players..."
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 w-full lg:w-auto lg:flex-shrink-0 lg:max-w-[600px]">
              <div className="relative min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={selectedTournament}
                  onChange={(e) => {
                    const tournamentId = e.target.value;
                    setSelectedTournament(tournamentId);
                    const tournament = tournaments.find(t => t._id === tournamentId);
                    setSelectedTournamentData(tournament || null);
                  }}
                  className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="">All Tournaments</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament._id} value={tournament._id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="all">All Players</option>
                  <option value="sold">Sold</option>
                  <option value="unsold">Unsold</option>
                </select>
              </div>

              <div className="relative min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="all">All Categories</option>
                  {getCategoryOptions().map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by);
                    setSortOrder(order);
                  }}
                  className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Info & Reset */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{pagination.total}</span> player{pagination.total !== 1 ? 's' : ''}
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                  Filtered
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1.5 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <PlayerCardSkeleton count={8} />
        ) : filteredPlayers.length === 0 ? (
          <EmptyState
            title="No players found"
            message="Try adjusting your filters or check back later"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredPlayers.map((player, index) => {
              const getInitials = (name) => {
                if (!name) return '??';
                const parts = name.trim().split(' ');
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              };

              const initials = getInitials(player?.name);
              const roleGradient = getRoleGradient(player?.role);

              return (
                <Link
                  key={player._id}
                  href={`/players/${player._id}`}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Player Image/Initials Section */}
                  <div
                    className="w-full h-48 sm:h-52 overflow-hidden bg-gray-100 relative"
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
                      <Image
                        src={player.image}
                        alt={player.name}
                        fill
                        className="object-cover cursor-pointer group-hover:scale-110 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${roleGradient} relative`}>
                        <span className="text-white text-4xl sm:text-5xl font-bold drop-shadow-lg">
                          {initials}
                        </span>
                      </div>
                    )}
                    
                    {/* SOLD Badge */}
                    {player.soldPrice && player.soldTo && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        SOLD
                      </div>
                    )}
                  </div>

                  {/* Player Details Section */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                            {player.name}
                          </h3>
                          {(() => {
                            const categoryIcon = getCategoryIcon(player, selectedTournamentData);
                            return categoryIcon ? (
                              <span className="flex-shrink-0 text-lg" role="img" aria-label={player.category || 'Category icon'} title={player.category}>
                                {categoryIcon}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                            {player.role}
                          </span>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                            {player.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {player.location && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-xs text-gray-500 truncate">{player.location}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Base Price</span>
                        <span className="text-sm font-bold text-gray-700">
                          {formatCurrency(player.basePrice)}
                        </span>
                      </div>
                      {player.soldPrice ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">Sold Price</span>
                            <span className="text-base font-bold text-primary-600">
                              {formatCurrency(player.soldPrice)}
                            </span>
                          </div>
                          {player.soldTo && (
                            <div className="pt-2">
                              <Link
                                href={`/teams/${player.soldTo._id || player.soldTo}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-primary-600 hover:text-primary-800 font-medium italic flex items-center gap-1 transition-colors"
                              >
                                <span>→</span>
                                {player.soldTo.name}
                              </Link>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="pt-1">
                          <span className="inline-block px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
                            Unsold
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
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

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedPlayerImage.url}
        playerName={selectedPlayerImage.name}
      />
    </div>
  );
}

