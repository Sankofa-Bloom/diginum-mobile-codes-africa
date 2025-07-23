import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useSession } from '@/lib/supabaseClient';

interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  markup: number;
}

interface PriceAdjustment {
  id: string;
  service: string;
  country: string;
  markup: number;
}

export default function CurrencyManagement() {
  const { data: session } = useSession();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<PriceAdjustment[]>([]);

  // Exchange rate form state
  const [currency, setCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [markup, setMarkup] = useState('0');

  // Price adjustment form state
  const [selectedService, setSelectedService] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [priceMarkup, setPriceMarkup] = useState('0');

  useEffect(() => {
    fetchExchangeRates();
    fetchPriceAdjustments();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      const response = await api.fetch('/admin/exchange-rates', {
        method: 'GET',
        credentials: 'include',
      });
      setExchangeRates(response.data);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exchange rates',
        variant: 'destructive',
      });
    }
  };

  const fetchPriceAdjustments = async () => {
    try {
      const response = await api.fetch('/admin/price-adjustments', {
        method: 'GET',
        credentials: 'include',
      });
      setPriceAdjustments(response.data);
    } catch (error) {
      console.error('Error fetching price adjustments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch price adjustments',
        variant: 'destructive',
      });
    }
  };

  const updateExchangeRate = async () => {
    if (!currency || !rate) {
      toast({
        title: 'Error',
        description: 'Currency and rate are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.fetch('/admin/exchange-rates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          rate: parseFloat(rate),
          markup: parseFloat(markup),
        }),
      });

      toast({
        title: 'Success',
        description: 'Exchange rate updated successfully',
      });
      fetchExchangeRates();
      setCurrency('');
      setRate('');
      setMarkup('0');
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exchange rate',
        variant: 'destructive',
      });
    }
  };

  const updatePriceAdjustment = async () => {
    if (!selectedService || !selectedCountry || priceMarkup === '') {
      toast({
        title: 'Error',
        description: 'Service, country, and markup are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.fetch('/admin/price-adjustments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService,
          country: selectedCountry,
          markup: parseFloat(priceMarkup),
        }),
      });

      toast({
        title: 'Success',
        description: 'Price adjustment updated successfully',
      });
      fetchPriceAdjustments();
      setSelectedService('');
      setSelectedCountry('');
      setPriceMarkup('0');
    } catch (error) {
      console.error('Error updating price adjustment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price adjustment',
        variant: 'destructive',
      });
    }
  };

  if (!session?.user?.role === 'admin') {
    return <div className="text-center py-8">Access denied</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Currency Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exchange Rates Management */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Form */}
              <div className="space-y-2">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="USD, EUR, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="rate">Exchange Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.000001"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="1.00"
                  />
                </div>
                <div>
                  <Label htmlFor="markup">Markup (%)</Label>
                  <Input
                    id="markup"
                    type="number"
                    step="0.01"
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button onClick={updateExchangeRate}>Update Exchange Rate</Button>
              </div>

              {/* Current Rates */}
              <div className="space-y-2">
                <h3 className="font-semibold">Current Rates</h3>
                <div className="space-y-1">
                  {exchangeRates.map((rate) => (
                    <div key={rate.id} className="flex justify-between">
                      <span>{rate.currency}</span>
                      <span>
                        {rate.rate.toFixed(6)} USD ({rate.markup * 100}% markup)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Adjustments Management */}
        <Card>
          <CardHeader>
            <CardTitle>Price Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Form */}
              <div className="space-y-2">
                <div>
                  <Label htmlFor="service">Service</Label>
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={selectedCountry}
                    onValueChange={setSelectedCountry}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="RU">Russia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priceMarkup">Price Markup (%)</Label>
                  <Input
                    id="priceMarkup"
                    type="number"
                    step="0.01"
                    value={priceMarkup}
                    onChange={(e) => setPriceMarkup(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button onClick={updatePriceAdjustment}>Update Price Adjustment</Button>
              </div>

              {/* Current Adjustments */}
              <div className="space-y-2">
                <h3 className="font-semibold">Current Adjustments</h3>
                <div className="space-y-1">
                  {priceAdjustments.map((adjustment) => (
                    <div key={adjustment.id} className="flex justify-between">
                      <span>{adjustment.service} ({adjustment.country})</span>
                      <span>{adjustment.markup * 100}% markup</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
