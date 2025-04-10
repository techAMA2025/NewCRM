'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Divider, 
  AppBar,
  Toolbar,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Paper,
  Badge
} from '@mui/material';
import { 
  AttachMoney,
  Notifications,
  AccountCircle,
  CheckCircle,
  Menu as MenuIcon
} from '@mui/icons-material';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

// Update the dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5E81F4', // Modern bright blue
    },
    secondary: {
      main: '#8C5CFF', // Vibrant purple
    },
    background: {
      default: '#131520', // Deep space background
      paper: '#1C1F30', // Richer card background
    },
    success: {
      main: '#00D097', // Vivid green
    },
    warning: {
      main: '#FF8A48', // Warm orange
    },
    error: {
      main: '#FF5A65', // Bright red
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      letterSpacing: '0.015em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '3px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(28, 31, 48, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.75rem',
          padding: '0 4px',
          height: '28px',
          backdropFilter: 'blur(8px)',
        },
        label: {
          padding: '0 10px',
        },
      },
      variants: [
        {
          props: { color: 'success', variant: 'filled' },
          style: {
            backgroundColor: 'rgba(0, 208, 151, 0.15)',
            color: '#00D097',
            border: '1px solid rgba(0, 208, 151, 0.3)',
          },
        },
        {
          props: { color: 'warning', variant: 'filled' },
          style: {
            backgroundColor: 'rgba(255, 138, 72, 0.15)',
            color: '#FF8A48',
            border: '1px solid rgba(255, 138, 72, 0.3)',
          },
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px rgba(94, 129, 244, 0.3)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #5E81F4 0%, #7C6BFF 100%)',
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }
      }
    },
  },
});

interface PaymentRequest {
  id: string;
  clientId: string;
  clientName: string;
  dueAmount: number;
  dueDate: Timestamp;
  monthNumber: number;
  notes: string;
  paidAmount: number;
  payment_status: string;
  requestDate: Timestamp;
  requestedAmount: number;
  requestedBy: string;
  approved_by?: string;
}

export default function MonthlyPaymentRequests() {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOverlord, setIsOverlord] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is overlord
    const userRole = localStorage.getItem('userRole');
    const storedUserName = localStorage.getItem('userName');
    setUserName(storedUserName);
    
    if (userRole !== 'overlord') {
      setError('Only overlords can access this page');
      setIsOverlord(false);
      // Optionally redirect to another page
      // router.push('/dashboard');
    } else {
      setIsOverlord(true);
      fetchPaymentRequests();
    }
  }, []);

  const fetchPaymentRequests = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, 'monthly_pay_req'));
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRequest[];
      
      setPaymentRequests(requests);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError('Failed to load payment requests');
      setIsLoading(false);
    }
  };

  const approvePaymentRequest = async (id: string) => {
    try {
      if (!userName) {
        setError('User name not found in local storage');
        return;
      }

      const paymentRef = doc(db, 'monthly_pay_req', id);
      await updateDoc(paymentRef, {
        payment_status: 'approved',
        approved_by: userName
      });

      // Update local state to reflect changes
      setPaymentRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === id ? { ...req, payment_status: 'approved', approved_by: userName } : req
        )
      );
    } catch (err) {
      console.error('Error approving payment request:', err);
      setError('Failed to approve payment request');
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp?.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) || 'Invalid date';
  };

  if (error && !isOverlord) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ p: 4, textAlign: 'center', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, maxWidth: 500, borderRadius: 4 }}>
            <Typography variant="h5" color="error" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body1" mt={2}>
              You do not have permission to view this page.
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 3 }}
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          minHeight: '100vh', 
          bgcolor: 'background.default',
          background: 'radial-gradient(circle at 10% 10%, rgba(94, 129, 244, 0.03) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(140, 92, 255, 0.03) 0%, transparent 40%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <OverlordSidebar />
        
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 4 },
            pt: { xs: 8, sm: 8 }
          }}
        >
          {/* Header Section */}
          <Box sx={{ 
            mb: 4, 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2
          }}>
            <Typography variant="h4" color="white" sx={{ 
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                width: '40px',
                height: '4px',
                bottom: '-6px',
                left: '0',
                background: 'linear-gradient(90deg, #5E81F4, #8C5CFF)',
                borderRadius: '2px',
              }
            }}>
              Payment Approval Requests
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                px: 2.5, 
                py: 1.5, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}>
                <AttachMoney sx={{ color: 'primary.main', mr: 1 }} />
                <Box>
                  <Typography color="grey.400" variant="caption" sx={{ display: 'block' }}>Total Requests</Typography>
                  <Typography color="white" fontWeight="bold">{paymentRequests.length}</Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                px: 2.5, 
                py: 1.5, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}>
                <Badge color="warning" badgeContent=" " variant="dot" sx={{ mr: 1, '& .MuiBadge-badge': { animation: 'pulse 2s infinite' } }}>
                  <Notifications sx={{ color: 'warning.main' }} />
                </Badge>
                <Box>
                  <Typography color="grey.400" variant="caption" sx={{ display: 'block' }}>Pending</Typography>
                  <Typography color="white" fontWeight="bold">
                    {paymentRequests.filter(req => req.payment_status !== 'approved').length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Pending Requests Section */}
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Chip 
                label="Pending" 
                color="warning" 
                sx={{ mr: 2 }} 
                icon={<Badge sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(255, 138, 72, 0.7)' },
                    '70%': { boxShadow: '0 0 0 6px rgba(255, 138, 72, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(255, 138, 72, 0)' },
                  },
                }} />}
              />
              <Typography variant="h6" color="white">
                Pending Requests ({paymentRequests.filter(req => req.payment_status !== 'approved').length})
              </Typography>
            </Box>
            
            {paymentRequests.filter(req => req.payment_status !== 'approved').length === 0 ? (
              <Card sx={{ p: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
                <Box sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6
                }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2, opacity: 0.7 }} />
                  <Typography color="grey.400" variant="body1">All caught up! No pending requests</Typography>
                </Box>
              </Card>
            ) : (
              // Render pending requests here
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2.5
              }}>
                {paymentRequests
                  .filter(req => req.payment_status !== 'approved')
                  .map(request => (
                    <RequestCard 
                      key={request.id} 
                      request={request} 
                      onApprove={approvePaymentRequest}
                      formatDate={formatDate}
                    />
                  ))}
              </Box>
            )}
          </Box>

          {/* Approved Requests Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Chip 
                label="Approved" 
                color="success" 
                sx={{ mr: 2 }} 
                icon={<CheckCircle sx={{ fontSize: '0.8rem' }} />}
              />
              <Typography variant="h6" color="white">
                Approved Requests ({paymentRequests.filter(req => req.payment_status === 'approved').length})
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2.5
            }}>
              {paymentRequests
                .filter(req => req.payment_status === 'approved')
                .map(request => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    onApprove={approvePaymentRequest}
                    formatDate={formatDate}
                  />
                ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// New component for request cards
interface RequestCardProps {
  request: PaymentRequest;
  onApprove: (id: string) => Promise<void>;
  formatDate: (timestamp: Timestamp) => string;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onApprove, formatDate }) => {
  return (
    <Card sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ 
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: request.payment_status === 'approved' 
          ? 'linear-gradient(90deg, rgba(0, 208, 151, 0.05) 0%, rgba(0, 0, 0, 0) 100%)' 
          : 'linear-gradient(90deg, rgba(255, 138, 72, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ maxWidth: '70%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle1" color="white" sx={{ 
                mr: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 600
              }}>
                {request.clientName}
              </Typography>
              <Chip 
                label={request.payment_status === 'approved' ? 'Approved' : 'Pending'}
                color={request.payment_status === 'approved' ? 'success' : 'warning'}
                size="small"
                sx={{ height: '22px', '& .MuiChip-label': { px: 1, py: 0 } }}
              />
            </Box>
            <Typography color="grey.400" variant="caption" sx={{ 
              mb: 0.5,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              ID: {request.clientId}
            </Typography>
            <Typography color="grey.400" variant="caption" sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>
              Requested by: {request.requestedBy}
            </Typography>
            {/* Display approved by information in the header for approved requests */}
            {request.payment_status === 'approved' && (
              <Typography color="success.main" variant="caption" sx={{
                mt: 0.5,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 500
              }}>
                <CheckCircle sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                Approved by: {request.approved_by || 'unknown'}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography color="grey.400" variant="caption" sx={{ mb: 0.5, display: 'block' }}>Amount</Typography>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              background: request.payment_status === 'approved'
                ? 'linear-gradient(90deg, #00D097, #5E81F4)'
                : 'linear-gradient(90deg, #5E81F4, #8C5CFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              ₹{request.requestedAmount.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 1.5,
          mb: 2,
          pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <Box>
            <Typography color="grey.400" variant="caption" sx={{ mb: 0.5, display: 'block' }}>Request Date</Typography>
            <Typography color="white" variant="caption" fontWeight={500}>
              {formatDate(request.requestDate)}
            </Typography>
          </Box>
          <Box>
            <Typography color="grey.400" variant="caption" sx={{ mb: 0.5, display: 'block' }}>Due Date</Typography>
            <Typography color="white" variant="caption" fontWeight={500}>
              {formatDate(request.dueDate)}
            </Typography>
          </Box>
          <Box>
            <Typography color="grey.400" variant="caption" sx={{ mb: 0.5, display: 'block' }}>Month</Typography>
            <Typography color="white" variant="caption" fontWeight={500}>
              {request.monthNumber}
            </Typography>
          </Box>
        </Box>

        {request.payment_status === 'approved' ? (
          <Box sx={{ 
            p: 1.5,
            bgcolor: 'rgba(0, 208, 151, 0.06)', 
            borderRadius: 2,
            border: '1px solid rgba(0, 208, 151, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
            <Typography color="success.main" fontWeight={600} variant="body2">
              APPROVED
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ flex: 1, py: 0.75 }}
              size="small"
              onClick={() => onApprove(request.id)}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              sx={{ 
                py: 0.75,
                background: 'rgba(255, 90, 101, 0.05)', 
                borderColor: 'rgba(255, 90, 101, 0.3)',
                color: '#FF5A65'
              }}
            >
              Delete
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
};
