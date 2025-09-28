import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { RoundDetails } from '@/types/api';
import { getSocket } from '@/utils/socket';

export function useRoundChannel(roundId: string | undefined) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;
    socketRef.current = socket;

    // Синхронизируем текущее состояние подключения
    setConnected(Boolean(socket.connected));

    const onConnect = () => setConnected(true);

    const onDisconnect = () => setConnected(false);

    const onRoundUpdate = (payload: { roundId?: string; scoreEarned?: number }) => {
      // Мягко обновим список/детали без принудительного запроса, если можем
      if (payload?.roundId) {

        // Если очков пока не было и локального кэша нет — хотя бы метнём invalidate
        queryClient.invalidateQueries({ queryKey: ['rounds', payload.roundId] });
        let detailsUpdated = false;
        queryClient.setQueryData<RoundDetails | undefined>(['rounds', payload.roundId], (prev) => {
          if (!prev) return prev;
          detailsUpdated = true;
          return { ...prev, totalScore: (Number((prev as any).totalScore ?? 0) + Number(payload.scoreEarned ?? 0)) as any } as any;
        });

        // Обновим список раундов
        queryClient.setQueryData<any>(['rounds'], (prevList: any) => {
          if (!Array.isArray(prevList)) return prevList;
          return prevList.map((r: any) => {
            if (r?.id !== payload.roundId) return r;
            const current = Number((r as any).totalScore ?? 0);
            const add = Number(payload.scoreEarned ?? 0);
            const updated = current + add;
            return { ...r, totalScore: (typeof r.totalScore === 'string' ? String(updated) : updated) };
          });
        });

        if (!detailsUpdated) {
          queryClient.invalidateQueries({ queryKey: ['rounds', payload.roundId] });
        }
      }
    };

    const onTapResult = (payload: {
      roundId: string;
      myScore: number;
      tapsCount: number;
      bonusEarned: boolean;
      scoreEarned: number;
    }) => {
      let hadDetails = false;
      queryClient.setQueryData<RoundDetails | undefined>(
        ['rounds', payload.roundId],
        (prev) => {
          if (!prev) return prev;
          hadDetails = true;
          // обновляем myParticipation
          const next = { ...prev } as RoundDetails;
          if (next.myParticipation) {
            next.myParticipation = { ...next.myParticipation, score: payload.myScore, tapsCount: payload.tapsCount } as any;
          }
          // а также синхронизируем запись в списке participants по userId
          if (userId && next.participants?.length) {
            next.participants = next.participants.map((p) =>
              p.user?.id === userId ? { ...p, score: payload.myScore, tapsCount: payload.tapsCount } : p,
            );
          }
          // и общий totalScore увеличим на scoreEarned, если есть (учитывая string | number)
          const add = Number(payload.scoreEarned ?? 0);
          const current = Number((next as any).totalScore ?? 0);
          const updated = current + add;
          // Сохраняем тип как в prev
          next.totalScore = (typeof (prev as any).totalScore === 'string' ? String(updated) : updated) as any;

          return next;
        },
      );
      if (!hadDetails) {
        queryClient.invalidateQueries({ queryKey: ['rounds', payload.roundId] });
      }
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('round:update', onRoundUpdate);
    socket.on('tap:result', onTapResult);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('round:update', onRoundUpdate);
      socket.off('tap:result', onTapResult);
      // не закрываем singleton при размонтировании страницы
      socketRef.current = null;
    };
  }, [token, userId, queryClient]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roundId) return;
    const afterJoinSync = () => {
      // Подтянем актуальные данные раунда сразу после join
      queryClient.invalidateQueries({ queryKey: ['rounds', roundId] });
      // Лёгкая синхронизация списка
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    };
    if (socket.connected) {
      socket.emit('round:join', roundId);
      afterJoinSync();
    } else {
      const joinOnConnect = () => socket.emit('round:join', roundId);
      socket.once('connect', joinOnConnect);
      return () => {
        socket.off('connect', joinOnConnect);
        socket.emit('round:leave', roundId);
      };
    }
    return () => {
      socket.emit('round:leave', roundId);
    };
  }, [roundId, connected]);

  return { socket: socketRef.current, connected };
}


