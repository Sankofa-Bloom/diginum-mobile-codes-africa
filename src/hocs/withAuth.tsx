import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';

export function withAuth(Component: React.ComponentType) {
  return function WithAuth(props: any) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const user = await getCurrentUser();
          if (!user) {
            // Store the intended URL to redirect after login
            const redirectUrl = location.pathname + location.search;
            navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          navigate('/login');
        }
      };

      checkAuth();
    }, [navigate, location]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
