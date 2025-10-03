import React from 'react';
import KYCUpload from './KYCUpload';

export default {
  title: 'Components/KYC/KYCUpload',
  component: KYCUpload,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => <KYCUpload />;

export const WithNationalId = () => <KYCUpload />;

export const WithPassport = () => <KYCUpload />;

export const WithDriversLicense = () => <KYCUpload />;

export const Uploading = () => <KYCUpload />;

export const Success = () => <KYCUpload />;