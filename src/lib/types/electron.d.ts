declare global {
    interface Window {
        storage: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: any) => Promise<void>;
        };
        api: {
            readLocalFile: (filePath: string) => Promise<{ ok: boolean; data?: string; error?: string }>;
            startPythonAPI: () => Promise<{ success: boolean; status?: { running: boolean; url: string }; error?: string }>;
            stopPythonAPI: () => Promise<{ success: boolean; error?: string }>;
            pythonAPIStatus: () => Promise<{ running: boolean; url: string }>;
            clusterTabs: (tabs: Array<{ id: string; name: string }>) => Promise<Array<{ id: string; name: string; tabs: Array<{ id: string; name: string }> }>>;
        };
    }
}