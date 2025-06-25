
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
    mutationFn: async ({
      userId,
      title,
      message,
      data = {}
    }: {
      userId: string;
      title: string;
      message: string;
      data?: any;
    }) => {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          data,
        }]);

      if (error) throw error;
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
