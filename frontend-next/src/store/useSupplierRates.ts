import { create } from 'zustand';
import axios, { AxiosHeaders } from 'axios';
import { SupplierRate } from '@/types';
import { getClientAuthHeaders } from '@/lib/clientAuth';

/** Auth-aware axios instance — uses cookie-backed auth context for requests. */
const authAxios = axios.create({ withCredentials: true });
authAxios.interceptors.request.use((config) => {
    const authHeaders = getClientAuthHeaders();
    if (Object.keys(authHeaders).length > 0) {
        const headers = AxiosHeaders.from(config.headers);
        for (const [key, value] of Object.entries(authHeaders)) {
            headers.set(key, value);
        }
        config.headers = headers;
    }
    return config;
});

interface SupplierRatesStore {
    rates: SupplierRate[];
    isLoading: boolean;
    fetchRates: () => Promise<void>;
    addRate: (rate: Omit<SupplierRate, 'id'>) => Promise<void>;
    updateRate: (id: string, rate: Partial<SupplierRate>) => Promise<void>;
    deleteRate: (id: string) => Promise<void>;
}

export const useSupplierRatesStore = create<SupplierRatesStore>((set) => ({
    rates: [],
    isLoading: false,

    fetchRates: async () => {
        set({ isLoading: true });
        try {
            const { data } = await authAxios.get('/api/v1/project_supplier_rates');
            set({ rates: data });
        } catch (error) {
            console.error('Failed to fetch supplier rates:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addRate: async (rate) => {
        try {
            const { data } = await authAxios.post('/api/v1/project_supplier_rates', rate);
            if (data.status === 'success') {
                const newRate = { ...rate, id: data.id } as SupplierRate;
                set(state => ({ rates: [...state.rates, newRate] }));
            }
        } catch (error) {
            console.error('Failed to add supplier rate:', error);
            throw error;
        }
    },

    updateRate: async (id, rate) => {
        try {
            await authAxios.post('/api/v1/project_supplier_rates', { id, ...rate });
            set(state => ({
                rates: state.rates.map(r => r.id === id ? { ...r, ...rate } : r)
            }));
        } catch (error) {
            console.error('Failed to update supplier rate:', error);
            throw error;
        }
    },

    deleteRate: async (id) => {
        try {
            await authAxios.delete(`/api/project_supplier_rates/${id}`);
            set(state => ({
                rates: state.rates.filter(r => r.id !== id)
            }));
        } catch (error) {
            console.error('Failed to delete supplier rate:', error);
            throw error;
        }
    }
}));

export const useSupplierRates = () => useSupplierRatesStore();
