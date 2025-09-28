import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@hooks/useAuth';
import Button from '@components/atoms/Button';
import Input from '@components/atoms/Input';

const loginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [apiError, setApiError] = useState<string>('');
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    try {
      await loginMutation.mutateAsync(data);
    } catch (error: any) {
      setApiError(error.message || 'Ошибка при входе');
    }
  };

  return (
    <div className="container">
      <div style={{ 
        maxWidth: '400px', 
        margin: '2rem auto', 
        padding: '2rem 0' 
      }}>
        <div className="card">
          <h1 className="text-center text-2xl mb-lg">ВОЙТИ</h1>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Имя пользователя:"
              {...register('username')}
              error={Boolean(errors.username)}
              errorMessage={errors.username?.message}
              autoComplete="username"
            />
            
            <Input
              label="Пароль:"
              type="password"
              {...register('password')}
              error={Boolean(errors.password)}
              errorMessage={errors.password?.message}
              autoComplete="current-password"
            />
            
            {apiError && (
              <div className="text-danger text-sm mb-md">
                {apiError}
              </div>
            )}
            
            <Button
              type="submit"
              className="btn--large"
              style={{ width: '100%' }}
              loading={loginMutation.isPending}
            >
              Войти
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
