## 2026-04-20 - Added semantic roles and focus to custom dropdown menus
**Learning:** Custom glassmorphic dropdowns in this app frequently lack semantic menu roles (menu/menuitem) and visible keyboard focus states.
**Action:** Always ensure custom dropdowns or collapsible elements convey their state by tying aria-expanded to visibility, alongside aria-haspopup, role=menu/menuitem, and focus-visible styling.
