import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TimerProvider, useTimer } from '../contexts/TimerContext';
import { useData } from '../contexts/DataContext';
import { addDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseData = useData as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;

const TestConsumer = () => {
  const { runningTimer, startTimer, stopTimer } = useTimer();
  return (
    <div>
      <span data-testid="hasTimer">{runningTimer ? 'yes' : 'no'}</span>
      <span data-testid="taskId">{runningTimer?.taskId || ''}</span>
      <span data-testid="startTime">{runningTimer?.startTime || ''}</span>
      
      <button data-testid="startTimer" onClick={() => startTimer('mock-task-1')}>Start</button>
      <button data-testid="stopTimer" onClick={stopTimer}>Stop</button>
    </div>
  );
};

describe('TimerContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseData.mockReturnValue({
      data: {
        projects: [{ id: 'proj-1', name: 'Project 1' }],
        boards: [{ id: 'board-1', projectId: 'proj-1' }],
        tasks: [{ id: 'mock-task-1', boardId: 'board-1', title: 'Task 1' }],
        time_logs: [],
        clients: [],
        brands: [],
        invoices: []
      },
      forceUpdate: jest.fn(),
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows initial runningTimer is null', () => {
    render(
      <TimerProvider>
        <TestConsumer />
      </TimerProvider>
    );
    expect(screen.getByTestId('hasTimer').textContent).toBe('no');
  });

  it('sets runningTimer with correct shape when startTimer is called', () => {
    jest.setSystemTime(new Date('2026-02-26T12:00:00.000Z').getTime());
    
    render(
      <TimerProvider>
        <TestConsumer />
      </TimerProvider>
    );
    
    act(() => {
      screen.getByTestId('startTimer').click();
    });
    
    expect(screen.getByTestId('hasTimer').textContent).toBe('yes');
    expect(screen.getByTestId('taskId').textContent).toBe('mock-task-1');
    expect(screen.getByTestId('startTime').textContent).toBe(new Date('2026-02-26T12:00:00.000Z').getTime().toString());
  });

  it('calls Firestore addDoc to create a TimeLog and clears runningTimer when stopTimer is called', async () => {
    jest.setSystemTime(new Date('2026-02-26T12:00:00.000Z').getTime());
    
    render(
      <TimerProvider>
        <TestConsumer />
      </TimerProvider>
    );
    
    act(() => {
      screen.getByTestId('startTimer').click();
    });
    
    expect(screen.getByTestId('hasTimer').textContent).toBe('yes');
    
    // Advance time to simulate 10 seconds of tracked time
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    await act(async () => {
      screen.getByTestId('stopTimer').click();
    });
    
    expect(screen.getByTestId('hasTimer').textContent).toBe('no');
    
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(), // collection reference
      expect.objectContaining({
        taskId: 'mock-task-1',
        userId: 'user-1',
        duration: 10,
        date: expect.any(String),
      })
    );
  });

  it('tracks elapsed seconds effectively before stopTimer is called', async () => {
    jest.setSystemTime(new Date('2026-02-26T12:00:00.000Z').getTime());
    
    render(
      <TimerProvider>
        <TestConsumer />
      </TimerProvider>
    );
    
    act(() => {
      screen.getByTestId('startTimer').click();
    });
    
    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    await act(async () => {
      screen.getByTestId('stopTimer').click();
    });
    
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 5,
      })
    );
  });

  it('throws when useTimer is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useTimer must be used within a TimerProvider');

    spy.mockRestore();
  });
});
