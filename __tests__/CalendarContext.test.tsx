import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { CalendarProvider, useCalendar } from '../contexts/CalendarContext';

const TestConsumer = () => {
  const { view, setView, currentDate, navigateDate, today } = useCalendar();
  return (
    <div>
      <span data-testid="view">{view}</span>
      <span data-testid="currentDate">{currentDate.toISOString()}</span>
      <button data-testid="setWeekView" onClick={() => setView('week')}>Set Week View</button>
      <button data-testid="navigateForward" onClick={() => navigateDate(1)}>Navigate Forward</button>
      <button data-testid="navigateBackward" onClick={() => navigateDate(-1)}>Navigate Backward</button>
      <button data-testid="goToToday" onClick={today}>Go To Today</button>
    </div>
  );
};

describe('CalendarContext', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('shows initial view is "month"', () => {
    render(
      <CalendarProvider>
        <TestConsumer />
      </CalendarProvider>
    );
    expect(screen.getByTestId('view').textContent).toBe('month');
  });

  it('changes the view when setView("week") is called', () => {
    render(
      <CalendarProvider>
        <TestConsumer />
      </CalendarProvider>
    );
    
    act(() => {
      screen.getByTestId('setWeekView').click();
    });
    
    expect(screen.getByTestId('view').textContent).toBe('week');
  });

  it('advances the date by one period when navigating forward', () => {
    render(
      <CalendarProvider>
        <TestConsumer />
      </CalendarProvider>
    );
    
    expect(screen.getByTestId('currentDate').textContent).toBe('2026-02-26T12:00:00.000Z');
    
    act(() => {
      screen.getByTestId('navigateForward').click();
    });
    
    expect(screen.getByTestId('currentDate').textContent).toBe('2026-03-26T12:00:00.000Z');
  });

  it('moves the date back by one period when navigating backward', () => {
    render(
      <CalendarProvider>
        <TestConsumer />
      </CalendarProvider>
    );
    
    // currently month view
    act(() => {
      screen.getByTestId('navigateBackward').click();
    });
    
    expect(screen.getByTestId('currentDate').textContent).toBe('2026-01-26T12:00:00.000Z');
  });

  it('resets to current date when goToToday() is called', () => {
    render(
      <CalendarProvider>
        <TestConsumer />
      </CalendarProvider>
    );
    
    act(() => {
      screen.getByTestId('navigateForward').click();
      screen.getByTestId('navigateForward').click();
    });
    
    expect(screen.getByTestId('currentDate').textContent).not.toBe('2026-02-26T12:00:00.000Z');
    
    act(() => {
      screen.getByTestId('goToToday').click();
    });
    
    expect(screen.getByTestId('currentDate').textContent).toBe('2026-02-26T12:00:00.000Z');
  });
  
  it('throws when useCalendar is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useCalendar must be used within CalendarProvider');

    spy.mockRestore();
  });
});
