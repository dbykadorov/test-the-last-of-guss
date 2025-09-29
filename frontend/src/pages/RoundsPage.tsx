import { Link } from 'react-router-dom';
import { useAuthStore } from '@store/auth';
import { useRounds, useCreateRound } from '@hooks/useRounds';
import { useLogout } from '@hooks/useAuth';
import { UserRole, RoundStatus } from '@/types/api';
import Button from '@components/atoms/Button';
import { useRoundChannel } from '@/hooks/useRoundChannel';

const RoundsPage = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { data: rounds, isLoading } = useRounds();
  const createRoundMutation = useCreateRound();
  // Подключим канал без конкретного roundId, чтобы получать broadcast обновлений списка
  // Важно: вызывать хук один раз на странице, чтобы не открывать дубликаты соединений
  useRoundChannel(undefined);

  const handleCreateRound = async () => {
    try {
      await createRoundMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to create round:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getComputedStatus = (startTime: string, endTime: string): RoundStatus => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (now < start) return RoundStatus.COOLDOWN;
    if (now <= end) return RoundStatus.ACTIVE;
    return RoundStatus.FINISHED;
  };

  const getStatusText = (status: RoundStatus) => {
    switch (status) {
      case RoundStatus.ACTIVE:
        return 'Активен';
      case RoundStatus.COOLDOWN:
        return 'Cooldown';
      case RoundStatus.FINISHED:
        return 'Завершен';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="text-center mt-xl">Загрузка...</div>
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
          <h1 className="text-2xl">Список РАУНДОВ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="text-secondary">Имя игрока: {user?.username}</span>
            <Button variant="outline" onClick={logout}>
              Выйти
            </Button>
          </div>
        </div>

        {user?.role === UserRole.ADMIN && (
          <Button
            onClick={handleCreateRound}
            loading={createRoundMutation.isPending}
            className="mb-lg"
          >
            Создать раунд
          </Button>
        )}

        <div>
          {rounds?.map((round) => {
            const liveStatus = getComputedStatus(round.startTime as any, round.endTime as any);
            return (
              <div key={round.id} className="round-card">
                <div className="round-card__header">
                  <Link 
                    to={`/rounds/${round.id}`} 
                    className="round-card__title"
                  >
                    ● Round ID: {round.id}
                  </Link>
                  <span className={`round-card__status round-card__status--${liveStatus}`}>
                    Статус: {getStatusText(liveStatus)}
                  </span>
                </div>
                
                <div className="round-card__time">
                  Start: {formatDate(round.startTime as any)}
                </div>
                <div className="round-card__time">
                  End: {formatDate(round.endTime as any)}
                </div>
                
                <div style={{ 
                  borderTop: '1px solid #e5e7eb', 
                  marginTop: '1rem', 
                  paddingTop: '0.5rem' 
                }}>
                  <div className="text-sm text-secondary">
                    Общий счет: {round.totalScore}
                  </div>
                </div>
              </div>
            );
          })}
          
          {!rounds?.length && (
            <div className="text-center text-secondary mt-xl">
              Раундов пока нет
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundsPage;
