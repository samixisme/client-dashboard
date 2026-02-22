import React from 'react';

const LINKWARDEN_URL = 'https://links.samixism.com';

const LinksPage: React.FC = () => (
    <div className="w-full flex-1 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <iframe
            src={LINKWARDEN_URL}
            title="Linkwarden"
            className="w-full flex-1 border-0"
            style={{ height: '100%' }}
            allow="clipboard-write"
        />
    </div>
);

export default LinksPage;
