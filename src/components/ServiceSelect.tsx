import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Service {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
}

interface ServiceSelectProps {
  services: Service[];
  selectedService?: string;
  onServiceSelect: (serviceId: string) => void;
}

const ServiceSelect: React.FC<ServiceSelectProps> = ({
  services,
  selectedService,
  onServiceSelect
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher un service (WhatsApp, Telegram, etc.)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredServices.map((service) => (
          <Card
            key={service.id}
            className={`card-service transition-all ${
              selectedService === service.id 
                ? 'border-primary bg-primary/5' 
                : 'hover:border-primary/30'
            }`}
            onClick={() => onServiceSelect(service.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{service.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{service.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {service.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    ₣{service.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">XAF</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun service trouvé pour "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default ServiceSelect;