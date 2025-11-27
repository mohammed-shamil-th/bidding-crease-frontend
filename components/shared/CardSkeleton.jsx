'use client';

export default function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white overflow-hidden shadow rounded-lg animate-pulse"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="bg-gray-200 p-3 rounded-md w-16 h-16" />
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

