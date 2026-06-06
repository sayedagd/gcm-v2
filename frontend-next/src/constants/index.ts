import { Role, User } from '@/types';

export const INITIAL_USER: User = {
  id: 'GUEST',
  name: 'GCM Guest',
  email: 'guest@gcm.local',
  password: '',
  role: Role.DEACTIVATED,
  avatar: '/logo.png',
};
