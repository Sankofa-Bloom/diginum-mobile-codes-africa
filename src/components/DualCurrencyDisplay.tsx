import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DualCurrencyDisplayProps {
  amount: number;
  currency?: string;
  showUSD?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DualCurrencyDisplay: React.FC<DualCurrencyDisplayProps> = ({
  amount,
  currency,
  showUSD = true,
  className = '',
  size = 'md'
}) => {
  const { userCurrency, convertUSDToLocal, formatPrice } = useCurrency();
  const [convertedAmount, setConvertedAmount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const targetCurrency = currency || userCurrency;
  const isUSD = targetCurrency === 'USD';

  React.useEffect(() => {
    const convertAmount = async () => {
      if (isUSD || !showUSD) {
        setConvertedAmount(null);
        return;
      }

      setIsLoading(true);
      try {
        const conversion = await convertUSDToLocal(amount, targetCurrency);
        setConvertedAmount(conversion.finalAmount);
      } catch (error) {
        console.error('Error converting currency:', error);
        setConvertedAmount(null);
      } finally {
        setIsLoading(false);
      }
    };

    convertAmount();
  }, [amount, targetCurrency, isUSD, showUSD, convertUSDToLocal]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const textSize = sizeClasses[size];

  if (isUSD || !showUSD) {
    return (
      <span className={`${textSize} font-medium ${className}`}>
        {formatPrice(amount, targetCurrency)}
      </span>
    );
  }

  return (
    <div className={`${className}`}>
      <div className={`${textSize} font-medium`}>
        {formatPrice(convertedAmount || amount, targetCurrency)}
      </div>
      {showUSD && (
        <div className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
          ≈ {formatPrice(amount, 'USD')}
        </div>
      )}
      {isLoading && (
        <div className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted-foreground animate-pulse`}>
          Converting...
        </div>
      )}
    </div>
  );
};

export default DualCurrencyDisplay;
