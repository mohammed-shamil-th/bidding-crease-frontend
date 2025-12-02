'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tournamentAPI } from '@/lib/api';
import TournamentSelector from './TournamentSelector';
import AppLogo from './AppLogo';

export default function UserHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const pathname = usePathname();

  const navigation = [
    { name: 'Live Auction', href: '/' },
    { name: 'Players', href: '/players' },
    { name: 'Teams', href: '/teams' },
    { name: 'Tournament', href: '/tournament' },
  ];

  useEffect(() => {
    fetchTournaments();
    // Load selected tournament from sessionStorage
    try {
      const saved = sessionStorage.getItem('selectedTournament');
      if (saved) {
        setSelectedTournament(saved);
      }
    } catch (error) {
      console.error('Error loading tournament from sessionStorage:', error);
    }
  }, []);

  useEffect(() => {
    // Save selected tournament to sessionStorage whenever it changes
    try {
      if (selectedTournament) {
        sessionStorage.setItem('selectedTournament', selectedTournament);
      } else {
        sessionStorage.removeItem('selectedTournament');
      }
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('tournamentChanged', { detail: selectedTournament }));
    } catch (error) {
      console.error('Error saving tournament to sessionStorage:', error);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data.data);
      // If no tournament is selected and tournaments exist, select first one
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

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <AppLogo/>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:space-x-4 lg:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side: Tournament Selector and Mobile menu button */}
          <div className="flex items-center gap-2">
            {/* Tournament Selector - Always visible */}
            <TournamentSelector
              tournaments={tournaments}
              currentTournament={selectedTournament}
              onSelectTournament={setSelectedTournament}
            />

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                aria-controls="mobile-menu"
                aria-expanded="false"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        id="mobile-menu"
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

