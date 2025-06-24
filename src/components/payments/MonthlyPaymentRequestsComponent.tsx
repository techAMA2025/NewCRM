'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { db } from '@/firebase/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp, getDoc, query, limit, where, orderBy, deleteDoc } from 'firebase/firestore';
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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  InputAdornment,
  DialogActions,
  StyledEngineProvider,
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

export default function MonthlyPaymentRequestsComponent() {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOverlord, setIsOverlord] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PaymentRequest | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<{id: string, clientId: string} | null>(null);
  const router = useRouter();

  // Optimize fetchPaymentRequests function
  const fetchPaymentRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Limit the number of clients fetched and order them
      const clientsQuery = query(collection(db, 'clients_payments'));
      const clientsSnapshot = await getDocs(clientsQuery);
      
      // Create an array of promises to fetch payment history
      const requestPromises = clientsSnapshot.docs.map(async (clientDoc) => {
        const clientId = clientDoc.id;
        const clientName = clientDoc.data().clientName || 'Unknown Client';
        
        // Limit and sort the payment history
        const historyQuery = query(
          collection(db, `clients_payments/${clientId}/payment_history`),
          orderBy('requestDate', 'desc'),
          limit(10)
        );
        
        const historySnapshot = await getDocs(historyQuery);
        
        const requests = historySnapshot.docs.map(doc => ({
          id: doc.id,
          clientId,
          clientName,
          ...doc.data()
        })) as PaymentRequest[];
        
        return requests;
      });
      
      // Execute all requests in parallel instead of sequentially
      const results = await Promise.all(requestPromises);
      const allRequests = results.flat();
      
      // Debug check for undefined or missing fields
      const invalidRequests = allRequests.filter(req => 
        !req.id || !req.clientId || !req.payment_status || req.requestedAmount === undefined
      );
      
      if (invalidRequests.length > 0) {
        console.warn('Found invalid payment requests:', invalidRequests.length);
      }
      
      setPaymentRequests(allRequests);
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError('Failed to load payment requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is overlord
    const userRole = localStorage.getItem('userRole');
    const storedUserName = localStorage.getItem('userName');
    setUserName(storedUserName);
    
    if (userRole !== 'overlord') {
      setError('Only overlords can access this page');
      setIsOverlord(false);
    } else {
      setIsOverlord(true);
      fetchPaymentRequests();
    }
  }, [fetchPaymentRequests]);

  // Add more debug logs to the filtering logic
  const pendingRequests = useMemo(() => {
    const filtered = paymentRequests.filter(req => {
      const isPending = req.payment_status !== 'approved' && req.payment_status !== 'Approved';
      return isPending;
    });
    
    return filtered;
  }, [paymentRequests]);
  
  const approvedRequests = useMemo(() => {
    const filtered = paymentRequests.filter(req => {
      const isApproved = req.payment_status === 'approved' || req.payment_status === 'Approved';
      return isApproved;
    });
    
    return filtered;
  }, [paymentRequests]);

  const approvePaymentRequest = async (id: string, clientId: string) => {
    try {
      if (!userName) {
        setError('User name not found in local storage');
        return;
      }

      // Get the payment request
      const paymentRef = doc(db, `clients_payments/${clientId}/payment_history`, id);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        setError('Payment request not found');
        return;
      }
      
      const paymentData = paymentDoc.data() as PaymentRequest;
      
      // Update payment status
      await updateDoc(paymentRef, {
        payment_status: 'approved',
        approved_by: userName
      });
      
      // Update client payment data
      const clientRef = doc(db, 'clients_payments', clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const newPaidAmount = (clientData.paidAmount || 0) + paymentData.requestedAmount;
        const newPendingAmount = (clientData.totalPaymentAmount || 0) - newPaidAmount;
        
        // Update monthly payment status
        const monthRef = doc(db, `clients_payments/${clientId}/monthly_payments`, `month_${paymentData.monthNumber}`);
        const monthDoc = await getDoc(monthRef);
        
        let updatedPaidAmount = paymentData.requestedAmount;
        let updatedStatus = 'pending';
        let paymentsCompleted = clientData.paymentsCompleted || 0;
        
        if (monthDoc.exists()) {
          const monthData = monthDoc.data();
          updatedPaidAmount += (monthData.paidAmount || 0);
          
          if (updatedPaidAmount >= monthData.dueAmount) {
            updatedStatus = 'paid';
            // Increment completed payments if transitioning to paid
            if (monthData.status !== 'paid') {
              paymentsCompleted += 1;
            }
          } else if (updatedPaidAmount > 0) {
            updatedStatus = 'partial';
          }
          
          // Update the monthly payment document
          await updateDoc(monthRef, {
            paidAmount: updatedPaidAmount,
            status: updatedStatus
          });
        }
        
        // Update the client document
        await updateDoc(clientRef, {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          paymentsCompleted: paymentsCompleted
        });
      }

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

  const handleDeleteRequest = (id: string, clientId: string) => {
    setDeletingRequest({ id, clientId });
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRequest) return;
    
    try {
      // Reference to the payment request document
      const paymentRef = doc(db, `clients_payments/${deletingRequest.clientId}/payment_history`, deletingRequest.id);
      
      // Delete the document
      await deleteDoc(paymentRef);
      
      // Update local state to remove the deleted request
      setPaymentRequests(prevRequests => 
        prevRequests.filter(req => !(req.id === deletingRequest.id && req.clientId === deletingRequest.clientId))
      );
      
      // Close the confirmation dialog
      setIsDeleteConfirmOpen(false);
      setDeletingRequest(null);
      
    } catch (err) {
      console.error('Error deleting payment request:', err);
      setError('Failed to delete payment request');
    }
  };

  const handleEditRequest = (request: PaymentRequest) => {
    setEditingRequest(request);
    setNewAmount(request.requestedAmount);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    
    try {
      // Reference to the payment request document
      const paymentRef = doc(
        db, 
        `clients_payments/${editingRequest.clientId}/payment_history`, 
        editingRequest.id
      );
      
      // Update the document with new amount
      await updateDoc(paymentRef, {
        requestedAmount: newAmount
      });
      
      // Update local state
      setPaymentRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === editingRequest.id && req.clientId === editingRequest.clientId
            ? { ...req, requestedAmount: newAmount }
            : req
        )
      );
      
      // Close the modal
      setIsEditModalOpen(false);
      setEditingRequest(null);
      
    } catch (err) {
      console.error('Error updating payment request:', err);
      setError('Failed to update payment request');
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
    <StyledEngineProvider injectFirst>
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
                  <Badge color="warning" badgeContent=" " variant="dot" sx={{ mr: 1 }}>
                    <Notifications sx={{ color: 'warning.main' }} />
                  </Badge>
                  <Box>
                    <Typography color="grey.400" variant="caption" sx={{ display: 'block' }}>Pending</Typography>
                    <Typography color="white" fontWeight="bold">
                      {pendingRequests.length}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Pending Requests Section */}
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Chip label="Pending" color="warning" sx={{ mr: 2 }} icon={<Badge sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                }} />} />
                <Typography variant="h6" color="white">
                  Pending Requests ({pendingRequests.length})
                </Typography>
              </Box>
              
              {pendingRequests.length === 0 ? (
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
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2.5
                }}>
                  {pendingRequests.map(request => (
                    <MemoizedRequestCard 
                      key={request.id} 
                      request={request} 
                      onApprove={() => approvePaymentRequest(request.id, request.clientId)}
                      onDelete={() => handleDeleteRequest(request.id, request.clientId)}
                      onEdit={() => handleEditRequest(request)}
                      formatDate={formatDate}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Approved Requests Section */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Chip label="Approved" color="success" sx={{ mr: 2 }} icon={<CheckCircle sx={{ fontSize: '0.8rem' }} />} />
                <Typography variant="h6" color="white">
                  Approved Requests ({approvedRequests.length})
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2.5
              }}>
                {approvedRequests.map(request => (
                  <MemoizedRequestCard 
                    key={request.id} 
                    request={request} 
                    onApprove={() => {}}
                    onDelete={() => handleDeleteRequest(request.id, request.clientId)}
                    onEdit={() => handleEditRequest(request)}
                    formatDate={formatDate}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Edit Amount Modal */}
        <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          <DialogTitle sx={{ bgcolor: 'background.paper', color: 'white' }}>
            Edit Payment Amount
          </DialogTitle>
          <DialogContent sx={{ bgcolor: 'background.paper', pt: 2 }}>
            <DialogContentText sx={{ color: 'grey.400', mb: 2 }}>
              Update the requested payment amount for {editingRequest?.clientName}
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Payment Amount"
              type="number"
              fullWidth
              variant="outlined"
              value={newAmount}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'grey.400',
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'background.paper', px: 3, pb: 3 }}>
            <Button 
              onClick={() => setIsEditModalOpen(false)}
              variant="outlined"
              color="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              variant="contained"
              color="primary"
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={isDeleteConfirmOpen} 
          onClose={() => setIsDeleteConfirmOpen(false)}
        >
          <DialogTitle sx={{ bgcolor: 'background.paper', color: 'white' }}>
            Confirm Deletion
          </DialogTitle>
          <DialogContent sx={{ bgcolor: 'background.paper', pt: 2 }}>
            <DialogContentText sx={{ color: 'grey.400' }}>
              Are you sure you want to delete this payment request? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'background.paper', px: 3, pb: 3 }}>
            <Button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              variant="outlined"
              color="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete} 
              variant="contained"
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

