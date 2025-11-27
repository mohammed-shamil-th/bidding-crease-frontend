'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tournamentAPI, teamAPI, playerAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import CardSkeleton from '@/components/shared/CardSkeleton';
import Loader from '@/components/shared/Loader';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    tournaments: 0,
    teams: 0,
    players: 0,
    soldPlayers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all data without pagination limits to get accurate totals
        const [tournamentsRes, teamsRes, playersRes] = await Promise.all([
          tournamentAPI.getAll({ limit: 1000 }),
          teamAPI.getAll({ limit: 1000 }),
          playerAPI.getAll({ limit: 1000 }),
        ]);

        // Calculate totals from response
        const tournamentsTotal = tournamentsRes.data.total || 0;
        const teamsTotal = teamsRes.data.total || 0;
        const playersTotal = playersRes.data.total || 0;
        
        // Count sold players from the data
        const soldPlayers = (playersRes.data.data || []).filter(
          (p) => p.soldPrice !== null && p.soldTo !== null
        );

        setStats({
          tournaments: tournamentsTotal,
          teams: teamsTotal,
          players: playersTotal,
          soldPlayers: soldPlayers.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Overview of your auction platform
          </p>
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tournaments',
      value: stats.tournaments,
      link: '/admin/tournaments',
      color: 'bg-blue-500',
    },
    {
      title: 'Teams',
      value: stats.teams,
      link: '/admin/teams',
      color: 'bg-green-500',
    },
    {
      title: 'Players',
      value: stats.players,
      link: '/admin/players',
      color: 'bg-purple-500',
    },
    {
      title: 'Sold Players',
      value: stats.soldPlayers,
      link: '/admin/players',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your auction platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            href={stat.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-md`}>
                  <div className="text-white text-2xl font-bold">{stat.value}</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/admin/auction"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Go to Auction Control Panel
        </Link>
      </div>
    </div>
  );
}

