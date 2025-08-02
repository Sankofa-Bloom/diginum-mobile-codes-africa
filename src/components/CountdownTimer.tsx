import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  showWarning?: boolean;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  expiresAt, 
  onExpired, 
  showWarning = true,
  className = "" 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expirationTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
      
      setTimeRemaining(remaining);
      setIsExpired(remaining <= 0);
      
      if (remaining <= 0 && onExpired) {
        onExpired();
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (isExpired) return 'text-red-600';
    if (timeRemaining <= 300) return 'text-red-500'; // 5 minutes or less
    if (timeRemaining <= 600) return 'text-orange-500'; // 10 minutes or less
    return 'text-green-600';
  };

  const getWarningMessage = (): string | null => {
    if (isExpired) return 'Number has expired!';
    if (timeRemaining <= 300) return 'Less than 5 minutes remaining!';
    if (timeRemaining <= 600) return 'Less than 10 minutes remaining!';
    return null;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className={`font-mono font-bold text-lg ${getTimeColor()}`}>
        {formatTime(timeRemaining)}
      </span>
      
      {showWarning && getWarningMessage() && (
        <Badge 
          variant={isExpired ? "destructive" : "secondary"}
          className="ml-2"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {getWarningMessage()}
        </Badge>
      )}
    </div>
  );
};

export default CountdownTimer; 