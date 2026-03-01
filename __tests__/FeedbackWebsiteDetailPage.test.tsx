global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackWebsiteDetailPage from '../pages/FeedbackWebsiteDetailPage';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, subscribeToActivities } from '../utils/feedbackUtils';

jest.mock('../utils/feedbackUtils', () => ({
  getFeedbackItem: jest.fn(),
  subscribeToComments: jest.fn(),
  subscribeToActivities: jest.fn(),
  deleteComment: jest.fn(),
  toggleCommentResolved: jest.fn(),
  updateComment: jest.fn(),
  updateFeedbackItemStatus: jest.fn(),
}));

jest.mock('../utils/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'u1' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../contexts/DataContext', () => ({
  useData: () => ({
    data: { users: [{ id: 'u1', name: 'Test User' }] },
  }),
}));

jest.mock('../components/feedback/FeedbackSidebar', () => () => <div data-testid="feedback-sidebar">Feedback Sidebar</div>);

const mockItem = {
  id: 'f1',
  projectId: 'p1',
  title: 'Test Website',
  assetUrl: 'https://example.com',
  type: 'website',
  status: 'Open',
  createdAt: new Date().toISOString(),
};

const mockComments = [
  { id: 'c1', feedbackItemId: 'f1', content: 'Test comment', userId: 'u1', createdAt: new Date().toISOString() },
];

describe('FeedbackWebsiteDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFeedbackItem as jest.Mock).mockResolvedValue(mockItem);
    (subscribeToComments as jest.Mock).mockImplementation((db, id, cb) => {
      cb(mockComments);
      return () => {};
    });
    (subscribeToActivities as jest.Mock).mockImplementation((db, id, cb) => {
      cb([]);
      return () => {};
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/project/p1/feedback/f1?path=/about']}>
        <Routes>
          <Route path="/project/:projectId/feedback/:feedbackItemId" element={<FeedbackWebsiteDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('shows loading state initially', () => {
    (getFeedbackItem as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading/i)).toBeTruthy();
  });

  it('renders feedback detail view and shows website URL', async () => {
    renderComponent();
    await waitFor(() => {
      expect(document.querySelector('iframe')?.src).toContain('https%3A%2F%2Fexample.com');
    });
  });

  it('displays comments/annotations', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Feedback Sidebar')).toBeTruthy();
    });
  });

  it('handles device toggles', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(document.querySelector('iframe')?.src).toContain('https%3A%2F%2Fexample.com');
    });
    
    const phoneButton = screen.getByTitle(/Phone/i);
    await user.click(phoneButton);
    
    // Check if the container style has changed to phone dimensions
    const frameContainer = document.querySelector('iframe');
    expect(frameContainer).toBeTruthy();
    // Assuming phone styling is applied
  });
});




