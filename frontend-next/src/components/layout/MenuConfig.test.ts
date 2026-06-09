/// <reference types="vitest" />

import { getMenuGroups } from './MenuConfig';
import { Role } from '@/types';

type VitestGlobals = typeof import('vitest');
declare const describe: VitestGlobals['describe'];
declare const test: VitestGlobals['test'];
declare const expect: VitestGlobals['expect'];

type MenuItem = {
  name: string;
  href: string;
  roles: Role[];
};

type MenuGroup = {
  title: string;
  roles: Role[];
  items: MenuItem[];
};

const t = {
  ops: 'Operations',
  logistics: 'Logistics',
  admin: 'Admin',
  dashboard: 'Dashboard',
  companies: 'Companies',
  projects: 'Projects',
  trips: 'Trips',
  fleet: 'Fleet',
  inventory: 'Inventory',
  drivers: 'Drivers',
  suppliers: 'Suppliers',
  facilities: 'Facilities',
  accounting: 'Accounting',
  users: 'Users',
  services: 'Services',
  logs: 'Logs',
  settings: 'Settings',
  monitor: 'Monitor',
  landing: 'Landing',
};

const getVisibleItemsForRole = (role: Role) => {
  const menuGroups = getMenuGroups(t, false, role) as MenuGroup[];

  const filteredGroups = menuGroups
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }));

  const visibleGroups = (filteredGroups.length > 0 ? filteredGroups : menuGroups)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  return visibleGroups.flatMap((group) => group.items);
};

describe('menu parity', () => {
  test('every role has at least one visible nav item', () => {
    const roles = Object.values(Role);

    for (const role of roles) {
      const visibleItems = getVisibleItemsForRole(role);
      expect(
        visibleItems.length,
        `Expected at least one visible nav item for role ${role}`,
      ).toBeGreaterThan(0);
    }
  });
});
