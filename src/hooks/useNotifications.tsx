import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown>;
}

// Helper function to create notifications via edge function
export const createNotificationSecure = async (params: CreateNotificationParams): Promise<void> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase.functions.invoke('create-notification', {
    body: params
  });

  if (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Failed to create notification');
  }
};

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      await createNotificationSecure(params);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    createNotification: createNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
};
