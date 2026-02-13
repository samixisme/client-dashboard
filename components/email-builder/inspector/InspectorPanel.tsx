import { setSidebarTab, useInspectorDrawerOpen, useSelectedSidebarTab } from '../../../stores/emailEditorStore'
import ConfigurationPanel from './ConfigurationPanel'
import StylesPanel from './StylesPanel'

export const INSPECTOR_DRAWER_WIDTH = 320

export default function InspectorPanel() {
  const selectedSidebarTab = useSelectedSidebarTab()
  const inspectorDrawerOpen = useInspectorDrawerOpen()

  if (!inspectorDrawerOpen) return null

  return (
    <div
      className="bg-glass/40 backdrop-blur-xl border-l border-border-color flex flex-col h-full overflow-hidden"
      style={{ width: INSPECTOR_DRAWER_WIDTH, minWidth: INSPECTOR_DRAWER_WIDTH }}
    >
      {/* Tab bar */}
      <div className="h-12 border-b border-border-color flex items-center px-2 shrink-0">
        <div className="flex bg-glass/60 backdrop-blur-xl rounded-lg p-0.5 w-full border border-border-color/50">
          <button
            onClick={() => setSidebarTab('styles')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              selectedSidebarTab === 'styles'
                ? 'bg-primary text-background font-medium shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Styles
          </button>
          <button
            onClick={() => setSidebarTab('block-configuration')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              selectedSidebarTab === 'block-configuration'
                ? 'bg-primary text-background font-medium shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Inspect
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-auto">
        {selectedSidebarTab === 'block-configuration' ? (
          <ConfigurationPanel />
        ) : (
          <StylesPanel />
        )}
      </div>
    </div>
  )
}
