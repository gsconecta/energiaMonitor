export type Appearance = 'light' | 'dark' | 'system';

export function initializeTheme() {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }
}

export function useAppearance(): {
    appearance: Appearance;
    updateAppearance: (appearance: Appearance) => void;
} {
    return {
        appearance: 'light' as Appearance,
        updateAppearance: () => {},
    } as const;
}
