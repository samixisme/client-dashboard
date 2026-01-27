import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CalendarView = 'day' | 'week' | 'month' | '3-month' | '6-month';

interface CalendarContextType {
    view: CalendarView;
    setView: (view: CalendarView) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    headerTitle: string;
    setHeaderTitle: (title: string) => void;
    navigateDate: (direction: number) => void;
    today: () => void;
    isCalendarPage: boolean;
    setIsCalendarPage: (value: boolean) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [headerTitle, setHeaderTitle] = useState('');
    const [isCalendarPage, setIsCalendarPage] = useState(false);

    const navigateDate = (direction: number) => {
        const newDate = new Date(currentDate);
        if (view === 'day') {
            newDate.setDate(currentDate.getDate() + direction);
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + direction * 7);
        } else if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + direction);
        } else if (view === '3-month') {
            newDate.setMonth(currentDate.getMonth() + direction * 3);
        } else if (view === '6-month') {
            newDate.setMonth(currentDate.getMonth() + direction * 6);
        }
        setCurrentDate(newDate);
    };

    const today = () => {
        setCurrentDate(new Date());
    };

    return (
        <CalendarContext.Provider
            value={{
                view,
                setView,
                currentDate,
                setCurrentDate,
                headerTitle,
                setHeaderTitle,
                navigateDate,
                today,
                isCalendarPage,
                setIsCalendarPage,
            }}
        >
            {children}
        </CalendarContext.Provider>
    );
};

export const useCalendar = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendar must be used within CalendarProvider');
    }
    return context;
};
