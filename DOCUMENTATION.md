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

The component has the following functionality:

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

The component has the following functionality:

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
