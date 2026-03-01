import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialMediaPage from '../pages/SocialMediaPage';
import { useSocialMediaStore } from '../stores/socialMediaStore';

jest.mock('../stores/socialMediaStore', () => ({
  useSocialMediaStore: jest.fn(),
}));

jest.mock('../components/social-media/AccountsList', () => () => <div data-testid="accounts-list">Accounts List</div>);
jest.mock('../components/social-media/OverviewSection', () => () => <div data-testid="overview-section">Overview Section</div>);
jest.mock('../components/social-media/PostAnalyticsSection', () => () => <div data-testid="post-analytics">Posts Feed</div>);
jest.mock('../components/social-media/PostScheduler', () => () => <div data-testid="post-scheduler">Post Scheduler</div>);
jest.mock('../components/social-media/EngagementChart', () => () => <div data-testid="engagement-chart">Engagement Chart</div>);
jest.mock('../utils/socialAuth', () => ({
  connectPlatform: jest.fn(),
  disconnectPlatform: jest.fn(),
  refreshPlatformData: jest.fn(),
  handleOAuthCallback: jest.fn().mockResolvedValue({ success: false }),
}));

const mockStore = useSocialMediaStore as unknown as jest.Mock;

const mockAccounts = [
  { id: 'acc1', platform: 'instagram', username: 'testuser' },
];
const mockPosts = [
  { id: 'p1', content: 'Test Post', platform: 'instagram', metrics: { likes: 10, comments: 2, shares: 1, reach: 100 }, publishedAt: new Date().toISOString() }
];

describe('SocialMediaPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders accounts list when Accounts tab is selected', async () => {
    mockStore.mockReturnValue({
      activeTab: 'accounts',
      setActiveTab: jest.fn(),
      initListeners: () => [jest.fn()],
      accounts: mockAccounts,
      posts: mockPosts,
      overviews: [],
      anomalies: [],
      scheduledPosts: [],
      loading: false,
    });
    
    render(<SocialMediaPage />);
    expect(screen.getByTestId('accounts-list')).toBeTruthy();
  });

  it('renders posts feed (analytics section) on analytics tab', async () => {
    mockStore.mockReturnValue({
      activeTab: 'analytics',
      setActiveTab: jest.fn(),
      initListeners: () => [jest.fn()],
      accounts: mockAccounts,
      posts: mockPosts,
      overviews: [],
      anomalies: [],
      scheduledPosts: [],
      loading: false,
    });
    render(<SocialMediaPage />);
    expect(screen.getByTestId('post-analytics')).toBeTruthy();
  });

  it('shows connected platforms buttons/tabs', async () => {
    const setActiveTabMock = jest.fn();
    mockStore.mockReturnValue({
      activeTab: 'overview',
      setActiveTab: setActiveTabMock,
      initListeners: () => [jest.fn()],
      accounts: mockAccounts,
      posts: mockPosts,
      overviews: [],
      anomalies: [],
      scheduledPosts: [],
      loading: false,
    });
    const user = userEvent.setup();
    render(<SocialMediaPage />);
    
    const accountsTab = screen.getByRole('button', { name: /Accounts/i });
    expect(accountsTab).toBeTruthy();
    
    await user.click(accountsTab);
    expect(setActiveTabMock).toHaveBeenCalledWith('accounts');
  });
});
