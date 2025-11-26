'use client';

export default function PlayerAvatar({ player, size = 'md', clickable = false, onClick }) {
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-24 w-24 text-2xl',
    xl: 'h-32 w-32 text-3xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (player?.image) {
    const imageElement = (
      <img
        src={player.image}
        alt={player.name || 'Player'}
        className={`${sizeClass} rounded-full object-cover ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      />
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

  const initials = getInitials(player?.name);
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  const colorIndex = (player?.name?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-bold`}
    >
      {initials}
    </div>
  );
}

