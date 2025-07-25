
import React from 'react';

const PlaceholderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const PollsPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-light-primary dark:bg-dark-primary p-8">
      <PlaceholderIcon />
      <h1 className="text-4xl font-bold mt-6 uppercase tracking-wider text-gray-500 dark:text-gray-400">Голосования</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-500">Раздел находится в разработке.</p>
    </div>
  );
};

export default PollsPage;
