/**
 * GCM Real-Time — SSE replacement for Socket.io.
 * Connects to /api/events, dispatches every server event into the Zustand store.
 * Backend already filters per-role/tenant, so the client only receives what it should.
 */
import { useEffect, useRef } from 'react';
import { useGCMStore } from '@/store';
import {
    Trip,
    Project,
    Company,
    Vehicle,
    Driver,
    NotificationType,
    AssetRequest,
    AppNotification,
    Container,
    Tank,
    Scale,
} from '@/types';

const getEventsUrl = (): string => {
    // In both prod and dev, /api routes are same-origin and carry auth cookies.
    return '/api/v1/events';
};

type GenericRecord = Record<string, unknown>;
type NotificationEvent = GenericRecord & { read?: boolean };
type InventoryEvent = GenericRecord & {
    container_id?: string;
    tank_id?: string;
    scale_id?: string;
};

type Handler = (data: unknown) => void;

const buildHandlers = (): Record<string, Handler> => {
    const set = useGCMStore.setState;
    const get = useGCMStore.getState;
    const isAr = () => get().saasConfig.language === 'ar';

    const upsertById = <T,>(arr: T[], item: T, key: keyof T): T[] => {
        const idx = arr.findIndex((x) => x[key] === item[key]);
        if (idx === -1) return [item, ...arr];
        const next = [...arr];
        next[idx] = item;
        return next;
    };

    const removeById = <T, K extends keyof T>(arr: T[], id: T[K], key: K): T[] =>
        arr.filter((x) => x[key] !== id);

    return {
        // ── Trips ─────────────────────────────────────
        'trip:created': (t: Trip) => {
            const norm = { ...t, date: t.date?.split('T')[0] || t.date || '' };
            set((s) => ({ allTrips: upsertById(s.allTrips, norm as Trip, 'trip_id') }));
            get().addNotification?.({
                title: isAr() ? '🔄 رحلة جديدة' : '🔄 New trip',
                message: t.trip_id || '',
                type: NotificationType.INFO,
            });
        },
        'trip:updated': (t: Trip) => {
            const norm = { ...t, date: t.date?.split('T')[0] || t.date || '' };
            set((s) => ({ allTrips: upsertById(s.allTrips, norm as Trip, 'trip_id') }));
        },
        'trip:deleted': (d: { trip_id: string }) => {
            set((s) => ({ allTrips: removeById(s.allTrips, d.trip_id, 'trip_id') }));
        },

        // ── Projects ──────────────────────────────────
        'project:created': (p: Project) => set((s) => ({ allProjects: upsertById(s.allProjects, p, 'project_id') })),
        'project:updated': (p: Project) => set((s) => ({ allProjects: upsertById(s.allProjects, p, 'project_id') })),
        'project:deleted': (d: { project_id: string }) => set((s) => ({ allProjects: removeById(s.allProjects, d.project_id, 'project_id') })),

        // ── Companies ─────────────────────────────────
        'company:created': (c: Company) => set((s) => ({ companies: upsertById(s.companies, c, 'company_id') })),
        'company:updated': (c: Company) => set((s) => ({ companies: upsertById(s.companies, c, 'company_id') })),
        'company:deleted': (d: { company_id: string }) => set((s) => ({ companies: removeById(s.companies, d.company_id, 'company_id') })),

        // ── Vehicles ──────────────────────────────────
        'vehicle:created': (v: Vehicle) => set((s) => ({ vehicles: upsertById(s.vehicles, v, 'vehicle_id') })),
        'vehicle:updated': (v: Vehicle) => set((s) => ({ vehicles: upsertById(s.vehicles, v, 'vehicle_id') })),
        'vehicle:deleted': (d: { vehicle_id: string }) => set((s) => ({ vehicles: removeById(s.vehicles, d.vehicle_id, 'vehicle_id') })),

        // ── Drivers ───────────────────────────────────
        'driver:created': (d: Driver) => set((s) => ({ drivers: upsertById(s.drivers, d, 'driver_id') })),
        'driver:updated': (d: Driver) => set((s) => ({ drivers: upsertById(s.drivers, d, 'driver_id') })),
        'driver:deleted': (d: { driver_id: string }) => set((s) => ({ drivers: removeById(s.drivers, d.driver_id, 'driver_id') })),

        // ── Asset requests (subcontractor portal) ─────
        'asset_req:created': (r: unknown) => set((s) => ({ assetRequests: upsertById(s.assetRequests, r as AssetRequest, 'id') })),
        'asset_req:updated': (r: unknown) => set((s) => ({ assetRequests: upsertById(s.assetRequests, r as AssetRequest, 'id') })),
        'asset_req:deleted': (d: { id: string | number }) => set((s) => ({ assetRequests: removeById(s.assetRequests, d.id, 'id') })),

        // ── Notifications ─────────────────────────────
        'notif:new': (n: NotificationEvent) => set((s) => {
            const incoming = n as Partial<AppNotification> & { read?: boolean };
            const normalized: AppNotification = {
                id: incoming.id || `notif-${Date.now()}`,
                type: incoming.type || NotificationType.INFO,
                title: incoming.title || '',
                message: incoming.message || '',
                timestamp: incoming.timestamp || new Date().toISOString(),
                isRead: incoming.isRead ?? incoming.read ?? false,
                userId: incoming.userId || '',
                ...(incoming.targetUserId ? { targetUserId: incoming.targetUserId } : {}),
                ...(incoming.companyId ? { companyId: incoming.companyId } : {}),
                ...(incoming.projectId ? { projectId: incoming.projectId } : {}),
                ...(incoming.actionUrl ? { actionUrl: incoming.actionUrl } : {}),
                ...(incoming.link ? { link: incoming.link } : {}),
            };

            return { notifications: [normalized, ...s.notifications] };
        }),

        // ── Inventory ─────────────────────────────────
        'inventory:updated': (i: InventoryEvent) => {
            if (i.container_id) set((s) => ({ containers: upsertById(s.containers, i as unknown as Container, 'container_id') }));
            else if (i.tank_id) set((s) => ({ tanks: upsertById(s.tanks, i as unknown as Tank, 'tank_id') }));
            else if (i.scale_id) set((s) => ({ scales: upsertById(s.scales, i as unknown as Scale, 'scale_id') }));
        },
    };
};

export const useLiveStream = () => {
    const esRef = useRef<EventSource | null>(null);
    const currentUserId = useGCMStore((s) => s.currentUser?.id);
    const isAuth = useGCMStore((s) => s.isAuthenticated);

    useEffect(() => {
        if (!isAuth || !currentUserId) return;

        const url = getEventsUrl();
        const es = new EventSource(url);
        esRef.current = es;

        const handlers = buildHandlers();

        es.onopen = () => {
            console.log('[SSE] connected');
        };

        es.onerror = () => {
            // EventSource auto-reconnects (using `retry:` from server). No manual logic needed.
            console.warn('[SSE] error / reconnecting');
        };

        // Generic message (no `event:` field) — ignore
        es.onmessage = () => { /* heartbeat / unnamed */ };

        for (const [name, fn] of Object.entries(handlers)) {
            es.addEventListener(name, ((e: MessageEvent) => {
                try {
                    fn(JSON.parse(e.data));
                } catch (parseErr) {
                    console.error(`[SSE] failed to parse ${name}`, parseErr);
                }
            }) as EventListener);
        }

        return () => {
            es.close();
            esRef.current = null;
        };
    }, [isAuth, currentUserId]);

    return esRef;
};
