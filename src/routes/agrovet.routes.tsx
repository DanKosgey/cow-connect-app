import { lazy } from 'react';
import AgrovetPortal from '../pages/agrovet/AgrovetPortal';

const AgrovetRoutes = [
  {
    path: '/agrovet',
    element: <AgrovetPortal />,
    auth: true
  }
];

export default AgrovetRoutes;