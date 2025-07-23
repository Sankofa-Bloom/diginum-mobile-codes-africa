import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [user, setUser] = useState<any>(undefined); // undefined: loading, null: not logged in
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setUser(null);
          navigate('/login', { replace: true });
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        setUser(null);
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  if (user === undefined) return null; // Or a loading spinner
  if (!user) return null;
  return <>{children}</>;
};

export default PrivateRoute;
