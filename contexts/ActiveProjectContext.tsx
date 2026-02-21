import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from './DataContext';
import { Brand, Project } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActiveProjectContextType {
    activeProjectId: string | null;
    setActiveProjectId: (id: string | null) => void;
    activeProject: Project | null;
    activeBrand: Brand | null;
    activeBrandLogoUrl: string | null;
    activeBrandColor: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'activeProjectId';

export const getBrandLogoUrl = (brand: Brand | null | undefined): string | null => {
    if (!brand) return null;
    const logo =
        brand.logos?.find(l => l.variation === 'Color' && l.type === 'Logomark') ??
        brand.logos?.find(l => l.type === 'Logomark') ??
        brand.logos?.find(l => !!l.formats?.length) ??
        brand.logos?.[0];
    return logo?.formats?.[0]?.url ?? logo?.url ?? brand.logoUrl ?? null;
};

export const getBrandColor = (brand: Brand | null | undefined): string => {
    if (!brand) return '#a3e635';
    const primary = brand.colors?.find(c => c.category === 'Primary') ?? brand.colors?.[0];
    return primary?.hex ?? '#a3e635';
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ActiveProjectContext = createContext<ActiveProjectContextType>({
    activeProjectId: null,
    setActiveProjectId: () => {},
    activeProject: null,
    activeBrand: null,
    activeBrandLogoUrl: null,
    activeBrandColor: '#a3e635',
});

export const ActiveProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data } = useData();

    const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) ?? null;
        } catch {
            return null;
        }
    });

    const setActiveProjectId = useCallback((id: string | null) => {
        setActiveProjectIdState(id);
        try {
            if (id) localStorage.setItem(STORAGE_KEY, id);
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

    // Validate stored ID against loaded projects — clear if stale
    useEffect(() => {
        if (activeProjectId && data.projects.length > 0) {
            const exists = data.projects.some(p => p.id === activeProjectId);
            if (!exists) setActiveProjectId(null);
        }
    }, [data.projects, activeProjectId, setActiveProjectId]);

    const activeProject = data.projects.find(p => p.id === activeProjectId) ?? null;
    const activeBrand   = activeProject ? (data.brands.find(b => b.id === activeProject.brandId) ?? null) : null;

    return (
        <ActiveProjectContext.Provider value={{
            activeProjectId,
            setActiveProjectId,
            activeProject,
            activeBrand,
            activeBrandLogoUrl: getBrandLogoUrl(activeBrand),
            activeBrandColor:   getBrandColor(activeBrand),
        }}>
            {children}
        </ActiveProjectContext.Provider>
    );
};

export const useActiveProject = () => useContext(ActiveProjectContext);
