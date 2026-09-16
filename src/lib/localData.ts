import { Campaign, ChatMessage, UserProfile } from '../types';

const CAMPAIGNS_KEY = 'aquaads_local_campaigns';
const MESSAGES_KEY = 'aquaads_local_messages';
const USERS_KEY = 'aquaads_local_users';

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_demo_01',
    userId: 'demo_user_1',
    campaignName: 'Summer Hydration Launch',
    companyName: 'PureTech Hydration',
    area: 'Downtown Financial District',
    bottles: 500,
    sides: 2,
    designUrl: 'https://picsum.photos/seed/bottle1/800/800',
    designUrls: ['https://picsum.photos/seed/bottle1/800/800', 'https://picsum.photos/seed/bottle2/800/800'],
    targetAudience: 'Professionals & Tech Workers',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    totalPrice: 425,
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'camp_demo_02',
    userId: 'demo_user_1',
    campaignName: 'Eco Marathon Partnership',
    companyName: 'EcoAthletics',
    area: 'City Center & University',
    bottles: 1000,
    sides: 4,
    designUrl: 'https://picsum.photos/seed/marathon/800/800',
    designUrls: [
      'https://picsum.photos/seed/m1/800/800',
      'https://picsum.photos/seed/m2/800/800',
      'https://picsum.photos/seed/m3/800/800',
      'https://picsum.photos/seed/m4/800/800',
    ],
    targetAudience: 'Marathoners & Fitness Enthusiasts',
    startDate: '2026-10-05',
    endDate: '2026-10-25',
    totalPrice: 850,
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const getLocalCampaigns = (): Campaign[] => {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (!raw) {
      localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(INITIAL_CAMPAIGNS));
      return INITIAL_CAMPAIGNS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CAMPAIGNS;
  }
};

export const saveLocalCampaign = (campaign: Campaign): void => {
  try {
    const current = getLocalCampaigns();
    const updated = [campaign, ...current.filter((c) => c.id !== campaign.id)];
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('aquaads_campaigns_updated'));
  } catch (err) {
    console.warn('Failed to save campaign locally:', err);
  }
};

export const updateLocalCampaignStatus = (
  id: string,
  status: 'approved' | 'rejected' | 'pending'
): void => {
  try {
    const current = getLocalCampaigns();
    const updated = current.map((c) => (c.id === id ? { ...c, status } : c));
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('aquaads_campaigns_updated'));
  } catch (err) {
    console.warn('Failed to update campaign status locally:', err);
  }
};

export const deleteLocalCampaign = (id: string): void => {
  try {
    const current = getLocalCampaigns();
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('aquaads_campaigns_updated'));
  } catch (err) {
    console.warn('Failed to delete campaign locally:', err);
  }
};

export const getLocalMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed: ChatMessage[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strictly deduplicate by message id to prevent duplicate keys
    const seen = new Set<string>();
    const deduped: ChatMessage[] = [];
    for (const item of parsed) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }
    return deduped;
  } catch {
    return [];
  }
};

export const saveLocalMessage = (msg: ChatMessage): void => {
  try {
    const current = getLocalMessages();
    const existingIndex = current.findIndex((m) => m.id === msg.id);
    let updated: ChatMessage[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = msg;
    } else {
      updated = [...current, msg];
    }
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('aquaads_messages_updated'));
  } catch (err) {
    console.warn('Failed to save message locally:', err);
  }
};

export const getLocalUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const defaultUsers: UserProfile[] = [
        {
          uid: 'admin_jmi',
          email: 'jmisagor079@gmail.com',
          displayName: 'Jmi Sagor',
          role: 'admin',
          companyName: 'AquaAds Core Team',
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'admin_tonmoy',
          email: 'tonmoyletar@gmail.com',
          displayName: 'Tonmoy Letar',
          role: 'admin',
          companyName: 'AquaAds Operations',
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'demo_user_1',
          email: 'demo@business.com',
          displayName: 'Alex Rivers',
          role: 'user',
          companyName: 'PureTech Hydration',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveLocalUser = (user: UserProfile): void => {
  try {
    const current = getLocalUsers();
    const existingIndex = current.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    let updated: UserProfile[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...user };
    } else {
      updated = [user, ...current];
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save user locally:', err);
  }
};
