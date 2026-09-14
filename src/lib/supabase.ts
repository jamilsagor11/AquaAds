import { createClient } from '@supabase/supabase-js';

const RAW_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rjdsqktrwehxvtxhbhum.supabase.co';
export const SUPABASE_URL = RAW_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5IWRp31-Ch4jlLjmTJiXbw_68wszF7V';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseHealthStatus {
  connected: boolean;
  url: string;
  tables: {
    profiles: boolean;
    campaigns: boolean;
    messages: boolean;
  };
  error?: string;
  checkedAt: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const result: SupabaseHealthStatus = {
    connected: false,
    url: SUPABASE_URL,
    tables: {
      profiles: false,
      campaigns: false,
      messages: false,
    },
    checkedAt: new Date().toISOString(),
  };

  try {
    // Check campaigns table
    const { error: campaignsError } = await supabase.from('campaigns').select('id').limit(1);
    result.tables.campaigns = !campaignsError;

    // Check profiles table
    const { error: profilesError } = await supabase.from('profiles').select('id').limit(1);
    result.tables.profiles = !profilesError;

    // Check messages table
    const { error: messagesError } = await supabase.from('messages').select('id').limit(1);
    result.tables.messages = !messagesError;

    result.connected = result.tables.campaigns || result.tables.profiles || result.tables.messages;
    
    if (campaignsError && profilesError && messagesError) {
      result.error = campaignsError.message || profilesError?.message || messagesError?.message || 'Tables not yet initialized in Supabase';
    }
  } catch (err: any) {
    result.error = err?.message || 'Connection check failed';
  }

  return result;
}

export async function syncCampaignToSupabase(campaign: {
  id?: string;
  userId: string;
  campaignName: string;
  companyName: string;
  bottles: number;
  sides: number;
  area: string;
  targetAudience: string;
  startDate: string;
  endDate: string;
  designUrl: string;
  designUrls?: string[];
  totalPrice: number;
  status: string;
  createdAt?: string;
}) {
  try {
    const payload: Record<string, any> = {
      ...(campaign.id ? { id: campaign.id } : {}),
      user_id: campaign.userId,
      campaign_name: campaign.campaignName,
      company_name: campaign.companyName,
      bottles: campaign.bottles,
      sides: campaign.sides,
      area: campaign.area,
      target_audience: campaign.targetAudience,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      design_url: campaign.designUrl,
      total_price: campaign.totalPrice,
      status: campaign.status,
      created_at: campaign.createdAt || new Date().toISOString(),
    };
    if (campaign.designUrls && campaign.designUrls.length > 0) {
      payload.design_urls = campaign.designUrls;
    }
    const { error } = await supabase.from('campaigns').upsert(payload);
    if (error) {
      console.warn('Supabase syncCampaign warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase syncCampaign error:', err);
  }
}

export async function syncMessageToSupabase(message: {
  id?: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  senderRole: string;
  text: string;
  read?: boolean;
  createdAt?: string;
}) {
  try {
    const { error } = await supabase.from('messages').insert({
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      sender_email: message.senderEmail,
      sender_role: message.senderRole,
      text: message.text,
      read: message.read ?? false,
      created_at: message.createdAt || new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase syncMessage warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase syncMessage error:', err);
  }
}

export async function syncProfileToSupabase(profile: {
  uid: string;
  email: string;
  role: string;
  companyName?: string;
  createdAt?: string;
}) {
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: profile.uid,
      email: profile.email,
      role: profile.role,
      company_name: profile.companyName || '',
      created_at: profile.createdAt || new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase syncProfile warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase syncProfile error:', err);
  }
}
