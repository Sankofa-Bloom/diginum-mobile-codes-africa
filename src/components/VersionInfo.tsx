import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

// Import version from package.json
const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
const buildDate = import.meta.env.VITE_BUILD_DATE || new Date().toISOString();
const gitCommit = import.meta.env.VITE_GIT_COMMIT?.substring(0, 7) || 'unknown';

interface VersionInfoProps {
  variant?: 'badge' | 'card' | 'footer';
  className?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ 
  variant = 'badge', 
  className = '' 
}) => {
  const formattedBuildDate = new Date(buildDate).toLocaleDateString();

  if (variant === 'badge') {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        v{version}
      </Badge>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        DigiNum v{version} • Build {gitCommit} • {formattedBuildDate}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version</span>
              <Badge variant="secondary">v{version}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Build</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{gitCommit}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Build Date</span>
              <span className="text-xs">{formattedBuildDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default VersionInfo;