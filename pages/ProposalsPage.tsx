
import React from 'react';
import { useSearch } from '../contexts/SearchContext';

const proposalsData = [
  { id: 'P001', title: 'Q3 Marketing Campaign', submitter: 'Alice Johnson', status: 'Approved' },
  { id: 'P002', title: 'New Website Redesign', submitter: 'Bob Williams', status: 'Pending' },
  { id: 'P003', title: 'Mobile App Development', submitter: 'Charlie Brown', status: 'Approved' },
  { id: 'P004', title: 'Cloud Infrastructure Upgrade', submitter: 'Diana Prince', status: 'Rejected' },
  { id: 'P005', title: 'Data Analytics Platform', submitter: 'Ethan Hunt', status: 'Pending' },
  { id: 'P006', title: 'Employee Wellness Program', submitter: 'Fiona Glenanne', status: 'Approved' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  let colorClasses = '';
  switch (status) {
    case 'Approved':
      colorClasses = 'bg-green-500/20 text-green-400';
      break;
    case 'Pending':
      colorClasses = 'bg-yellow-500/20 text-yellow-400';
      break;
    case 'Rejected':
      colorClasses = 'bg-red-500/20 text-red-400';
      break;
  }
  return <span className={`${baseClasses} ${colorClasses}`}>{status}</span>;
};


const ProposalsPage = () => {
  const { searchQuery } = useSearch();

  const filteredProposals = proposalsData.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.submitter.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary">Proposals</h1>
      <p className="mt-2 text-text-secondary">Review and manage submitted proposals.</p>

      <div className="mt-8 bg-glass rounded-lg border border-border-color overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-glass-light">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Submitter</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {filteredProposals.length > 0 ? (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-glass-light">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{proposal.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{proposal.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{proposal.submitter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={proposal.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-text-secondary">
                    No proposals found for "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProposalsPage;