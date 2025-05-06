'use client';

import dynamic from 'next/dynamic';
import { CircularProgress, Box } from '@mui/material';

// Create a loading component
function Loading() {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#131520' 
      }}
    >
      <CircularProgress />
    </Box>
  );
}

// Dynamically import the main component with SSR disabled
const MonthlyPaymentRequestsComponent = dynamic(
  () => import('../../components/payments/MonthlyPaymentRequestsComponent'),
  { 
    ssr: false,
    loading: () => <Loading />
  }
);

export default function MonthlyPaymentRequests() {
  return <MonthlyPaymentRequestsComponent />;
}
