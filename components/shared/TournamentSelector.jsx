'use client';

import { useState, useEffect, useRef } from 'react';

export default function TournamentSelector({ tournaments, currentTournament, onSelectTournament }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track if button was clicked to prevent click-outside from interfering
  const buttonClickedRef = useRef(false);

  // Close dropdown/bottom sheet when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Reset the flag after a short delay
      if (buttonClickedRef.current) {
        buttonClickedRef.current = false;
        return;
      }

      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use click event instead of mousedown to avoid conflicts
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const currentTournamentData = tournaments.find((t) => t._id === currentTournament);
  const currentTournamentName = currentTournamentData?.name || 'All Tournaments';

  const handleSelect = (tournamentId) => {
    onSelectTournament(tournamentId);
    setIsOpen(false);
  };

  // Trophy icon component - Classic trophy cup design
  const TrophyIcon = ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4h12v6a6 6 0 11-12 0V4z" />
      <path d="M12 14v7" />
      <path d="M8 21h8" />
      <path d="M18 4h2v2a4 4 0 01-4 4" />
      <path d="M6 4H4v2a4 4 0 004 4" />
    </svg>
  );
  
  

  return (
    <>
      {/* Desktop: Rounded pill button */}
      <div className="hidden md:block relative">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            buttonClickedRef.current = true;
            setIsOpen(prev => !prev);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Select tournament"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <TrophyIcon className="w-5 h-5 text-primary-600" />
          <span className="max-w-[200px] truncate">{currentTournamentName}</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Desktop Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 max-h-[400px] overflow-y-auto"
            role="menu"
            aria-orientation="vertical"
          >
            <button
              onClick={() => handleSelect('')}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                !currentTournament ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
              }`}
              role="menuitem"
            >
              <div className="flex items-center gap-2">
                <TrophyIcon className="w-4 h-4 text-gray-500" />
                <span>All Tournaments</span>
              </div>
            </button>
            {tournaments.map((tournament) => (
              <button
                key={tournament._id}
                onClick={() => handleSelect(tournament._id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  currentTournament === tournament._id
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <TrophyIcon className={`w-4 h-4 ${currentTournament === tournament._id ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span className="truncate">{tournament.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: Icon button */}
      <div className="md:hidden relative">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            buttonClickedRef.current = true;
            setIsOpen(prev => !prev);
          }}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          aria-label="Select tournament"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <TrophyIcon className="w-6 h-6 text-primary-600" />
        </button>

        {/* Mobile Bottom Sheet */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <div
              ref={dropdownRef}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col animate-slide-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tournament-selector-title"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 id="tournament-selector-title" className="text-lg font-semibold text-gray-900">
                  Select Tournament
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tournament List */}
              <div className="flex-1 overflow-y-auto py-2">
                <button
                  onClick={() => handleSelect('')}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    !currentTournament ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  <TrophyIcon className="w-5 h-5 text-gray-500" />
                  <span>All Tournaments</span>
                  {!currentTournament && (
                    <svg className="w-5 h-5 ml-auto text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                {tournaments.map((tournament) => (
                  <button
                    key={tournament._id}
                    onClick={() => handleSelect(tournament._id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      currentTournament === tournament._id
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    <TrophyIcon className={`w-5 h-5 ${currentTournament === tournament._id ? 'text-primary-600' : 'text-gray-500'}`} />
                    <span className="flex-1 truncate">{tournament.name}</span>
                    {currentTournament === tournament._id && (
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

