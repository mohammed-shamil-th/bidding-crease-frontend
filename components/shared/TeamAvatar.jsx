'use client';

import Image from 'next/image';

export default function TeamAvatar({ team, size = 'md', clickable = false, onClick }) {
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeConfig = {
    sm: { size: 'h-8 w-8', text: 'text-xs' },
    md: { size: 'h-10 w-10', text: 'text-sm' },
    lg: { size: 'h-16 w-16', text: 'text-lg' },
    xl: { size: 'h-20 w-20', text: 'text-xl' },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Check if team has a logo (not empty string, null, or undefined)
  if (team?.logo && team.logo.trim() !== '') {
    const imageElement = (
      <div className={`relative ${config.size} rounded-xl overflow-hidden ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
        <Image
          src={team.logo}
          alt={team.name || 'Team'}
          fill
          className="object-cover"
          sizes={size === 'sm' ? '32px' : size === 'md' ? '40px' : size === 'lg' ? '64px' : '80px'}
        />
      </div>
    );

    if (clickable && onClick) {
      return (
        <div onClick={onClick} className="inline-block">
          {imageElement}
        </div>
      );
    }

    return imageElement;
  }

  // Fallback to initials with gradient background
  const initials = getInitials(team?.name);
  const colors = [
    'bg-gradient-to-br from-orange-400 to-orange-500',
    'bg-gradient-to-br from-green-400 to-green-500',
    'bg-gradient-to-br from-red-400 to-red-500',
    'bg-gradient-to-br from-blue-400 to-blue-500',
    'bg-gradient-to-br from-purple-400 to-purple-500',
    'bg-gradient-to-br from-pink-400 to-pink-500',
    'bg-gradient-to-br from-indigo-400 to-indigo-500',
    'bg-gradient-to-br from-teal-400 to-teal-500',
  ];
  const colorIndex = (team?.name?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];

  const initialsElement = (
    <div
      className={`${config.size} ${config.text} ${bgColor} rounded-xl flex items-center justify-center text-white font-bold shadow-md ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
    >
      {initials}
    </div>
  );

  if (clickable && onClick) {
    return (
      <div onClick={onClick} className="inline-block">
        {initialsElement}
      </div>
    );
  }

  return initialsElement;
}

