import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@utils/api';
import { Round, RoundDetails, TapResponse } from '@/types/api';
import { getSocket } from '@/utils/socket';
import { useAuthStore } from '@/store/auth';

export const useRounds = () => {
  return useQuery({
    queryKey: ['rounds'],
    queryFn: async (): Promise<Round[]> => {
      const response = await api.get<{ data: Round[] }>('/rounds');
      return response.data.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};

export const useRoundDetails = (roundId: string) => {
  return useQuery({
    queryKey: ['rounds', roundId],
    queryFn: async (): Promise<RoundDetails> => {
      const response = await api.get<{ data: RoundDetails }>(`/rounds/${roundId}`);
      return response.data.data;
    },
    // WS обновляет кэш через round:update; polling не нужен
    refetchInterval: false,
    enabled: Boolean(roundId),
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};

export const useCreateRound = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Round> => {
      const response = await api.post<{ data: Round }>('/rounds');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
};

export const useTapGoose = (roundId: string) => {
  // Не создаём новое соединение, используем singleton
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<TapResponse> => {
      const socket = getSocket(token);
      if (!socket) {
        throw new Error('Socket not initialized');
      }
      if (!socket.connected) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connect timeout')), 1500);
          socket.once('connect', () => {
            clearTimeout(timeout);
            resolve(undefined);
          });
          socket.connect();
        });
      }
      if (!socket.connected) {
        throw new Error('Socket not connected');
      }
      const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit('tap', { roundId }, (ack: { ok: boolean; error?: string }) => resolve(ack));
      });
      if (!res.ok) {
        throw new Error(res.error || 'Tap failed');
      }
      // Ответ tap:result придет по сокету; возвращаем заглушку
      const current = queryClient.getQueryData<RoundDetails>(['rounds', roundId]);
      return {
        myScore: current?.myParticipation?.score ?? 0,
        tapsCount: current?.myParticipation?.tapsCount ?? 0,
        bonusEarned: false,
      } as TapResponse;
    },
    onSuccess: () => {},
  });
};
