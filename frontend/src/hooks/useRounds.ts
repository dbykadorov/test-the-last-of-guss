import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@utils/api';
import { Round, RoundDetails, TapResponse } from '@/types/api';

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
    refetchInterval: 1000, // Refetch every second for real-time updates
    enabled: !!roundId,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<TapResponse> => {
      const response = await api.post<{ data: TapResponse }>(`/rounds/${roundId}/tap`);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate round details to update score
      queryClient.invalidateQueries({ queryKey: ['rounds', roundId] });
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
};
