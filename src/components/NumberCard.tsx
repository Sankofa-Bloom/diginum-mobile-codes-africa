import React from 'react';
import { Copy, Clock, Phone, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface NumberOrder {
  id: string;
  phoneNumber: string;
  service: string;
  country: string;
  status: 'active' | 'completed' | 'expired' | 'pending';
  smsCode?: string;
  expiresAt: string;
  createdAt: string;
  price: number;
}

interface NumberCardProps {
  order: NumberOrder;
  onCancel?: (orderId: string) => void;
  onRefresh?: (orderId: string) => void;
  onRequestAnother?: (orderId: string) => void;
}

const NumberCard: React.FC<NumberCardProps> = ({ order, onCancel, onRefresh, onRequestAnother }) => {
  const [timeLeft, setTimeLeft] = React.useState('');
  const { t } = useLanguage();

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.expiresAt).getTime();
      const diff = expiry - now;

      if (diff > 0) {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Expiré');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.expiresAt]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié!',
      description: `${label} copié dans le presse-papiers`,
    });
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'active':
        return <Badge className="status-active">Actif</Badge>;
      case 'completed':
        return <Badge className="status-completed bg-success/10 text-success border-success/20">Terminé</Badge>;
      case 'expired':
        return <Badge className="status-expired">Expiré</Badge>;
      case 'pending':
        return <Badge className="status-pending">En attente</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (order.status) {
      case 'active':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="card-number">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon()}
            {order.service}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <div className="text-sm text-muted-foreground">
          {order.country} • ₣{order.price.toLocaleString()} XAF
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Phone Number */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-mono text-lg">{order.phoneNumber}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(order.phoneNumber, 'Numéro')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* SMS Code */}
        {order.smsCode && (
          <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Code SMS reçu:</div>
              <div className="font-mono text-xl font-bold text-success">
                {order.smsCode}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(order.smsCode!, 'Code SMS')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Timer */}
        {order.status === 'active' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expire dans:</span>
            <span className="font-mono font-bold text-warning">{timeLeft}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {order.status === 'active' && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(order.id)}
              className="flex-1"
            >
              Actualiser
            </Button>
          )}
          
          {order.status === 'active' && onCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(order.id)}
              className="flex-1"
            >
              Annuler
            </Button>
          )}

          {(order.status === 'completed' || order.status === 'expired') && onRequestAnother && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestAnother(order.id)}
              className="flex-1 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('dashboard.requestAnother')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NumberCard;