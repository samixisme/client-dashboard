# Project Documentation

This document provides a comprehensive overview of the project's structure, components, and functionality.

## Table of Contents

- [Project Overview](#project-overview)
- [Folder Structure](#folder-structure)
- [Routing](#routing)
- [Components](#components)
- [Contexts](#contexts)
- [Data](#data)
- [Component Documentation](#component-documentation)

## Project Overview

This project is a modern, professional admin dashboard application with a dark mode theme, sidebar navigation, and header. It simulates a multi-page experience with mock authentication. The application is built with React and Vite, and it uses React Router for navigation.

## Folder Structure

The project is organized into the following folders:

-   `components`: Contains reusable UI components that are used throughout the application.
-   `contexts`: Contains React contexts for state management.
-   `data`: Contains mock data for the application.
-   `pages`: Contains the main pages of the application.
-   `utils`: Contains utility functions.

## Routing

The application uses React Router for navigation. The main routing logic is in the `App.tsx` file. The application has two main layouts: one for authenticated users and one for the login page. Authenticated users are directed to the main application layout, which includes a sidebar and a header. Unauthenticated users are redirected to the login page.

The main routes are:

-   `/login`: The login page.
-   `/`: The dashboard page.
-   `/dashboard`: The dashboard page.
-   `/brands`: The brands page.
-   `/brands/:brandId`: The brand detail page.
-   `/projects`: The projects page.
-   `/board/:boardId`: The project board page.
-   `/projects/:projectId/roadmap`: The project roadmap page.
-   `/payments`: The payments page.
-   `/payments/invoice/new`: The create invoice page.
-   `/calendar`: The calendar page.
-   `/brand-asset-creator`: The brand asset creator page.
-   `/feedback`: The feedback page.
-   `/feedback/:projectId`: The feedback project detail page.
-   `/feedback/:projectId/mockups`: The feedback mockups page.
-   `/feedback/:projectId/websites`: The feedback websites page.
-   `/feedback/:projectId/videos`: The feedback videos page.
-   `/feedback/:projectId/mockups/:mockupId`: The feedback mockup detail page.
-   `/feedback/:projectId/websites/:websiteId`: The feedback website detail page.
-   `/feedback/:projectId/videos/:videoId`: The feedback video detail page.
-   `/feedback/:projectId/:itemType/:itemId`: The feedback item page.
-   `/moodboards`: The moodboards page.
-   `/moodboards/:projectId`: The project moodboards page.
-   `/moodboard/:moodboardId`: The moodboard canvas page.
-   `/profile`: The profile page.
-   `/settings`: The settings page.

## Components

The `components` folder contains reusable UI components that are used throughout the application. The components are organized into subfolders based on their functionality.

-   `admin`: Components for the admin mode.
-   `ai`: Components for the AI creator.
-   `board`: Components for the project board.
-   `brands`: Components for the brands page.
-   `feedback`: Components for the feedback pages.
-   `icons`: SVG icons.
-   `layout`: Layout components such as the sidebar, header, and main layout.
-   `moodboard`: Components for the moodboard pages.
-   `payments`: Components for the payments pages.
-   `projects`: Components for the projects pages.
-   `roadmap`: Components for the roadmap pages.
-   `tasks`: Components for the tasks.

## Contexts

The `contexts` folder contains React contexts for state management.

-   `AdminContext`: Manages the admin mode.
-   `DataContext`: Manages the application's data.
-   `SearchContext`: Manages the search functionality.
-   `TimerContext`: Manages the timer functionality.

## Data

The `data` folder contains mock data for the application.

-   `brandData.ts`: Mock data for the brands.
-   `calendarData.ts`: Mock data for the calendar.
-   `feedbackData.ts`: Mock data for the feedback.
-   `mockData.ts`: General mock data.
-   `moodboardData.ts`: Mock data for the moodboards.
-   `patterns.ts`: Mock data for the patterns.
-   `paymentsData.ts`: Mock data for the payments.

## Component Documentation

### `components/admin`

#### `AdminModeToggle.tsx`

A floating action button that allows users with the `admin` role to toggle the admin mode. It is only visible to admins.

#### `AdminPanel.tsx`

A full-screen overlay that provides an interface for editing application data. It allows switching between a `StructuredEditor` and a `RawJsonEditor`.

-   **Data Sources**: The panel displays a list of data sources that can be edited. The active data source is displayed in the main editor view.
-   **Editor Modes**: The panel provides two editor modes: `StructuredEditor` for a user-friendly form-based editing experience and `RawJsonEditor` for editing the raw JSON data.

#### `EditableItem.tsx`

A component that displays a single item in the `StructuredEditor`. It allows the user to switch between a view mode and an edit mode.

-   **View Mode**: Displays the item's title and provides buttons to edit or delete the item.
-   **Edit Mode**: Displays a form with fields for each of the item's properties. The form is generated dynamically based on the item's data structure.

#### `FormField.tsx`

A recursive component that renders the appropriate form field for a given data type. It supports a wide range of data types, including strings, numbers, booleans, arrays, and nested objects.

-   **Data-Driven Forms**: The component dynamically generates form fields based on the data type of the property, including text inputs, textareas, number inputs, checkboxes, color pickers, and nested forms for objects and arrays of objects.
-   **Specialized Inputs**: It provides specialized inputs for certain field keys, such as a disabled input for `id` fields and a color picker for fields with keys containing `color` or `hex`.

#### `RawJsonEditor.tsx`

A simple code editor for editing the raw JSON data of a data source. It provides error handling for invalid JSON.

#### `StructuredEditor.tsx`

A user-friendly form-based editor for editing an array of objects. It uses `EditableItem` to display each item in the array.

-   **CRUD Operations**: The editor provides functionality to add, update, and delete items from the data source.
-   **Dirty State**: The editor tracks whether there are unsaved changes and prompts the user to save before exiting.

### `components/ai`

#### `Stepper.tsx`

A visual component that displays a series of steps in a process, indicating the current step and the completed steps. This is used in multi-step wizards or forms.

-   **Props**:
    -   `steps`: An array of objects, where each object has a `name` property.
    -   `currentStep`: A number indicating the current active step (1-based index).
-   **Functionality**:
    -   It renders a timeline with a connecting bar.
    -   Completed steps are shown with a checkmark icon.
    -   The current step is highlighted with a larger, colored ring.
    -   Future steps are shown as simple circles.
    -   The text label for each step is color-coded based on its status (completed, current, or future).

### `BrandsPage.tsx`

The `BrandsPage.tsx` component is responsible for displaying a list of brands. It allows the user to search, filter, and sort the brands. It also provides a way to add new brands.

#### State Management

The component uses the following state variables:

-   `viewMode`: A string that determines whether the brands are displayed in a board or list view.
-   `sortState`: An object that contains the current sort settings.
-   `isAddBrandModalOpen`: A boolean that determines whether the add brand modal is open.
-   `isSortOpen`: A boolean that determines whether the sort popover is open.
-   `sortAnchorEl`: A reference to the sort button element.

#### Sub-components

The component uses the following sub-components:

-   `StatBox`: A component that displays a statistic.
-   `BrandCard`: A component that displays a brand's information in a card format.
-   `AddBrandModal`: A modal that allows the user to add a new brand.
-   `BrandFilterSortPopover`: A popover that allows the user to sort the brands.
-   `AdminPanel`: A panel that allows the user to manage the application's data in admin mode.

#### Functionality

-   **Search**: The user can search for brands by name.
-   **Sort**: The user can sort the brands by name or creation date.
-   **View Mode**: The user can switch between a board and list view.
-   **Add Brand**: The user can add a new brand.
-   **Admin Mode**: In admin mode, the user can manage the application's data.

### `DashboardPage.tsx`

The `DashboardPage.tsx` component is the main dashboard of the application. It displays a welcome message and a grid of widgets that show key metrics.

#### Context Usage

The component uses the following contexts:

-   `useSearch`: To filter the widgets based on the user's search query.
-   `useAdmin`: To conditionally render the `AdminPanel`.
-   `useData`: To get and update the dashboard widget data.

#### Sub-components

The component uses the following sub-components:

-   `AdminPanel`: A panel that allows the user to manage the dashboard widget data when admin mode is active.

#### Functionality

-   **Displays Widgets**: Renders a grid of widgets from the `dashboardWidgets` data source.
-   **Search/Filter**: Filters the displayed widgets based on the global `searchQuery` from `SearchContext`. It searches within the widget's title and content.
-   **Admin Mode**: If `isAdminMode` is true, it displays the `AdminPanel`, allowing the user to edit the widget data directly.

### `PaymentsPage.tsx`

The `PaymentsPage.tsx` component manages the display and filtering of invoices and estimates.

#### State Management

-   `activeTab`: A string that determines whether to show `invoices` or `estimates`.

#### Hooks

-   `useSearchParams`: To get URL search parameters for the active tab and brand filtering.
-   `useAdmin`: To determine if admin mode is active and show the `AdminPanel`.
-   `useData`: To access and update invoice, estimate, and client data.
-   `useSearch`: To get the search query for filtering.

#### Sub-components

-   `StatusBadge`: A component to display the status of an invoice or estimate with appropriate colors.
-   `AdminPanel`: A panel for editing payment-related data in admin mode.

#### Functionality

-   **Tab Switching**: Allows the user to switch between viewing invoices and estimates.
-   **Filtering by Brand**: Filters payments based on the `brandId` from the URL search parameters.
-   **Search**: Filters invoices and estimates by invoice/estimate number or client name.
-   **Data Display**: Renders a table of invoices or estimates with columns for number, client, date, status, and total.
-   **Create New Invoice**: Provides a link to create a new invoice (the button is disabled for estimates).
-   **Admin Mode**: Allows editing of invoices, estimates, and clients through the `AdminPanel`.

### `CreateInvoicePage.tsx`

This page is dedicated to creating a new invoice. It provides a clean interface for users to input all the necessary details for an invoice.

#### Sub-components

-   `InvoiceForm`: The core component of this page, which contains the entire form for creating a new invoice, including fields for client information, line items, and totals.

#### Functionality

-   **Renders Invoice Creation Form**: The primary function of this page is to display the `InvoiceForm` component, which handles the logic and UI for building and submitting a new invoice.

### `ProjectsPage.tsx`

The `ProjectsPage.tsx` component is a comprehensive hub for managing all projects. It offers multiple views, filtering, sorting, and search functionalities, as well as a task overview.

#### State Management

-   `viewMode`: Switches between `board` and `list` views for projects.
-   `filterSortState`: An object containing the current filter and sort settings (status, brands, sortBy, sortDirection).
-   `isAddProjectModalOpen`: A boolean to control the visibility of the "Add Project" modal.
-   `isFilterOpen`: A boolean to control the visibility of the filter and sort popover.
-   `activeTaskTab`: A string (`upcoming`, `missed`, or `past`) to control the displayed tasks in the overview section.

#### Hooks

-   `useData`: To access and update project, brand, task, and other related data.
-   `useSearch`: To get and set the global search query for projects.
-   `useNavigate`: To programmatically navigate to different routes.

#### Sub-components

-   `StatusBadge`: Displays the project's status with a colored badge.
-   `ProjectCard`: A detailed card view for a single project, showing its brand, members, progress, and key stats (boards, roadmaps, tasks).
-   `AddProjectModal`: A modal form for creating a new project.
-   `ProjectFilterSortPopover`: A popover for filtering projects by status and brand, and for sorting them.
-   `TaskRow`: A component to display a single task in the "Tasks Overview" table.

#### Functionality

-   **View Switching**: Users can toggle between a visual `board` layout (using `ProjectCard`) and a dense `list` layout (a table).
-   **Filtering and Sorting**: Provides advanced filtering by project status and associated brands, and sorting by creation date or name.
-   **Search**: Filters projects based on the project name or the associated brand name.
-   **Add Project**: A modal allows for the creation of new projects, which also automatically generates a default board and stages for the new project.
-   **Tasks Overview**: Displays a summary of tasks categorized into "Upcoming", "Missed", and "Past Due", allowing users to quickly see the status of work across all projects.
-   **Navigation**: Clicking on a project card or row navigates the user to the main board associated with that project.

### `RoadmapPage.tsx`

The `RoadmapPage.tsx` component provides a powerful interface for visualizing and managing a project's high-level timeline and associated tasks. It features two distinct views: a Kanban board and a timeline, with extensive drag-and-drop support and editing capabilities.

#### State Management

-   `viewMode`: Toggles between `kanban` and `timeline` views.
-   `isEditMode`: A boolean state that enables or disables the main editing functionalities on the page, such as adding new items or adjusting overall project dates.
-   `editingItem`: Holds the `RoadmapItem` object that is currently being edited in the `RoadmapItemModal`.
-   `selectedTask`: Holds the `Task` object being viewed or edited in the `TaskModal`.
-   `addingTaskTo`: Tracks the ID of the roadmap item for which a new task is being added inline in the Kanban view.
-   Various states for controlling modals and popovers, such as `itemActionState`, `isReorderItemsModalOpen`, and `moveTasksModalState`.

#### Hooks

-   `useParams`: Extracts the `projectId` from the URL to display the correct roadmap.
-   `useData`: Provides access to the global application data (`roadmapItems`, `tasks`, `projects`, etc.) and the `forceUpdate` function to trigger re-renders after direct data manipulation.

#### Sub-components

-   `TimelineView`: Renders the interactive timeline, displaying roadmap items and tasks over a date range.
-   `KanbanViewComponent`: An inner component that renders the Kanban board, with roadmap items as columns.
-   `TaskCard`: Represents a single task card within the Kanban view.
-   `TaskModal`: A modal for viewing and editing the details of a specific task.
-   `RoadmapItemModal`: A modal for editing the details of a roadmap item.
-   `RoadmapItemActionsPopover`: A popover menu offering advanced actions for a roadmap item (e.g., sorting tasks, changing patterns, copying, archiving).
-   `MoveRoadmapTasksModal`: A modal to bulk-move all tasks from one roadmap item to another.
-   `ReorderRoadmapItemsModal`: A modal for re-ordering the roadmap items themselves.
-   `ViewSwitcher`: A UI control to switch between the Kanban and Timeline views.

#### Functionality

-   **Dual Views**: Users can switch between a `timeline` view for a temporal overview and a `kanban` view for a status-based or categorical organization.
-   **CRUD Operations**: Full Create, Read, Update, and Delete capabilities for both roadmap items and their associated tasks.
-   **Drag-and-Drop**:
    -   **Kanban**: Tasks can be reordered within a roadmap item column or moved between different columns (changing their `roadmapItemId`).
    -   **Timeline**: Roadmap items and tasks can be dragged to change their dates or resized to alter their duration (functionality handled within `TimelineView`).
-   **Inline Task Creation**: In the Kanban view, users can quickly add new tasks directly to a roadmap item.
-   **Rich Item Management**: Through a popover, users can perform actions like copying an entire roadmap item with its tasks, moving all tasks to another item, archiving tasks, changing the item's background pattern, and applying sorting rules to the tasks it contains.
-   **Edit Mode**: A dedicated "Edit" mode protects the roadmap from accidental changes, requiring the user to explicitly enter this mode to add items, reorder them, or change the project's overall start and end dates.
-   **Calendar Sync**: Utilizes utility functions (`createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`) to synchronize roadmap items with an external calendar.

### `CalendarPage.tsx`

The `CalendarPage.tsx` component provides a comprehensive and interactive calendar interface for viewing and managing events from various sources across the application. It supports multiple calendar views (day, week, month, multi-month) and allows for event creation, editing, and filtering.

#### State Management

-   `events`: An array of `CalendarEvent` objects currently displayed on the calendar.
-   `currentDate`: The central `Date` object that the calendar view is based on (e.g., the day, week, or month being viewed).
-   `view`: A state variable (`'day'`, `'week'`, `'month'`, `'3-month'`, `'6-month'`) that controls the current calendar layout.
-   `filters`: An object that keeps track of which event types (`task`, `invoice`, etc.) are visible.
-   `selectedEvent`: Holds the `CalendarEvent` object currently opened in the detail/edit modal.
-   `isCreateModalOpen`: A boolean to toggle the visibility of the "Create Event" modal.
-   `moreEventsInfo`: Holds information for the "more events" popover in the month view when there isn't enough space to display all events.

#### Hooks

-   `useSearchParams`: To read the `brandId` from the URL, allowing the calendar to be filtered by a specific brand.
-   `useMemo`: Extensively used to optimize performance by memoizing filtered events, calculated date ranges for headers, and the complex layout calculations for each calendar view.
-   `useCallback`: Used for event handler functions like `handleFilterToggle` and `handleEventUpdate` to prevent unnecessary re-creations.
-   `useEffect`: Used to update the date input fields when a `selectedEvent` is chosen.

#### Sub-components & Modals

-   The component defines several local render functions (`renderMonthView`, `renderWeekView`, `renderDayView`, `renderMultiMonthView`) to encapsulate the complex logic for each view.
-   **Create Event Modal**: A form for creating new `manual` events with options to link them to brands, projects, and tasks.
-   **Event Detail/Edit Modal**: Appears when an event is clicked, allowing the user to see event details, follow a link to the source item (e.g., a task or roadmap), and edit the event's dates.
-   **More Events Popover**: A simple popover that lists all events on a specific day in the month view when they can't all be displayed.

#### Functionality

-   **Multiple Views**: Supports day, week, month, 3-month, and 6-month views, each with a unique layout optimized for that time scale.
-   **Event Aggregation**: Automatically gathers and displays events from different parts of the application (tasks, invoices, roadmap items) alongside manually created events.
-   **Filtering**: Users can toggle the visibility of different event types (e.g., show only tasks and invoices).
-   **Brand-Specific View**: When accessed via a brand-specific route, the calendar automatically filters to show only events related to that brand.
-   **Event Interaction**: Users can click on events to open a detailed modal, where they can edit dates.
-   **Date Navigation**: Provides controls to move to the next/previous period (day, week, month) and a "Today" button to jump back to the current date.
-   **Event Creation**: A dedicated modal allows for the creation of new custom calendar events.
-   **Source Linking**: Events originating from other parts of the app (like a task) include a direct link to that item.
-   **Layout Calculation**: Complex logic is in place (`layOutEventsForWeek`) to calculate the position and span of multi-day events to prevent them from overlapping in the week and month views.

### `FeedbackPage.tsx`

The `FeedbackPage.tsx` component serves as a simple, high-level entry point for accessing feedback on different projects. It displays a list of projects, which can be filtered by brand.

#### Hooks

-   `useData`: To get the list of all `projects` and `brands` from the global data context.
-   `useSearchParams`: To check if a `brandId` is present in the URL, allowing for brand-specific filtering.
-   `useMemo`: To memoize the `filteredProjects` list, which re-computes only when the `brandId` or the main `projects` list changes.

#### Functionality

-   **Project Listing**: Renders a grid of all available projects, showing their name and description.
-   **Brand Filtering**: If the page is accessed with a `brandId` in the URL query parameters (e.g., `/feedback?brandId=...`), it will only display the projects associated with that brand.
-   **Navigation**: Each project card is a `Link` that navigates the user to the specific feedback page for that project (e.g., `/feedback/project-123`).
-   **Dynamic Title**: The page title changes to reflect the selected brand if one is filtered (e.g., "Feedback for [Brand Name]").

### `SettingsPage.tsx`

The `SettingsPage.tsx` component provides a standard interface for users to manage their personal and application-wide settings.

#### Functionality

The page is divided into three main sections:

-   **Account**: Allows the user to update their personal information, such as their full name and email address. Includes a "Save Changes" button to persist the updates (note: functionality is mocked).
-   **Notifications**: Provides toggle switches for enabling or disabling different types of notifications, specifically "Email Notifications" and "Push Notifications."
-   **Appearance**: Contains options for changing the application's visual theme. Currently, it includes a dropdown menu with "Dark Mode" as the only enabled option.

### `FeedbackProjectDetailPage.tsx`

The `FeedbackProjectDetailPage.tsx` component serves as a dashboard for a single project's feedback, providing a centralized view of all related assets, tasks, and activities.

#### State Management

-   `isModalOpen`: A boolean to control the visibility of the `AddFeedbackRequestModal`.

#### Hooks

-   `useParams`: To get the `projectId` from the URL, ensuring the component displays data for the correct project.
-   `useData`: To access the global data context, retrieving `projects`, `feedbackMockups`, `feedbackWebsites`, and `feedbackVideos`.
-   `useMemo`: To efficiently calculate the currently selected `project` and the `stats` (counts of mockups, websites, and videos) for that project.

#### Sub-components

-   `WidgetLink`: A reusable component for creating navigation links to the different feedback categories (Mockups, Websites, Videos). It displays an icon, title, and a count of items.
-   `FeedbackTasksView`: A component that displays a list of feedback-related tasks for the current project.
-   `FeedbackActivityView`: A component that shows a log of recent activities related to feedback on the project.
-   `AddFeedbackRequestModal`: A modal that opens to allow the user to create a new feedback request for the project.

#### Functionality

-   **Project-Specific Dashboard**: Displays a dedicated feedback hub for the project specified in the URL.
-   **Feedback Categories**: Presents clear, clickable widgets that show the number of feedback collections for Mockups, Websites, and Videos, and link to their respective detailed pages.
-   **New Feedback Request**: A prominent button allows users to open a modal and initiate a new feedback request.
-   **Task and Activity Views**: Integrates two major sub-views (`FeedbackTasksView` and `FeedbackActivityView`) to provide at-a-glance information about pending tasks and recent project activity, creating a comprehensive overview.
-   **Error Handling**: Shows a "Project not found" message if the `projectId` from the URL doesn't correspond to an existing project.

### `FeedbackMockupsPage.tsx`

The `FeedbackMockupsPage.tsx` component is a simple container page responsible for displaying the `FeedbackMockupsView` for a specific project.

#### Hooks

-   `useParams`: Extracts the `projectId` from the URL to identify the project.
-   `useData`: Retrieves the project's data, specifically to get the project's name for the page title.

#### Sub-components

-   `FeedbackMockupsView`: The primary component that renders the list of mockup collections for the specified project.

#### Functionality

-   **Displays Project-Specific Mockups**: The main purpose of this page is to render the `FeedbackMockupsView`, passing the `projectId` to it so it can fetch and display the relevant mockup collections.
-   **Dynamic Title**: The page title dynamically includes the name of the project (e.g., "Mockup Collections for [Project Name]").

### `FeedbackWebsitesPage.tsx`

The `FeedbackWebsitesPage.tsx` component is a container page for displaying website feedback collections for a specific project.

#### Hooks

-   `useParams`: Extracts the `projectId` from the URL.
-   `useData`: Retrieves project data to display the project name in the title.

#### Sub-components

-   `FeedbackWebsitesView`: The main component that renders the list of website collections for the project.

#### Functionality

-   **Displays Project-Specific Websites**: Renders the `FeedbackWebsitesView` with the `projectId` to show the relevant website feedback collections.
-   **Dynamic Title**: The page title includes the project name (e.g., "Website Collections for [Project Name]").

### `FeedbackVideosPage.tsx`

The `FeedbackVideosPage.tsx` component serves as a container for displaying video feedback collections related to a specific project.

#### Hooks

-   `useParams`: Extracts the `projectId` from the URL to ensure the component loads collections for the correct project.
-   `useData`: Retrieves the project data to dynamically display the project's name in the page title.

#### Sub-components

-   `FeedbackVideosView`: The core component responsible for rendering the list of video collections for the given project.

#### Functionality

-   **Displays Project-Specific Videos**: The primary role of this page is to embed and pass the `projectId` to the `FeedbackVideosView` component, which then handles the logic for fetching and displaying the relevant video feedback collections.
-   **Dynamic Title**: The `h1` title of the page is dynamically populated with the project's name, providing clear context to the user (e.g., "Video Collections for [Project Name]").

### `MoodboardsPage.tsx`

The `MoodboardsPage.tsx` component serves as an entry point for accessing the moodboards of different projects. It allows users to see a list of projects and navigate to the moodboards for a specific project. The list of projects can be filtered by brand.

#### Hooks

-   `useSearchParams`: To read the `brandId` from the URL's query parameters for filtering.
-   `useMemo`: To memoize the `filteredProjects` list, which is re-calculated only when the `brandId` changes.

#### Functionality

-   **Project Listing**: Displays a grid of projects. Each project is a link to its moodboards page.
-   **Brand Filtering**: If a `brandId` is present in the URL, the component filters the projects to show only those associated with that brand.
-   **Dynamic Title**: The page title changes to reflect the selected brand if a filter is applied.
-   **Navigation**: Clicking on a project card navigates the user to the `ProjectMoodboardsPage` for that project.

### `ProjectMoodboardsPage.tsx`

This page displays all the moodboards associated with a specific project. It allows for the creation of new moodboards.

#### State Management

-   `isAddModalOpen`: A boolean state to control the visibility of the `AddMoodboardModal`.

#### Hooks

-   `useParams`: To get the `projectId` from the URL.
-   `useData`: To access the global `data` (projects, moodboards, etc.) and the `forceUpdate` function to re-render the component after creating a new moodboard.

#### Sub-components

-   `MoodboardCard`: A reusable component that displays a single moodboard's name and the number of items it contains. It also serves as a link to the `MoodboardCanvasPage`.
-   `AddMoodboardModal`: A modal form that allows the user to enter a name and create a new moodboard.

#### Functionality

-   **Moodboard Listing**: Fetches and displays all moodboards that belong to the `projectId` from the URL.
-   **Create Moodboard**: A button opens the `AddMoodboardModal`. The `handleCreateMoodboard` function adds a new moodboard to the global data and triggers a re-render.
-   **Dynamic Title**: The title of the page includes the name of the current project.
-   **Navigation**: Each `MoodboardCard` links to the detailed canvas view for that specific moodboard (`/moodboard/:moodboardId`).
-   **Error Handling**: If the `projectId` from the URL does not match any existing project, it displays a "Project not found" message.

### `MoodboardCanvasPage.tsx`

This is a highly interactive page that provides a freeform canvas for creating and organizing moodboard items. It supports various item types (text, image, link, color, column), connecting items with lines, and different interaction modes.

#### State Management

-   **History**: Manages undo/redo functionality for all changes to moodboard items (`history`, `historyIndex`).
-   **Interaction Mode**: Toggles between `move` (for dragging, resizing, and interacting with items) and `pan` (for moving the entire canvas).
-   **Zoom & Pan**: Manages the zoom level and scroll position of the canvas.
-   **Item State**: Tracks the currently dragged item (`draggedItem`), resized item (`resizedItem`), and which item is being edited (`editingItem`).
-   **Connecting State**: Manages the creation of connectors between items (`connecting`).
-   **Modals & Popovers**: Controls the visibility of modals for downloading the moodboard, editing items, and a popover for adding colors.

#### Sub-components

-   `MoodboardItemComponent`: Renders a single item on the canvas based on its type.
-   `ConnectorLine`: Renders an SVG line between two connected items.
-   `MoodboardListView`: Provides an alternative list-based view of all items on the moodboard.
-   `DownloadMoodboardModal`: A modal to handle the export of the moodboard as an image.
-   `EditItemModal`: A modal to edit the content of a specific moodboard item.
-   `ColorPopover`: A popover to select and add colors to the canvas.

#### Functionality

-   **Infinite Canvas**: A large, zoomable, and pannable canvas for creative freedom.
-   **CRUD for Items**: Users can add, edit, and delete various types of items (text, images, links, columns, colors).
-   **Drag & Drop**: Items can be freely moved around the canvas.
-   **Resize**: Items can be resized.
-   **Grouping with Columns**: The 'column' item type automatically arranges child items vertically within it.
-   **Connectors**: Users can draw lines between items to show relationships.
-   **Interaction Modes**: Switch between `move` mode for item manipulation and `pan` mode for canvas navigation.
-   **Zoom & Recenter**: Zoom in/out of the canvas and automatically recenter the view on the content.
-   **Undo/Redo**: Full history tracking for all item manipulations.
-   **Persistence**: The state of the moodboard is saved to `localStorage` to prevent data loss.
-   **Fullscreen Mode**: Allows the canvas to fill the entire screen for an immersive experience.
-   **List View**: An alternative to the canvas that displays all items in a simple list.
-   **Download**: Export the current view of the moodboard as a PNG image.

### `components/board`

#### `AddStageModal.tsx`

A modal component for adding a new stage to a project board.

-   **Props**:
    -   `isOpen`: A boolean that controls the visibility of the modal.
    -   `onClose`: A function to be called when the modal is closed.
    -   `onAddStage`: A function that takes the new stage's name and status (`'Open'` or `'Closed'`) as arguments and adds the stage to the board.
-   **Functionality**:
    -   Provides a form with a text input for the stage name and a select input for the stage status.
    -   The `handleSubmit` function calls the `onAddStage` prop with the new stage's data.