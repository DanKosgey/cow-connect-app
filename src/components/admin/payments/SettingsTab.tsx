import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';

interface SettingsTabProps {
  rateConfig: { ratePerLiter: number; effectiveFrom: string };
  collectorRateConfig: { ratePerLiter: number; effectiveFrom: string };
  setRateConfig: (config: { ratePerLiter: number; effectiveFrom: string }) => void;
  setCollectorRateConfig: (config: { ratePerLiter: number; effectiveFrom: string }) => void;
  updateMilkRate: () => void;
  updateCollectorRate: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  rateConfig,
  collectorRateConfig,
  setRateConfig,
  setCollectorRateConfig,
  updateMilkRate,
  updateCollectorRate
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Milk Rate Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Rate per Liter (KES)
              </label>
              <Input
                type="number"
                step="0.01"
                value={rateConfig.ratePerLiter}
                onChange={(e) => setRateConfig({
                  ...rateConfig,
                  ratePerLiter: parseFloat(e.target.value) || 0
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From
              </label>
              <Input
                type="date"
                value={rateConfig.effectiveFrom}
                onChange={(e) => setRateConfig({
                  ...rateConfig,
                  effectiveFrom: e.target.value
                })}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={updateMilkRate}>
              Update Milk Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Collector Rate Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collector Rate per Liter (KES)
              </label>
              <Input
                type="number"
                step="0.01"
                value={collectorRateConfig.ratePerLiter}
                onChange={(e) => setCollectorRateConfig({
                  ...collectorRateConfig,
                  ratePerLiter: parseFloat(e.target.value) || 0
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From
              </label>
              <Input
                type="date"
                value={collectorRateConfig.effectiveFrom}
                onChange={(e) => setCollectorRateConfig({
                  ...collectorRateConfig,
                  effectiveFrom: e.target.value
                })}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={updateCollectorRate}>
              Update Collector Rate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;