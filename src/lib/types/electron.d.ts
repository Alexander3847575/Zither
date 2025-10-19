declare global {
    interface Window {
        electron: {
            store: {
                get: (key: string) => Promise<any>;
                set: (key: string, value: any) => Promise<void>;
            };
        };
    }
}