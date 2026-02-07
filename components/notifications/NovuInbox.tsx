import { Inbox } from '@novu/react';
import { useUser } from '../../contexts/UserContext';
import { useEffect } from 'react';

export function NovuInbox() {
  const { user } = useUser();
  const applicationIdentifier = import.meta.env.VITE_NOVU_APP_ID;

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
            '&:hover': {
              background: 'rgba(163, 230, 53, 0.05)',
              borderColor: 'rgba(163, 230, 53, 0.5)',
            },
          },
          popoverTrigger: {
            padding: '0',
            background: 'transparent',
            border: 'none',
            '&:hover': {
              background: 'transparent',
            },
          },
          bellDot: {
            backgroundColor: 'oklch(0.577 0.245 27.325)',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
          },
          popover: {
            background: 'rgba(18, 18, 18, 0.85)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          },
          popoverHeader: {
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 20px',
          },
          popoverTitleText: {
            fontSize: '14px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'oklch(0.708 0 0)',
          },
          notificationList: {
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
          notificationListItem: {
            borderRadius: '12px',
            padding: '12px 16px',
            margin: '4px 0',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid transparent',
            transition: 'transform 0.2s ease, background 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              transform: 'translateX(4px)',
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
          notificationListItemRead: {
            opacity: '0.6',
          },
          notificationListItemUnread: {
            background: 'rgba(255, 255, 255, 0.06)',
            borderLeft: '3px solid oklch(0.922 0 0)',
          },
          notificationListItemTitle: {
            fontSize: '14px',
            fontWeight: '600',
            color: 'oklch(0.985 0 0)',
          },
          notificationListItemBody: {
            fontSize: '13px',
            color: 'oklch(0.708 0 0)',
            marginTop: '4px',
          },
          notificationListItemTimestamp: {
            fontSize: '11px',
            color: 'oklch(0.556 0 0)',
            marginTop: '8px',
          },
          emptyNotificationList: {
            padding: '40px 20px',
            textAlign: 'center',
          },
          emptyNotificationListText: {
            fontSize: '14px',
            color: 'oklch(0.556 0 0)',
          },
          tabs: {
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          },
          tabsItem: {
            fontSize: '13px',
            fontWeight: '600',
            color: 'oklch(0.708 0 0)',
            padding: '12px 16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              color: 'oklch(0.922 0 0)',
            },
          },
          tabsItemActive: {
            color: 'oklch(0.985 0 0)',
            borderBottom: '2px solid oklch(0.922 0 0)',
          },
          markAllAsRead: {
            fontSize: '12px',
            fontWeight: '600',
            color: 'oklch(0.922 0 0)',
            transition: 'all 0.3s ease',
            '&:hover': {
              opacity: '0.8',
            },
          },
          dropdownMenu: {
            background: 'rgba(28, 28, 28, 0.98)',
            backdropFilter: 'blur(24px)',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            padding: '8px',
          },
          dropdownMenuItem: {
            borderRadius: '8px',
            padding: '10px 14px',
            border: 'none',
            background: 'transparent',
            color: 'oklch(0.985 0 0)',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.08)',
            },
          },
          dropdownMenuItemIcon: {
            color: 'oklch(0.708 0 0)',
            width: '16px',
            height: '16px',
          },
          // Preferences panel styling - glass morphism with blur
          preferencesContainer: {
            background: 'rgba(18, 18, 18, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
          },
          preferencesHeader: {
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 20px',
          },
          preferencesContent: {
            background: 'rgba(18, 18, 18, 0.2)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
          preferencesList: {
            background: 'transparent',
          },
          preferencesItem: {
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px',
          },
          workflowContainer: {
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
          scheduleContainer: {
            background: 'transparent',
            borderRadius: '12px',
          },
          inboxContent: {
            background: 'transparent',
          },
          popoverContent: {
            background: 'transparent',
          },
          switch: {
            borderRadius: '12px',
          },
          switchThumb: {
            borderRadius: '8px',
          },
          switchTrack: {
            borderRadius: '12px',
          },
          channelSwitch: {
            borderRadius: '12px',
          },
          channelSwitchThumb: {
            borderRadius: '8px',
          },
          // Hide checkbox icons inside switches
          switchIcon: {
            display: 'none',
          },
          checkIcon: {
            display: 'none',
          },
          checkbox: {
            display: 'none',
          },
          // Time picker inputs
          timePicker: {
            borderRadius: '8px',
          },
          timePickerInput: {
            borderRadius: '8px',
          },
          scheduleInput: {
            borderRadius: '8px',
          },
          input: {
            borderRadius: '8px',
          },
          button: {
            borderRadius: '8px',
          },
          workflowContainer: {
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          scheduleContainer: {
            borderRadius: '12px',
          },
          dayToggle: {
            borderRadius: '12px',
          },
          dayToggleThumb: {
            borderRadius: '8px',
          },
        },
      }}
      placement="bottom-end"
      placementOffset={12}
      options={{
        hideBranding: true,
      }}
    />
  );
}
