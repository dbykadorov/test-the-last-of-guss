import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@store/auth';
import { useRoundDetails, useTapGoose } from '@hooks/useRounds';
import { RoundStatus } from '@/types/api';

const RoundPage = () => {
  const { id: roundId } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: round, isLoading } = useRoundDetails(roundId!);
  const tapMutation = useTapGoose(roundId!);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!round) return;

    const updateTimer = () => {
      const now = new Date();
      let targetTime: Date;
      
      if (round.status === RoundStatus.COOLDOWN) {
        targetTime = new Date(round.startTime);
      } else if (round.status === RoundStatus.ACTIVE) {
        targetTime = new Date(round.endTime);
      } else {
        setTimeLeft('');
        return;
      }

      const diff = targetTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [round]);

  const handleTap = async () => {
    if (round?.status !== RoundStatus.ACTIVE) return;
    
    try {
      await tapMutation.mutateAsync();
    } catch (error) {
      console.error('Tap failed:', error);
    }
  };

  const getStatusText = () => {
    switch (round?.status) {
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
    switch (round?.status) {
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
              className={`goose ${round.status !== RoundStatus.ACTIVE ? 'goose--disabled' : ''}`}
              onClick={handleTap}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '8px', 
                lineHeight: '8px',
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

          {round.status === RoundStatus.FINISHED && (
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
