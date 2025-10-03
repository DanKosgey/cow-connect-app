import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import PaymentHistory from './PaymentHistory';

export default {
  title: 'Components/Payments/PaymentHistory',
  component: PaymentHistory,
  argTypes: {
    farmerId: {
      control: 'text',
      description: 'The ID of the farmer to display payment history for',
    },
  },
} as Meta<typeof PaymentHistory>;

const Template: StoryFn<typeof PaymentHistory> = (args) => <PaymentHistory {...args} />;

export const Default = Template.bind({});
Default.args = {
  farmerId: 'farmer-123',
};

export const WithPayments = Template.bind({});
WithPayments.args = {
  farmerId: 'farmer-123',
};
// Mock the usePaymentHistory hook in your test environment to provide sample data