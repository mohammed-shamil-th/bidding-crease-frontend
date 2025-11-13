'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PlayerAvatar from '@/components/shared/PlayerAvatar';
import ImageViewerModal from '@/components/shared/ImageViewerModal';
import Link from 'next/link';
import UserHeader from '@/components/shared/UserHeader';

export default function PlayerDetailPage() {
  const params = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPlayerDetails();
    }
  }, [params.id]);

  const fetchPlayerDetails = async () => {
    try {
      setLoading(true);
      const response = await playerAPI.getById(params.id);
      setPlayer(response.data.data);
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Player not found</div>
          <Link href="/players" className="text-primary-600 hover:underline">
            Back to Players
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/players"
            className="text-primary-600 hover:text-primary-900 mb-2 inline-block text-sm sm:text-base"
          >
            ← Back to Players
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{player.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Player Profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Player Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <PlayerAvatar
                  player={player}
                  size="xl"
                  clickable={!!player?.image}
                  onClick={() => player?.image && setShowImageViewer(true)}
                />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Player Information</h2>
              <div className="space-y-3">
                {player.playerNumber && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Player Number</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900">#{player.playerNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Name</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{player.name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Mobile</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{player.mobile}</p>
                </div>
                {player.location && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Location</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900">{player.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Role</p>
                  <p className="text-base sm:text-lg font-medium text-gray-900">{player.role}</p>
                </div>
                {player.battingStyle && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Batting Style</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900">{player.battingStyle}</p>
                  </div>
                )}
                {player.bowlingStyle && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Bowling Style</p>
                    <p className="text-base sm:text-lg font-medium text-gray-900">{player.bowlingStyle}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Category</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-base sm:text-lg font-medium text-gray-900">{player.category}</p>
                    {player.category === 'Icon' && (
                      <span className="text-yellow-500 text-lg sm:text-xl flex-shrink-0" title="Icon Player">⭐</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Base Price</p>
                  <p className="text-base sm:text-lg font-bold text-primary-600">{formatCurrency(player.basePrice)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sale Information */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Sale Information</h2>
              {player.soldPrice && player.soldTo ? (
                <div className="space-y-4">
                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-green-800">Status</span>
                      <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded">
                        SOLD
                      </span>
                    </div>
                    <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">Sold Price</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(player.soldPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">Sold To</p>
                        <Link
                          href={`/teams/${player.soldTo._id || player.soldTo}`}
                          className="text-base sm:text-lg font-medium text-primary-600 hover:text-primary-900"
                        >
                          {player.soldTo.name || 'Unknown Team'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-800">Status</span>
                    <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm font-medium rounded">
                      UNSOLD
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament Information */}
            {player.tournamentId && (
              <div className="bg-white shadow rounded-lg p-4 sm:p-6 mt-4 sm:mt-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Tournament</h2>
                <p className="text-base sm:text-lg font-medium text-gray-900">
                  {typeof player.tournamentId === 'object' ? player.tournamentId.name : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={player?.image}
        playerName={player?.name}
      />
    </div>
  );
}

