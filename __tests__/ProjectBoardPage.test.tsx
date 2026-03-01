jest.mock('@/components/ui/button', () => ({ Button: 'button' }), { virtual: true });
jest.mock('@/components/ui/popover', () => ({ Popover: 'div', PopoverTrigger: 'div', PopoverContent: 'div' }), { virtual: true });
jest.mock('@/components/ui/textarea', () => ({ Textarea: 'textarea' }), { virtual: true });
jest.mock('../components/ui/textarea', () => ({ Textarea: 'textarea' }), { virtual: true });
jest.mock('../components/board/views/KanbanView', () => () => <div data-testid="kanban-view">To Do In Progress First Task Second Task</div>);
jest.mock('../components/board/views/ListView', () => () => <div data-testid="list-view">To Do In Progress First Task Second Task</div>);
jest.mock('../components/board/views/TableView', () => () => <div data-testid="table-view">To Do In Progress First Task Second Task</div>);

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectBoardPage from '../pages/ProjectBoardPage';
import { useData } from '../contexts/DataContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ droppableProps: {}, innerRef: jest.fn(), placeholder: <div /> }, {}),
  Draggable: ({ children }: any) => children({ draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() }, {}),
}));

jest.mock('../components/TaskModal', () => () => <div data-testid="task-modal">Task Modal</div>);

const mockUseData = useData as jest.Mock;

const mockProject = { id: 'p1', name: 'Test Project' };
const mockStages = [
  { id: 's1', projectId: 'p1', name: 'To Do', order: 0 },
  { id: 's2', projectId: 'p1', name: 'In Progress', order: 1 }
];
const mockTasks = [
  { id: 't1', stageId: 's1', title: 'First Task', description: 'Do it', order: 0 },
  { id: 't2', stageId: 's2', title: 'Second Task', description: 'Doing it', order: 0 }
];

describe('ProjectBoardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/board/b1']}>
        <Routes>
          <Route path="/board/:boardId" element={<ProjectBoardPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('shows loading or error if project not found', async () => {
    mockUseData.mockReturnValue({ data: { projects: [], stages: [], tasks: [], boards: [] }, loading: false });
    renderComponent();
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
  });

  it('renders board with stage columns', async () => {
    mockUseData.mockReturnValue({
      data: { projects: [mockProject], stages: mockStages, tasks: mockTasks, boards: [{id: 'b1', projectId: 'p1'}] },
      loading: false,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('kanban-view')).toBeTruthy());
  });

  it('handles view switching (kanban/list/table)', async () => {
    mockUseData.mockReturnValue({
      data: { projects: [mockProject], stages: mockStages, tasks: mockTasks, boards: [{id: 'b1', projectId: 'p1'}] },
      loading: false,
    });
    renderComponent();
    const user = userEvent.setup();
    
    await waitFor(() => expect(screen.getByTestId('kanban-view')).toBeTruthy());

    const listViewButton = screen.getByRole('button', { name: /List/i });
    await user.click(listViewButton);
    
    // Check if testid list-view is rendered
    expect(screen.getByTestId('list-view')).toBeTruthy();
  });
});



