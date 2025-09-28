import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@store/auth';
import { useRoundDetails, useTapGoose } from '@hooks/useRounds';
import { useQueryClient } from '@tanstack/react-query';
import { RoundStatus } from '@/types/api';
import { useRoundChannel } from '@/hooks/useRoundChannel';

const RoundPage = () => {
  const { id: roundId } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data: round, isLoading } = useRoundDetails(roundId!);
  useRoundChannel(roundId!);
  const tapMutation = useTapGoose(roundId!);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<RoundStatus | undefined>(undefined);

  useEffect(() => {
    if (!round) return;

    const compute = () => {
      const now = new Date();
      const start = new Date(round.startTime);
      const end = new Date(round.endTime);
      if (now < start) {
        setCurrentStatus(RoundStatus.COOLDOWN);
        const diff = start.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }
      if (now <= end) {
        setCurrentStatus(RoundStatus.ACTIVE);
        const diff = end.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }
      setCurrentStatus(RoundStatus.FINISHED);
      setTimeLeft('');
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [round]);

  // Когда локально вычислили, что раунд завершён, а победителя еще нет — форснем обновление
  useEffect(() => {
    if (!roundId) return;
    if (currentStatus === RoundStatus.FINISHED && round && !round.winner) {
      queryClient.invalidateQueries({ queryKey: ['rounds', roundId] });
    }
  }, [currentStatus, round, roundId, queryClient]);

  const handleTap = async () => {
    if (currentStatus !== RoundStatus.ACTIVE) return;
    
    try {
      await tapMutation.mutateAsync();
      // UI feedback: короткая вспышка при бонусе придёт через tap:result; можно подсветить кнопку
    } catch (error) {
      console.error('Tap failed:', error);
    }
  };

  const getStatusText = () => {
    switch (currentStatus ?? round?.status) {
      case RoundStatus.ACTIVE:
        return 'Раунд активен!';
      case RoundStatus.COOLDOWN:
        return 'Cooldown';
      case RoundStatus.FINISHED:
        return 'Раунд завершен';
      default:
        return '';
    }
  };

  const getTimerText = () => {
    switch (currentStatus ?? round?.status) {
      case RoundStatus.ACTIVE:
        return `До конца осталось: ${timeLeft}`;
      case RoundStatus.COOLDOWN:
        return `До начала раунда: ${timeLeft}`;
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="text-center mt-xl">Загрузка...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="container">
        <div className="text-center mt-xl">Раунд не найден</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ padding: '2rem 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <Link to="/rounds" className="text-primary">
            ← Раунды
          </Link>
          <span className="text-secondary">Имя игрока: {user?.username}</span>
        </div>

        <div className="game-area">
          {/* ASCII Goose */}
          <div className="game-area__goose">
            <div 
              className={`goose ${(currentStatus ?? round.status) !== RoundStatus.ACTIVE ? 'goose--disabled' : ''}`}
              onClick={handleTap}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '12px', 
                lineHeight: '12px',
                whiteSpace: 'pre',
                color: '#666'
              }}
            >
{`            ░░░░░░░░░░░░░░░
          ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░
        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░
        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░
      ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░
    ░░▒▒▒▒░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░▒▒▒▒░░
    ░░▒▒▒▒▒▒▒▒░░░░░░░░░░░░▒▒▒▒▒▒▒▒░░
    ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
      ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
        ░░░░░░░░░░░░░░░░░░░░░░░░░░`}
            </div>
          </div>

          <div className="game-area__status">
            <div className="text-2xl text-primary mb-md">
              {getStatusText()}
            </div>
            
            {timeLeft && (
              <div className="game-area__timer">
                {getTimerText()}
              </div>
            )}
            
            <div className="game-area__score">
              Мои очки - {round.myParticipation?.score || 0}
            </div>
          </div>

          {(currentStatus ?? round.status) === RoundStatus.FINISHED && (
            <div className="stats">
              <h3 className="stats__title">Статистика раунда</h3>
              <div className="stats__row">
                <span className="stats__label">Всего</span>
                <span className="stats__value">{round.totalScore}</span>
              </div>
              {round.winner && (
                <div className="stats__row">
                  <span className="stats__label">Победитель - {round.winner.user.username}</span>
                  <span className="stats__value">{round.winner.score}</span>
                </div>
              )}
              <div className="stats__row">
                <span className="stats__label">Мои очки</span>
                <span className="stats__value">{round.myParticipation?.score || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundPage;