// Define interface first
interface RequestCardProps {
  request: PaymentRequest;
  onApprove: () => void;
  onDelete: () => void;
  onEdit: () => void;
  formatDate: (timestamp: any) => string;
}

// Define the RequestCard component
const RequestCard = ({ request, onApprove, onDelete, onEdit, formatDate }: RequestCardProps) => {
  return (
    <Card sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ 
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: request.payment_status === 'approved' || request.payment_status === 'Approved'
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
                label={request.payment_status === 'approved' || request.payment_status === 'Approved' ? 'Approved' : 'Pending'}
                color={request.payment_status === 'approved' || request.payment_status === 'Approved' ? 'success' : 'warning'}
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
            {(request.payment_status === 'approved' || request.payment_status === 'Approved') && (
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
              background: request.payment_status === 'approved' || request.payment_status === 'Approved'
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

        {request.notes && (
          <Box sx={{ mb: 2 }}>
            <Typography color="grey.400" variant="caption" sx={{ mb: 0.5, display: 'block' }}>Notes</Typography>
            <Typography color="white" variant="body2" sx={{ fontSize: '0.85rem' }}>
              {request.notes}
            </Typography>
          </Box>
        )}

        {(request.payment_status === 'approved' || request.payment_status === 'Approved') ? (
          <Box sx={{ 
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
          }}>
            <Box sx={{ 
              flex: 1,
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
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ 
                py: 0.75,
                background: 'rgba(140, 92, 255, 0.05)', 
                borderColor: 'rgba(140, 92, 255, 0.3)',
                color: '#8C5CFF'
              }}
              onClick={onEdit}
            >
              Edit
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
              onClick={onDelete}
            >
              Delete
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ flex: 1, py: 0.75 }}
              size="small"
              onClick={onApprove}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ 
                py: 0.75,
                background: 'rgba(140, 92, 255, 0.05)', 
                borderColor: 'rgba(140, 92, 255, 0.3)',
                color: '#8C5CFF'
              }}
              onClick={onEdit}
            >
              Edit
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
              onClick={onDelete}
            >
              Delete
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
};

// Memoize after defining the component
const MemoizedRequestCard = memo(RequestCard); 