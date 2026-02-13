import { Inbox } from '@novu/react';
import { useUser } from '../../contexts/UserContext';
import { useEffect } from 'react';

export function NovuInbox() {
  const { user } = useUser();
  const applicationIdentifier = import.meta.env.VITE_NOVU_APP_ID as string;

  useEffect(() => {
    const hideCheckboxes = () => {
      const style = document.createElement('style');
      style.textContent = `
        button[role="switch"] svg,
        [role="switch"] svg,
        [class*="switch"] svg,
        [class*="Switch"] svg,
        [class*="toggle"] svg,
        [class*="Toggle"] svg,
        [class*="thumb"] svg,
        [class*="Thumb"] svg {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;

      const observer = new MutationObserver(() => {
        document.querySelectorAll('button[role="switch"] svg, [role="switch"] svg').forEach(svg => {
          (svg as HTMLElement).style.display = 'none';
          (svg as HTMLElement).style.visibility = 'hidden';
          (svg as HTMLElement).style.width = '0';
          (svg as HTMLElement).style.height = '0';
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
      document.head.appendChild(style);

      return () => {
        observer.disconnect();
        style.remove();
      };
    };

    const cleanup = hideCheckboxes();
    return cleanup;
  }, []);

  if (!applicationIdentifier || !user?.uid) {
    return null;
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={user.uid}
      appearance={{
        variables: {
          colorBackground: 'rgba(18, 18, 18, 0.85)',
          colorForeground: 'oklch(0.985 0 0)',
          colorPrimary: 'oklch(0.922 0 0)',
          colorPrimaryForeground: 'oklch(0.205 0 0)',
          colorSecondary: 'rgba(32, 32, 32, 0.8)',
          colorSecondaryForeground: 'oklch(0.985 0 0)',
          colorCounter: 'oklch(0.577 0.245 27.325)',
          colorCounterForeground: 'oklch(0.985 0 0)',
          colorNeutral: 'rgba(255, 255, 255, 0.08)',
          colorShadow: 'rgba(0, 0, 0, 0.5)',
          fontSize: '14px',
          borderRadius: '16px',
        },
        icons: {
          check: () => null,
        },
        elements: {
          // Only core bell icon properties are supported in the new Novu API
          bellIcon: {
            width: '22px',
            height: '22px',
            color: 'oklch(0.708 0 0)',
            transition: 'color 0.2s ease',
          },
          bellContainer: {
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'background 0.2s ease, border-color 0.2s ease',
          },
          // NOTE: Novu library removed support for most custom element styling
          // The following properties are no longer available in the API:
          // - popover, popoverHeader, popoverTitleText, popoverContent
          // - notificationListItem*, emptyNotificationList*
          // - tabs*, markAllAsRead, dropdownMenu*
          // - preferencesContainer, preferencesHeader, preferencesList, etc.
          // - Custom switch, checkbox, and input styling
          //
          // Only basic icon and button styling is now supported.
        },
      }}
      placement="bottom-end"
      placementOffset={12}
      // options prop removed - no longer supported in Novu API
    />
  );
}
