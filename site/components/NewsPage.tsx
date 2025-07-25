import React from 'react';

const NewsPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 bg-light-primary dark:bg-dark-primary p-4 md:p-8">
      <h1 className="text-4xl font-bold uppercase tracking-wider text-dark-primary dark:text-light-primary">
        Новости
      </h1>
      <iframe
        className="rounded-lg shadow-xl max-w-full"
        width="720"
        height="405"
        src="https://rutube.ru/play/embed/b0b06d54d56fe206333eff845ccd0d06"
        frameBorder="0"
        allow="clipboard-write; autoplay"
        allowFullScreen
        title="Rutube video player"
      ></iframe>
    </div>
  );
};

export default NewsPage;
