import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallChoice = {
    outcome: 'accepted' | 'dismissed';
    platform: string;
};

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<InstallChoice>;
};

const INSTALL_BANNER_DISMISSED_KEY = 'energia-monitor-install-banner-dismissed';

function isStandaloneDisplay() {
    const navigatorWithStandalone = window.navigator as Navigator & {
        standalone?: boolean;
    };

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        navigatorWithStandalone.standalone === true
    );
}

function isIosDevice() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isClassicIos = /iphone|ipad|ipod/.test(userAgent);
    const isIpadOsDesktopMode =
        userAgent.includes('macintosh') && window.navigator.maxTouchPoints > 1;

    return isClassicIos || isIpadOsDesktopMode;
}

function hasDismissedInstallBanner() {
    try {
        return (
            window.localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === 'true'
        );
    } catch {
        return false;
    }
}

function markInstallBannerDismissed() {
    try {
        window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
    } catch {
        // Ignore storage errors; hiding the current banner is enough.
    }
}

export default function InstallAppBanner() {
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        setIsIos(isIosDevice());
        setIsStandalone(isStandaloneDisplay());
        setIsDismissed(hasDismissedInstallBanner());

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            markInstallBannerDismissed();
            setIsDismissed(true);
            setInstallPrompt(null);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt,
        );
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt,
            );
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const dismiss = () => {
        markInstallBannerDismissed();
        setIsDismissed(true);
    };

    const install = async () => {
        if (!installPrompt) {
            return;
        }

        try {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            dismiss();
        } finally {
            setInstallPrompt(null);
        }
    };

    const shouldShow =
        hasMounted && !isStandalone && !isDismissed && (installPrompt || isIos);

    if (!shouldShow) {
        return null;
    }

    return (
        <div
            aria-label="Instalar aplicación"
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-sky-100 bg-white/95 p-3 shadow-lg shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
            role="region"
        >
            <div className="flex size-10 shrink-0 items-center justify-center">
                <AppLogoIcon className="size-8" aria-hidden="true" alt="" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    Instala Energía Monitor
                </p>
                {!installPrompt && (
                    <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">
                        En iPhone, usa Compartir y después "Añadir a inicio".
                    </p>
                )}
            </div>

            {installPrompt ? (
                <Button className="shrink-0" size="sm" onClick={install}>
                    Instalar
                </Button>
            ) : (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Share2 className="size-3.5" aria-hidden="true" />
                    Añadir
                </div>
            )}

            <button
                aria-label="Ocultar invitación de instalación"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={dismiss}
                type="button"
            >
                <X className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}
