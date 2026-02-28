/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface Company {
    id: string;
    name: string;
    tradingName?: string;
    email: string;
    industry: string;
    onboardingComplete: boolean;
    verificationStatus: string;
    location?: any;
}

interface AuthState {
    token: string | null;
    company: Company | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    setAuth: (data: { token: string; company: Company }) => void;
    logout: () => void;
    updateCompany: (data: Partial<Company>) => void;
    syncClerkSession: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            company: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            setAuth: (data) => {
                localStorage.setItem('ecoexchange_token', data.token);
                set({
                    token: data.token,
                    company: data.company,
                    isAuthenticated: true,
                    error: null,
                });
            },

            logout: () => {
                localStorage.removeItem('ecoexchange_token');
                set({
                    token: null,
                    company: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            updateCompany: (data) => {
                const currentCompany = get().company;
                if (currentCompany) {
                    set({
                        company: { ...currentCompany, ...data },
                    });
                }
            },

            syncClerkSession: async (clerkToken: string) => {
                set({ isLoading: true, error: null });
                try {
                    // Temporarily set token so api interceptor uses it for the sync request
                    localStorage.setItem('ecoexchange_token', clerkToken);

                    const response: any = await api.post('/auth/sync', {});

                    if (response.success && response.data) {
                        set({
                            token: clerkToken,
                            company: {
                                id: response.data.company.id,
                                name: response.data.company.name,
                                tradingName: response.data.company.tradingName,
                                email: response.data.company.email,
                                industry: response.data.company.industry,
                                onboardingComplete: response.data.company.onboardingComplete,
                                verificationStatus: response.data.company.verificationStatus,
                            },
                            isAuthenticated: true,
                        });
                    }
                } catch (error: any) {
                    set({
                        token: null,
                        company: null,
                        isAuthenticated: false,
                        error: error.message || 'Failed to sync Clerk session',
                    });
                    localStorage.removeItem('ecoexchange_token');
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'ecoexchange-auth',
            partialize: (state) => ({ token: state.token, company: state.company, isAuthenticated: state.isAuthenticated }),
        }
    )
);
