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

const STORAGE_KEY = 'playersPageState';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedTournamentData, setSelectedTournamentData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPlayerImage, setSelectedPlayerImage] = useState({ url: '', name: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.filter !== undefined) setFilter(parsed.filter);
        if (parsed.categoryFilter !== undefined) setCategoryFilter(parsed.categoryFilter);
        if (parsed.sortBy !== undefined) setSortBy(parsed.sortBy);
        if (parsed.sortOrder !== undefined) setSortOrder(parsed.sortOrder);
        if (parsed.searchInput !== undefined) setSearchInput(parsed.searchInput);
        if (parsed.searchQuery !== undefined) setSearchQuery(parsed.searchQuery);
        if (parsed.pagination) {
          setPagination(prev => ({
            ...prev,
            page: parsed.pagination.page || prev.page,
            limit: parsed.pagination.limit || prev.limit,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading state from sessionStorage:', error);
    }

    // Load tournament from sessionStorage
    try {
      const savedTournament = sessionStorage.getItem('selectedTournament');
      if (savedTournament) {
        setSelectedTournament(savedTournament);
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

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        filter,
        categoryFilter,
        sortBy,
        sortOrder,
        searchInput,
        searchQuery,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
        },
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to sessionStorage:', error);
    }
  }, [filter, categoryFilter, sortBy, sortOrder, searchInput, searchQuery, pagination.page, pagination.limit]);

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

  // Update selectedTournamentData when selectedTournament changes
  useEffect(() => {
    if (selectedTournament && tournaments.length > 0) {
      const tournament = tournaments.find(t => t._id === selectedTournament);
      setSelectedTournamentData(tournament || null);
    } else {
      setSelectedTournamentData(null);
    }
  }, [selectedTournament, tournaments]);

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
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit) => {
    fetchPlayers(1, newLimit);
    // Scroll to top when limit changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Backend handles search, so we use players directly
  const filteredPlayers = players;

  // Check if any filters are active
  const hasActiveFilters = selectedTournament || filter !== 'all' || categoryFilter !== 'all' || searchQuery;

  // Reset all filters
  const resetFilters = () => {
    setFilter('all');
    setCategoryFilter('all');
    setSearchInput('');
    setSearchQuery('');
    setSortBy('createdAt');
    setSortOrder('desc');
    // Clear session storage for filters (but keep tournament)
    try {
      const stateToSave = {
        filter: 'all',
        categoryFilter: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        searchInput: '',
        searchQuery: '',
        pagination: {
          page: 1,
          limit: pagination.limit,
        },
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to sessionStorage:', error);
    }
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

  // Handle Excel export
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Build params with current filters (excluding search and pagination)
      const params = {
        sortBy,
        sortOrder,
      };
      
      if (selectedTournament) params.tournamentId = selectedTournament;
      if (filter === 'sold') params.sold = 'true';
      if (filter === 'unsold') params.unsold = 'true';
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await playerAPI.exportToExcel(params);
      
      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'players-export.xlsx';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export players. Please try again.');
    } finally {
      setExportLoading(false);
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 w-full lg:w-auto lg:flex-shrink-0 lg:max-w-[600px]">
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
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Info & Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{pagination.total}</span> player{pagination.total !== 1 ? 's' : ''}
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                  Filtered
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportToExcel}
                disabled={exportLoading || loading}
                className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {exportLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </>
                )}
              </button>
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
                          {/* {(() => {
                            const categoryIcon = getCategoryIcon(player, selectedTournamentData);
                            return categoryIcon ? (
                              <span className="flex-shrink-0 text-lg" role="img" aria-label={player.category || 'Category icon'} title={player.category}>
                                {categoryIcon}
                              </span>
                            ) : null;
                          })()} */}
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

