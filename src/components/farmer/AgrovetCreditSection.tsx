import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AgrovetCreditRequest from '@/components/farmer/AgrovetCreditRequest';
import CreditRequestHistory from '@/components/farmer/CreditRequestHistory';

const AgrovetCreditSection = () => {
  const [activeTab, setActiveTab] = useState('request');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="request">Request Products</TabsTrigger>
        <TabsTrigger value="history">Request History</TabsTrigger>
      </TabsList>

      <TabsContent value="request">
        <AgrovetCreditRequest />
      </TabsContent>

      <TabsContent value="history">
        <CreditRequestHistory />
      </TabsContent>
    </Tabs>
  );
};

export default AgrovetCreditSection;