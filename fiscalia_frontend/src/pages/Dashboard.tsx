import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Warning,
  Euro,
  Assessment,
  Refresh,
  Download,
  Search,
  Sort,
  ArrowUpward,
  ArrowDownward,
  DateRange,
  CalendarMonth,
  Today,
} from '@mui/icons-material';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear, 
  subMonths, 
  subQuarters,
  addDays,
  subDays,
  subWeeks
} from 'date-fns';
import { 
  getApplicationDate, 
  formatParisDateTime, 
  formatParisDate,
  getCurrentFiscalYear,
  getCurrentQuarter,
  toApiDateFormat,
  safeParseDate
} from '../utils/dateUtils';
import apiService from '../services/api.service';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { activeCompany } = useCompanyStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard data states
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenseReport, setExpenseReport] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  
  // Calculated KPIs based on selected date range
  const [calculatedKPIs, setCalculatedKPIs] = useState<any>({
    total_income: 0,
    total_expenses: 0,
    net_cash_flow: 0,
    burn_rate: 0
  });
  
  // Calculated tax report based on selected date range
  const [calculatedTaxReport, setCalculatedTaxReport] = useState<any>({
    total_expenses: 0,
    total_deductible: 0,
    vat_deductible: 0,
    non_deductible: 0,
    vat_collected: 0,
    vat_balance: 0,
    estimated_income_tax: 0,
    estimated_corporate_tax: 0
  });

  // Transaction filtering and sorting states
  const [transactionFilter, setTransactionFilter] = useState(() => ({
    search: '',
    category: 'all',
    type: 'all', // 'all', 'credit', 'debit'
    sortBy: 'date', // 'date', 'amount', 'counterparty'
    sortOrder: 'desc' // 'asc', 'desc'
  }));
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionsPerPage, setTransactionsPerPage] = useState(20);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

  // Date range for analysis - using application fixed date
  const [dateRange, setDateRange] = useState(() => {
    const appDate = getApplicationDate();
    return {
      start: startOfMonth(appDate),
      end: endOfMonth(appDate),
      preset: 'current_month'
    };
  });

  // Date preset options
  const datePresets = [
    {
      key: 'last_24h',
      label: 'Dernières 24h',
      icon: <Today />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: subDays(appDate, 1), end: appDate };
      }
    },
    {
      key: 'last_48h',
      label: 'Dernières 48h',
      icon: <Today />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: subDays(appDate, 2), end: appDate };
      }
    },
    {
      key: 'last_7_days',
      label: '7 derniers jours',
      icon: <CalendarMonth />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: subWeeks(appDate, 1), end: appDate };
      }
    },
    {
      key: 'last_30_days',
      label: '30 derniers jours',
      icon: <CalendarMonth />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: addDays(appDate, -30), end: appDate };
      }
    },
    {
      key: 'current_month',
      label: 'Mois actuel',
      icon: <CalendarMonth />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: startOfMonth(appDate), end: endOfMonth(appDate) };
      }
    },
    {
      key: 'last_month',
      label: 'Mois dernier',
      icon: <CalendarMonth />,
      getRange: () => {
        const appDate = getApplicationDate();
        const lastMonth = subMonths(appDate, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
    },
    {
      key: 'current_quarter',
      label: 'Trimestre actuel',
      icon: <DateRange />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: startOfQuarter(appDate), end: endOfQuarter(appDate) };
      }
    },
    {
      key: 'last_quarter',
      label: 'Trimestre dernier',
      icon: <DateRange />,
      getRange: () => {
        const appDate = getApplicationDate();
        const lastQuarter = subQuarters(appDate, 1);
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
      }
    },
    {
      key: 'ytd',
      label: 'Depuis le début de l\'année',
      icon: <Today />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: startOfYear(appDate), end: appDate };
      }
    },
    {
      key: 'current_fiscal_year',
      label: 'Exercice fiscal complet',
      icon: <Assessment />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: startOfYear(appDate), end: endOfYear(appDate) };
      }
    },
    {
      key: 'last_90_days',
      label: '90 derniers jours',
      icon: <DateRange />,
      getRange: () => {
        const appDate = getApplicationDate();
        return { start: addDays(appDate, -90), end: appDate };
      }
    }
  ];

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    const presetConfig = datePresets.find(p => p.key === preset);
    if (presetConfig) {
      const range = presetConfig.getRange();
      console.log(`📅 Date range selected: ${preset}`, {
        start: formatParisDate(range.start, 'yyyy-MM-dd'),
        end: formatParisDate(range.end, 'yyyy-MM-dd'),
        appDate: formatParisDate(getApplicationDate(), 'yyyy-MM-dd')
      });
      setDateRange({
        start: range.start,
        end: range.end,
        preset
      });
    }
  };

  // Get current preset label
  const getCurrentPresetLabel = () => {
    const preset = datePresets.find(p => p.key === dateRange.preset);
    return preset?.label || 'Période personnalisée';
  };

  // Separate function to load transactions with pagination
  const loadTransactions = async (page: number = 0, append: boolean = false) => {
    // Prevent multiple simultaneous calls
    if (loadingMoreTransactions) {
      console.log('⚠️ Skipping load - already loading');
      return false;
    }
    
    try {
      setLoadingMoreTransactions(true);
      
      const startDate = toApiDateFormat(dateRange.start);
      const endDate = toApiDateFormat(dateRange.end);
      
      // Try to get paginated transactions from new API
      const transactionResponse = await apiService.getPaginatedTransactions({
        page: page + 1, // API uses 1-based indexing
        limit: transactionsPerPage,
        start_date: startDate,
        end_date: endDate,
        status: 'completed'
      });
      
      if (transactionResponse.data && transactionResponse.data.status === 'success') {
        const newTransactions = transactionResponse.data.transactions || [];
        const totalCount = transactionResponse.data.total_count || 0;
        
        if (append) {
          setTransactions(prev => [...prev, ...newTransactions]);
        } else {
          // Simple assignment without complex object manipulation
          setTransactions(newTransactions);
        }
        
        setTotalTransactions(totalCount);
        console.log(`✅ Server pagination: loaded ${newTransactions.length} transactions for page ${page + 1} of ${transactionResponse.data.total_pages}`);
        console.log(`📊 Total: ${totalCount} transactions available`);
        console.log(`📋 Sample transactions for page ${page + 1}:`, newTransactions.slice(0, 2));
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Paginated transactions API failed:', error);
      return false;
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = toApiDateFormat(dateRange.start);
      const endDate = toApiDateFormat(dateRange.end);

      // Use real Google Sheets dashboard data
      const realDashboardResponse = await apiService.getRealDashboardData();
      
      if (realDashboardResponse.data.status === 'success') {
        const dashboardData = realDashboardResponse.data.dashboard_data;
        
        // Set real KPIs
        setCashFlow({
          total_income: dashboardData.kpis.total_revenue_2025,
          total_expenses: dashboardData.kpis.total_expenses_2025,
          net_cash_flow: dashboardData.kpis.net_cash_flow,
          burn_rate: dashboardData.kpis.burn_rate,
          transaction_count: dashboardData.total_transactions
        });
        
        // Use all transactions now (not just recent_transactions)
        const allTransactions = dashboardData.all_transactions || dashboardData.recent_transactions || [];
        (window as any).__allTransactions = allTransactions;
        
        console.log(`💾 Stored ${allTransactions.length} transactions for pagination`);
        
        // Set initial page of transactions (page 0)
        const initialTransactions = allTransactions.slice(0, transactionsPerPage);
        setTransactions([...initialTransactions]); // Force new array reference
        setTotalTransactions(allTransactions.length);
        
        console.log(`📄 Initial load: showing ${initialTransactions.length} of ${allTransactions.length} transactions`);
        console.log(`📋 Initial transactions sample:`, initialTransactions.slice(0, 2));
        
        // Set real expense report
        setExpenseReport(dashboardData.expense_report);
        
        // Set anomalies count
        setAnomalies(Array(dashboardData.kpis.anomaly_count).fill({
          type: 'large_transaction',
          severity: 'medium',
          description: 'Transaction importante détectée'
        }));
        
        console.log('✅ Using real Google Sheets data:', allTransactions.length, 'total transactions');
        return; // Exit early since we have real data
      }

      // Fallback to individual API calls if real dashboard fails
      console.log('🌐 Real dashboard failed, using individual API calls');
      
      const results = await Promise.allSettled([
        apiService.getQontoCashFlow({ start_date: startDate, end_date: endDate }),
        apiService.getQontoExpenseReport({
          company_id: activeCompany?.id,
          year: getCurrentFiscalYear(),
          quarter: getCurrentQuarter(),
        }),
        apiService.detectQontoAnomalies(),
        apiService.getQontoPredictions({ months_ahead: 3 }),
      ]);

      // Handle each result individually (transactions already handled above)
      const [cashFlowResult, expenseResult, anomaliesResult, predictionsResult] = results;
      
      if (cashFlowResult.status === 'fulfilled' && cashFlowResult.value?.data) {
        setCashFlow(cashFlowResult.value.data);
      } else if (cashFlowResult.status === 'rejected') {
        console.warn('Cash flow API failed:', cashFlowResult.reason);
      }

      // Load initial transactions with pagination API
      await loadTransactions(0, false);

      if (expenseResult.status === 'fulfilled' && expenseResult.value?.data) {
        setExpenseReport(expenseResult.value.data);
      } else if (expenseResult.status === 'rejected') {
        console.warn('Expense report API failed:', expenseResult.reason);
      }

      if (anomaliesResult.status === 'fulfilled' && anomaliesResult.value?.data) {
        setAnomalies(anomaliesResult.value.data?.anomalies || []);
      } else if (anomaliesResult.status === 'rejected') {
        console.warn('Anomalies API failed:', anomaliesResult.reason);
      }

      if (predictionsResult.status === 'fulfilled' && predictionsResult.value?.data) {
        setPredictions(predictionsResult.value.data);
      } else if (predictionsResult.status === 'rejected') {
        console.warn('Predictions API failed:', predictionsResult.reason);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate KPIs based on filtered transactions
  useEffect(() => {
    const allTransactions = (window as any).__allTransactions || transactions;
    
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      // Filter transactions by current date range
      const filteredByDate = allTransactions.filter(trans => {
        const dateStr = trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at;
        if (!dateStr) return false;
        
        const transDate = safeParseDate(dateStr);
        if (!transDate) return false;
        
        // Set end date to end of day for inclusive comparison
        const endOfDay = new Date(dateRange.end);
        endOfDay.setHours(23, 59, 59, 999);
        
        return transDate >= dateRange.start && transDate <= endOfDay;
      });
      
      // Calculate KPIs from filtered transactions
      const income = filteredByDate
        .filter(t => t?.side === 'credit')
        .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0);
      
      const expenses = filteredByDate
        .filter(t => t?.side === 'debit')
        .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0);
      
      const netCashFlow = income - expenses;
      
      // Calculate burn rate (monthly average of expenses)
      const daysDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
      const monthlyExpenses = (expenses / daysDiff) * 30;
      
      // Calculate previous period for comparison
      const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
      const prevStart = new Date(dateRange.start.getTime() - periodLength);
      const prevEnd = new Date(dateRange.start.getTime() - 1);
      
      const prevFiltered = allTransactions.filter(trans => {
        const transDate = new Date(trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at || 0);
        return transDate >= prevStart && transDate <= prevEnd;
      });
      
      const prevIncome = prevFiltered
        .filter(t => t?.side === 'credit')
        .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0);
      
      const prevExpenses = prevFiltered
        .filter(t => t?.side === 'debit')
        .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0);
      
      // Calculate percentage changes
      const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
      const expensesChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
      
      setCalculatedKPIs({
        total_income: income,
        total_expenses: expenses,
        net_cash_flow: netCashFlow,
        burn_rate: monthlyExpenses,
        income_change: incomeChange,
        expenses_change: expensesChange
      });
      
      console.log(`📊 KPIs recalculated for ${getCurrentPresetLabel()}: Income: ${income}, Expenses: ${expenses}, Net: ${netCashFlow}`);
    }
  }, [transactions, dateRange]);

  // Calculate tax report based on filtered transactions
  useEffect(() => {
    const allTransactions = (window as any).__allTransactions || transactions;
    
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      // Filter transactions by current date range
      const filteredByDate = allTransactions.filter(trans => {
        const dateStr = trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at;
        if (!dateStr) return false;
        
        const transDate = safeParseDate(dateStr);
        if (!transDate) return false;
        
        const endOfDay = new Date(dateRange.end);
        endOfDay.setHours(23, 59, 59, 999);
        
        return transDate >= dateRange.start && transDate <= endOfDay;
      });
      
      // Calculate tax metrics
      let totalExpenses = 0;
      let totalDeductible = 0;
      let vatDeductible = 0;
      let vatCollected = 0;
      let totalIncome = 0;
      
      filteredByDate.forEach(trans => {
        const amount = parseFloat(trans?.amount || trans?.amount_parsed || '0');
        const vatAmount = parseFloat(trans?.['vat amount'] || trans?.vat_amount_parsed || '0');
        
        if (trans?.side === 'debit') {
          totalExpenses += amount;
          
          // Estimate deductibility based on category
          const category = (trans?.category || trans?.['category'] || '').toLowerCase();
          const isDeductible = !category.includes('personal') && 
                              !category.includes('dividende') && 
                              !category.includes('retrait');
          
          if (isDeductible) {
            totalDeductible += amount;
            if (vatAmount > 0) {
              vatDeductible += vatAmount;
            }
          }
        } else if (trans?.side === 'credit') {
          totalIncome += amount;
          if (vatAmount > 0) {
            vatCollected += vatAmount;
          }
        }
      });
      
      const nonDeductible = totalExpenses - totalDeductible;
      const vatBalance = vatCollected - vatDeductible;
      
      // Estimate taxes (simplified calculation)
      const taxableIncome = totalIncome - totalDeductible;
      const estimatedCorporateTax = taxableIncome > 0 ? taxableIncome * 0.15 : 0; // 15% IS taux réduit
      const estimatedIncomeTax = taxableIncome > 0 ? taxableIncome * 0.30 : 0; // Estimation IR
      
      setCalculatedTaxReport({
        total_expenses: totalExpenses,
        total_deductible: totalDeductible,
        vat_deductible: vatDeductible,
        non_deductible: nonDeductible,
        vat_collected: vatCollected,
        vat_balance: vatBalance,
        estimated_income_tax: estimatedIncomeTax,
        estimated_corporate_tax: estimatedCorporateTax,
        taxable_income: taxableIncome
      });
      
      console.log(`📊 Tax report calculated for ${getCurrentPresetLabel()}`);
    }
  }, [transactions, dateRange]);

  useEffect(() => {
    console.log('🔄 Fetching dashboard data due to date/company change');
    
    // Clear cached transactions when filters change
    (window as any).__allTransactions = null;
    
    // Reset to first page and fetch data
    setTransactionPage(0);
    fetchDashboardData();
  }, [dateRange, activeCompany]);

  // Handle page changes
  useEffect(() => {
    // Check if we have cached data first
    const cachedTransactions = (window as any).__allTransactions;
    
    if (cachedTransactions && Array.isArray(cachedTransactions)) {
      // Use cached data for pagination
      const startIndex = transactionPage * transactionsPerPage;
      const endIndex = startIndex + transactionsPerPage;
      const pageTransactions = cachedTransactions.slice(startIndex, endIndex);
      
      console.log(`📄 Using cached data: page ${transactionPage + 1}, showing ${pageTransactions.length} transactions (${startIndex}-${endIndex} of ${cachedTransactions.length})`);
      setTransactions([...pageTransactions]);
      setTotalTransactions(cachedTransactions.length);
    } else if (transactionPage > 0) {
      // Only load from API if no cached data and not on first page
      console.log(`🔄 No cache, loading page ${transactionPage + 1} from API`);
      loadTransactions(transactionPage, false);
    }
  }, [transactionPage, transactionsPerPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Get all transactions with filters and sorting applied
  const filteredAndSortedTransactions = React.useMemo(() => {
    // Use cached transactions if available, otherwise use current page transactions
    const allTransactions = (window as any).__allTransactions || transactions;
    
    if (!Array.isArray(allTransactions) || allTransactions.length === 0) {
      return [];
    }

    // Apply filters on ALL transactions
    let filtered = [...allTransactions];

    // Filter by date range first
    filtered = filtered.filter(trans => {
      const dateStr = trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at;
      if (!dateStr) return false;
      
      const transDate = safeParseDate(dateStr);
      if (!transDate) return false;
      
      // Set end date to end of day for inclusive comparison
      const endOfDay = new Date(dateRange.end);
      endOfDay.setHours(23, 59, 59, 999);
      
      const isInRange = transDate >= dateRange.start && transDate <= endOfDay;
      return isInRange;
    });

    // Search filter
    if (transactionFilter.search) {
      const searchTerm = transactionFilter.search.toLowerCase();
      filtered = filtered.filter(trans => {
        const counterparty = (trans?.['counterparty name'] || trans?.counterparty_name || '').toLowerCase();
        const category = (trans?.category || trans?.['category'] || '').toLowerCase();
        const reference = (trans?.reference || '').toLowerCase();
        return counterparty.includes(searchTerm) || category.includes(searchTerm) || reference.includes(searchTerm);
      });
    }

    // Type filter
    if (transactionFilter.type !== 'all') {
      filtered = filtered.filter(trans => trans?.side === transactionFilter.type);
    }

    // Category filter
    if (transactionFilter.category !== 'all') {
      filtered = filtered.filter(trans => {
        const category = trans?.category || trans?.['category'] || '';
        return category.toLowerCase() === transactionFilter.category.toLowerCase();
      });
    }

    // Apply sorting
    if (transactionFilter.sortBy) {
      filtered.sort((a, b) => {
        let compareValue = 0;
        
        switch (transactionFilter.sortBy) {
          case 'date':
            const dateA = new Date(a?.['settled at'] || a?.settled_at || a?.['emitted at'] || a?.emitted_at || 0);
            const dateB = new Date(b?.['settled at'] || b?.settled_at || b?.['emitted at'] || b?.emitted_at || 0);
            compareValue = dateA.getTime() - dateB.getTime();
            break;
          case 'amount':
            const amountA = parseFloat(a?.amount || a?.amount_parsed || '0');
            const amountB = parseFloat(b?.amount || b?.amount_parsed || '0');
            compareValue = amountA - amountB;
            break;
          case 'counterparty':
            const nameA = (a?.['counterparty name'] || a?.counterparty_name || '').toLowerCase();
            const nameB = (b?.['counterparty name'] || b?.counterparty_name || '').toLowerCase();
            compareValue = nameA.localeCompare(nameB);
            break;
        }
        
        return transactionFilter.sortOrder === 'asc' ? compareValue : -compareValue;
      });
    }

    return filtered;
  }, [transactions, transactionFilter, dateRange]);
  
  // Get paginated subset of filtered transactions
  const paginatedTransactions = React.useMemo(() => {
    const startIndex = transactionPage * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, endIndex);
  }, [filteredAndSortedTransactions, transactionPage, transactionsPerPage]);

  // Get unique categories for filter dropdown
  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(trans => {
      const category = trans?.category || trans?.['category'];
      if (category) {
        categories.add(category);
      }
    });
    return Array.from(categories).sort();
  }, [transactions]);

  // Prepare chart data with cumulative cash flow
  const cashFlowChartData = React.useMemo(() => {
    try {
      const allTransactions = (window as any).__allTransactions || transactions;
      
      if (!Array.isArray(allTransactions) || allTransactions.length === 0) {
        return [];
      }
      
      console.log(`📊 Preparing chart for period: ${formatParisDate(dateRange.start, 'yyyy-MM-dd')} to ${formatParisDate(dateRange.end, 'yyyy-MM-dd')}`);
      
      // Filter by date range and sort
      const filteredTransactions = allTransactions
        .filter(trans => {
          if (!trans || typeof trans !== 'object') return false;
          const dateStr = trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at;
          if (!dateStr) return false;
          
          const transDate = safeParseDate(dateStr);
          if (!transDate) return false;
          
          // Set end date to end of day for inclusive comparison
          const endOfDay = new Date(dateRange.end);
          endOfDay.setHours(23, 59, 59, 999);
          
          const isInRange = transDate >= dateRange.start && transDate <= endOfDay;
          return isInRange;
        })
        .sort((a, b) => {
          const dateA = safeParseDate(a['settled at'] || a.settled_at || a['emitted at'] || a.emitted_at);
          const dateB = safeParseDate(b['settled at'] || b.settled_at || b['emitted at'] || b.emitted_at);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        });
      
      console.log(`📊 Found ${filteredTransactions.length} transactions in range`);
      
      if (filteredTransactions.length === 0) {
        return [];
      }
      
      // Show first and last transaction dates for debugging
      if (filteredTransactions.length > 0) {
        const firstDate = safeParseDate(filteredTransactions[0]['settled at'] || filteredTransactions[0].settled_at);
        const lastDate = safeParseDate(filteredTransactions[filteredTransactions.length - 1]['settled at'] || filteredTransactions[filteredTransactions.length - 1].settled_at);
        console.log(`📊 Transaction range: ${formatParisDate(firstDate, 'yyyy-MM-dd')} to ${formatParisDate(lastDate, 'yyyy-MM-dd')}`);
      }
      
      // Group transactions by day and calculate daily totals
      const dailyData: { [key: string]: { income: number; expenses: number; date: Date } } = {};
      
      filteredTransactions.forEach(trans => {
        const transDate = safeParseDate(trans['settled at'] || trans.settled_at || trans['emitted at'] || trans.emitted_at);
        if (!transDate) return;
        
        const dateKey = formatParisDate(transDate, 'yyyy-MM-dd');
        const amount = parseFloat(trans.amount || trans.amount_parsed) || 0;
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { income: 0, expenses: 0, date: transDate };
        }
        
        if (trans.side === 'credit') {
          dailyData[dateKey].income += amount;
        } else if (trans.side === 'debit') {
          dailyData[dateKey].expenses += amount;
        }
      });
      
      // Convert to array and sort by date
      const sortedDays = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, data]) => data);
      
      console.log(`📊 Grouped into ${sortedDays.length} days`);
      
      // Calculate cumulative balance
      let cumulativeBalance = 0;
      const chartData = sortedDays.map(day => {
        const netFlow = day.income - day.expenses;
        cumulativeBalance += netFlow;
        
        // Format date based on period length
        const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
        let dateFormat = 'dd MMM';
        if (daysDiff <= 7) {
          dateFormat = 'EEE dd'; // Show day of week for week view
        } else if (daysDiff > 90) {
          dateFormat = 'MMM yy'; // Show month/year for long periods
        }
        
        return {
          date: formatParisDate(day.date, dateFormat),
          fullDate: formatParisDate(day.date, 'dd/MM/yyyy'),
          revenus: day.income,
          depenses: day.expenses,
          netFlow: netFlow,
          balance: cumulativeBalance,
          formattedBalance: formatCurrency(cumulativeBalance),
          formattedRevenus: formatCurrency(day.income),
          formattedDepenses: formatCurrency(day.expenses),
          formattedNetFlow: formatCurrency(netFlow)
        };
      });
      
      // If too many data points, aggregate intelligently
      if (chartData.length > 30) {
        console.log(`📊 Aggregating ${chartData.length} days into fewer points`);
        
        // Determine aggregation period
        const totalDays = chartData.length;
        const targetPoints = 25; // Target number of points
        const daysPerPoint = Math.ceil(totalDays / targetPoints);
        
        const aggregatedData: any[] = [];
        
        for (let i = 0; i < chartData.length; i += daysPerPoint) {
          const chunk = chartData.slice(i, i + daysPerPoint);
          if (chunk.length === 0) continue;
          
          const firstDay = chunk[0];
          const lastDay = chunk[chunk.length - 1];
          
          const aggregated = {
            date: chunk.length > 1 ? `${firstDay.date}-${lastDay.date.split(' ')[0]}` : firstDay.date,
            fullDate: chunk.length > 1 ? `${firstDay.fullDate} - ${lastDay.fullDate}` : firstDay.fullDate,
            revenus: chunk.reduce((sum, d) => sum + d.revenus, 0),
            depenses: chunk.reduce((sum, d) => sum + d.depenses, 0),
            netFlow: chunk.reduce((sum, d) => sum + d.netFlow, 0),
            balance: lastDay.balance, // Use ending balance
            formattedBalance: lastDay.formattedBalance,
            formattedRevenus: formatCurrency(chunk.reduce((sum, d) => sum + d.revenus, 0)),
            formattedDepenses: formatCurrency(chunk.reduce((sum, d) => sum + d.depenses, 0)),
            formattedNetFlow: formatCurrency(chunk.reduce((sum, d) => sum + d.netFlow, 0))
          };
          
          aggregatedData.push(aggregated);
        }
        
        return aggregatedData;
      }
      
      return chartData;
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return [];
    }
  }, [transactions, dateRange]);

  const categoryColors = [
    '#3f51b5',
    '#f50057',
    '#00bcd4',
    '#4caf50',
    '#ff9800',
    '#9c27b0',
  ];

  const expenseByCategoryData = React.useMemo(() => {
    try {
      // Always calculate from filtered transactions to respect date range
      const allTransactions = (window as any).__allTransactions || transactions;
      
      if (!Array.isArray(allTransactions) || allTransactions.length === 0) {
        return [];
      }
      
      // Filter by date range first
      const filteredByDate = allTransactions.filter(trans => {
        const dateStr = trans?.['settled at'] || trans?.settled_at || trans?.['emitted at'] || trans?.emitted_at;
        if (!dateStr) return false;
        
        const transDate = safeParseDate(dateStr);
        if (!transDate) return false;
        
        // Set end date to end of day for inclusive comparison
        const endOfDay = new Date(dateRange.end);
        endOfDay.setHours(23, 59, 59, 999);
        
        return transDate >= dateRange.start && transDate <= endOfDay;
      });
      
      const categoryTotals: { [key: string]: number } = {};
      
      filteredByDate.forEach(trans => {
        if (trans?.side === 'debit') { // Only expenses
          const category = trans.category || trans['category'] || 'Autres';
          const amount = parseFloat(trans.amount || trans.amount_parsed) || 0;
          
          if (amount > 0) {
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          }
        }
      });
      
      console.log(`📊 Pie chart: Found ${Object.keys(categoryTotals).length} categories for period ${getCurrentPresetLabel()}`);
      
      return Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          name: category.length > 30 ? category.substring(0, 30) + '...' : category,
          value: amount,
          percentage: 0 // Will be calculated after
        }))
        .sort((a, b) => b.value - a.value) // Sort by amount descending
        .slice(0, 8) // Top 8 categories
        .map(item => {
          // Calculate percentage
          const total = categoryTotals ? Object.values(categoryTotals).reduce((sum, val) => sum + val, 0) : 0;
          return {
            ...item,
            percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
          };
        });
        
    } catch (error) {
      console.error('Error preparing category data:', error);
      return [];
    }
  }, [transactions, dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Tableau de Bord
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bonjour {user?.full_name || user?.email} • {activeCompany?.name || 'Aucune société'}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {/* Date Filter */}
          <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateRange color="action" fontSize="small" />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={dateRange.preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                displayEmpty
                sx={{ 
                  '& .MuiSelect-select': { 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1 
                  }
                }}
              >
                {datePresets.map((preset) => (
                  <MenuItem key={preset.key} value={preset.key}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {preset.icon}
                      {preset.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {formatParisDate(dateRange.start, 'dd/MM/yy')} - {formatParisDate(dateRange.end, 'dd/MM/yy')}
            </Typography>
          </Paper>
          
          <Tooltip title="Rafraîchir les données">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter le rapport">
            <IconButton>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {/* Key Metrics Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Revenus ({getCurrentPresetLabel()})
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(calculatedKPIs.total_income || 0)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {calculatedKPIs.income_change !== undefined && calculatedKPIs.income_change !== 0 ? (
                      <>
                        {calculatedKPIs.income_change > 0 ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                        <Typography 
                          variant="body2" 
                          color={calculatedKPIs.income_change > 0 ? "success.main" : "error.main"} 
                          sx={{ ml: 0.5 }}
                        >
                          {calculatedKPIs.income_change > 0 ? '+' : ''}{calculatedKPIs.income_change.toFixed(1)}%
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Pas de période précédente
                      </Typography>
                    )}
                  </Box>
                </Box>
                <AccountBalance color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Dépenses ({getCurrentPresetLabel()})
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(Math.abs(calculatedKPIs.total_expenses || 0))}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {calculatedKPIs.expenses_change !== undefined && calculatedKPIs.expenses_change !== 0 ? (
                      <>
                        {calculatedKPIs.expenses_change > 0 ? (
                          <TrendingUp color="error" fontSize="small" />
                        ) : (
                          <TrendingDown color="success" fontSize="small" />
                        )}
                        <Typography 
                          variant="body2" 
                          color={calculatedKPIs.expenses_change > 0 ? "error.main" : "success.main"} 
                          sx={{ ml: 0.5 }}
                        >
                          {calculatedKPIs.expenses_change > 0 ? '+' : ''}{calculatedKPIs.expenses_change.toFixed(1)}%
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Pas de période précédente
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Receipt color="error" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Cash Flow Net
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(calculatedKPIs.net_cash_flow || 0)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Burn rate: {formatCurrency(calculatedKPIs.burn_rate || 0)}/mois
                    </Typography>
                  </Box>
                </Box>
                <Euro color="action" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Anomalies
                  </Typography>
                  <Typography variant="h5" component="div">
                    {anomalies?.length || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {anomalies?.length > 0 ? (
                      <Chip
                        label="À vérifier"
                        color="warning"
                        size="small"
                        icon={<Warning />}
                      />
                    ) : (
                      <Chip label="Tout est OK" color="success" size="small" />
                    )}
                  </Box>
                </Box>
                <Assessment color="warning" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Vue d'ensemble" />
          <Tab label="Transactions" />
          <Tab label="Analyse fiscale" />
          <Tab label="Prédictions" />
        </Tabs>
      </Paper>
      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box display="flex" flexWrap="wrap" gap={3}>
          {/* Cash Flow Chart */}
          <Box flex="2" minWidth="500px">
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Évolution du Cash Flow ({getCurrentPresetLabel()})
              </Typography>
              {cashFlowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart 
                    data={cashFlowChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f44336" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f44336" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3f51b5" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                        return `${value}€`;
                      }}
                    />
                    <ChartTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box p={1.5}>
                              <Typography variant="body2" fontWeight="bold" gutterBottom>
                                {data.fullDate || label}
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                Revenus: {data.formattedRevenus}
                              </Typography>
                              <Typography variant="body2" color="error.main">
                                Dépenses: {data.formattedDepenses}
                              </Typography>
                              <Typography variant="body2" color={data.netFlow >= 0 ? "primary.main" : "warning.main"}>
                                Net: {data.formattedNetFlow}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                Balance: {data.formattedBalance}
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenus"
                      stackId="1"
                      stroke="#4caf50"
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="depenses"
                      stackId="2"
                      stroke="#f44336"
                      fill="url(#colorExpense)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#3f51b5"
                      fill="url(#colorBalance)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={350}>
                  <Typography variant="body1" color="text.secondary">
                    Aucune donnée disponible pour cette période
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* Expense by Category Pie Chart */}
          <Box flex="1" minWidth="350px">
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Dépenses par Catégorie ({getCurrentPresetLabel()})
              </Typography>
              {expenseByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={expenseByCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseByCategoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={categoryColors[index % categoryColors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box sx={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              p: 1.5
                            }}>
                              <Typography variant="body2" fontWeight="bold">
                                {data.name}
                              </Typography>
                              <Typography variant="body2">
                                Montant: {formatCurrency(data.value)}
                              </Typography>
                              <Typography variant="body2">
                                Part: {data.percentage}%
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={350}>
                  <Typography variant="body1" color="text.secondary">
                    Aucune dépense pour cette période
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {/* Enhanced Transaction List with Controls */}
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Transactions ({filteredAndSortedTransactions.length})
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                size="small"
              >
                Exporter
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                size="small"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Actualiser
              </Button>

            </Box>
          </Box>

          {/* Filters */}
          <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
            <Box flex="2" minWidth="300px">
              <TextField
                fullWidth
                size="small"
                label="Rechercher"
                placeholder="Nom, catégorie, référence..."
                value={transactionFilter.search}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setTransactionFilter(prev => ({ ...prev, search: newValue }));
                  setTransactionPage(0); // Reset to first page
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>
            <Box flex="1" minWidth="120px">
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={transactionFilter.type}
                  label="Type"
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setTransactionFilter(prev => ({ ...prev, type: newValue }));
                    setTransactionPage(0); // Reset to first page
                  }}
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="credit">Revenus</MenuItem>
                  <MenuItem value="debit">Dépenses</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box flex="1" minWidth="200px">
              <FormControl fullWidth size="small">
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={transactionFilter.category}
                  label="Catégorie"
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setTransactionFilter(prev => ({ ...prev, category: newValue }));
                    setTransactionPage(0); // Reset to first page
                  }}
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  {availableCategories.slice(0, 10).map(category => (
                    <MenuItem key={category} value={category}>
                      {category.length > 25 ? category.substring(0, 25) + '...' : category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box flex="1" minWidth="200px">
              <ButtonGroup size="small" variant="outlined">
                <Button
                  startIcon={<Sort />}
                  onClick={() => setTransactionFilter(prev => ({ 
                    ...prev, 
                    sortBy: prev.sortBy === 'date' ? 'amount' : prev.sortBy === 'amount' ? 'counterparty' : 'date'
                  }))}
                >
                  Trier: {transactionFilter.sortBy === 'date' ? 'Date' : transactionFilter.sortBy === 'amount' ? 'Montant' : 'Nom'}
                </Button>
                <Button
                  onClick={() => setTransactionFilter(prev => ({ 
                    ...prev, 
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                  }))}
                >
                  {transactionFilter.sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                </Button>
              </ButtonGroup>
            </Box>
          </Box>

          {/* Transaction Table */}
          {paginatedTransactions.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={transactionFilter.sortBy === 'date'}
                      direction={transactionFilter.sortOrder as 'asc' | 'desc'}
                      onClick={() => setTransactionFilter(prev => ({ 
                        ...prev, 
                        sortBy: 'date',
                        sortOrder: prev.sortBy === 'date' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                      }))}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={transactionFilter.sortBy === 'counterparty'}
                      direction={transactionFilter.sortOrder as 'asc' | 'desc'}
                      onClick={() => setTransactionFilter(prev => ({ 
                        ...prev, 
                        sortBy: 'counterparty',
                        sortOrder: prev.sortBy === 'counterparty' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                      }))}
                    >
                      Contrepartie
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={transactionFilter.sortBy === 'amount'}
                      direction={transactionFilter.sortOrder as 'asc' | 'desc'}
                      onClick={() => setTransactionFilter(prev => ({ 
                        ...prev, 
                        sortBy: 'amount',
                        sortOrder: prev.sortBy === 'amount' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                      }))}
                    >
                      Montant
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">TVA</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions
                  .map((trans, index) => (
                    <TableRow key={trans?.['slug transaction'] || index} hover>
                      <TableCell>
                        {formatParisDateTime(trans?.['settled at'] || trans?.settled_at, 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {trans?.['counterparty name'] || trans?.counterparty_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {trans?.category || trans?.['category'] || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={trans?.side === 'credit' ? 'Revenus' : 'Dépenses'} 
                          color={trans?.side === 'credit' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={trans?.side === 'credit' ? 'success.main' : 'error.main'}
                          fontWeight="medium"
                        >
                          {trans?.side === 'credit' ? '+' : '-'}
                          {formatCurrency(Math.abs(parseFloat(trans?.amount || trans?.amount_parsed) || 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {trans?.['vat amount'] || trans?.vat_amount_parsed 
                            ? formatCurrency(parseFloat(trans?.['vat amount'] || trans?.vat_amount_parsed) || 0)
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={trans?.status || 'N/A'} 
                          color={trans?.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                {loadingMoreTransactions ? 'Chargement des transactions...' : 'Aucune transaction trouvée'}
              </Typography>
            </Box>
          )}

          {/* Pagination and Results Info */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Page {transactionPage + 1} • Affichage de {Math.min(transactionPage * transactionsPerPage + 1, filteredAndSortedTransactions.length)}-{Math.min((transactionPage + 1) * transactionsPerPage, filteredAndSortedTransactions.length)} sur {filteredAndSortedTransactions.length} transactions filtrées ({totalTransactions} au total)
              </Typography>
              <FormControl size="small">
                <Select
                  value={transactionsPerPage}
                  onChange={(e) => {
                    const newPerPage = Number(e.target.value);
                    setTransactionsPerPage(newPerPage);
                    setTransactionPage(0); // Reset to first page
                  }}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                par page
              </Typography>
            </Box>
            
            <Pagination
              count={Math.ceil(filteredAndSortedTransactions.length / transactionsPerPage)}
              page={transactionPage + 1}
              onChange={(_, page) => {
                if (!loadingMoreTransactions) {
                  setTransactionPage(page - 1);
                }
              }}
              color="primary"
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
              disabled={loadingMoreTransactions}
            />
          </Box>
          
          {/* Loading indicator for pagination */}
          {loadingMoreTransactions && (
            <Box display="flex" justifyContent="center" mt={2}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 1 }} color="text.secondary">
                Chargement des transactions...
              </Typography>
            </Box>
          )}

          {/* Summary Stats */}
          <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
            <Box flex="1" minWidth="200px">
              <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={2}>
                <Typography variant="h6" color="info.contrastText">
                  Total ({totalTransactions} dans Qonto)
                </Typography>
                <Typography variant="h4" color="info.contrastText">
                  {filteredAndSortedTransactions.length}
                </Typography>
                <Typography variant="caption" color="info.contrastText">
                  affichées
                </Typography>
              </Box>
            </Box>
            <Box flex="1" minWidth="200px">
              <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                <Typography variant="h6" color="success.contrastText">
                  Revenus
                </Typography>
                <Typography variant="h4" color="success.contrastText">
                  {formatCurrency(
                    filteredAndSortedTransactions
                      .filter(t => t?.side === 'credit')
                      .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0)
                  )}
                </Typography>
              </Box>
            </Box>
            <Box flex="1" minWidth="200px">
              <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
                <Typography variant="h6" color="error.contrastText">
                  Dépenses
                </Typography>
                <Typography variant="h4" color="error.contrastText">
                  {formatCurrency(
                    filteredAndSortedTransactions
                      .filter(t => t?.side === 'debit')
                      .reduce((sum, t) => sum + (parseFloat(t?.amount || t?.amount_parsed) || 0), 0)
                  )}
                </Typography>
              </Box>
            </Box>
            <Box flex="1" minWidth="200px">
              <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                <Typography variant="h6" color="warning.contrastText">
                  Moyenne
                </Typography>
                <Typography variant="h4" color="warning.contrastText">
                  {filteredAndSortedTransactions.length > 0 
                    ? formatCurrency(
                        filteredAndSortedTransactions
                          .reduce((sum, t) => sum + Math.abs(parseFloat(t?.amount || t?.amount_parsed) || 0), 0) / 
                        filteredAndSortedTransactions.length
                      )
                    : '0,00 €'
                  }
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {/* Analyse Fiscale */}
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box flex="1" minWidth="400px">
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Rapport Fiscal - {getCurrentPresetLabel()}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography>Total des revenus</Typography>
                  <Typography fontWeight="medium" color="success.main">
                    {formatCurrency(calculatedKPIs.total_income || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography>Total des dépenses</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(calculatedTaxReport.total_expenses || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography>Charges déductibles</Typography>
                  <Typography fontWeight="medium" color="success.main">
                    {formatCurrency(calculatedTaxReport.total_deductible || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography>Charges non déductibles</Typography>
                  <Typography fontWeight="medium" color="error.main">
                    {formatCurrency(calculatedTaxReport.non_deductible || 0)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography fontWeight="bold">Résultat imposable</Typography>
                  <Typography fontWeight="bold" color={calculatedTaxReport.taxable_income > 0 ? "success.main" : "error.main"}>
                    {formatCurrency(calculatedTaxReport.taxable_income || 0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          <Box flex="1" minWidth="400px">
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                TVA & Estimations Fiscales
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Gestion TVA
                </Typography>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2">TVA collectée</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(calculatedTaxReport.vat_collected || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2">TVA déductible</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(calculatedTaxReport.vat_deductible || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1} sx={{ 
                  backgroundColor: calculatedTaxReport.vat_balance > 0 ? 'error.light' : 'success.light',
                  px: 1,
                  borderRadius: 1
                }}>
                  <Typography variant="body2" fontWeight="bold">
                    {calculatedTaxReport.vat_balance > 0 ? 'TVA à payer' : 'Crédit de TVA'}
                  </Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(Math.abs(calculatedTaxReport.vat_balance || 0))}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Estimations d'Impôts
                </Typography>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2">Impôt sur les sociétés (15%)</Typography>
                  <Typography fontWeight="medium" color="warning.main">
                    {formatCurrency(calculatedTaxReport.estimated_corporate_tax || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2">Estimation IR (30%)</Typography>
                  <Typography fontWeight="medium" color="warning.main">
                    {formatCurrency(calculatedTaxReport.estimated_income_tax || 0)}
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Ces estimations sont simplifiées. Consultez votre expert-comptable pour une analyse précise.
                  </Typography>
                </Alert>
              </Box>
            </Paper>
          </Box>
        </Box>
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {/* Predictions */}
        <Box>
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Prédictions (3 prochains mois)
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={3} sx={{ mt: 1 }}>
                <Box flex="2" minWidth="300px">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Dépenses totales prévues
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(predictions?.total_predicted_expenses || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box flex="2" minWidth="300px">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Moyenne mensuelle
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(predictions?.monthly_average || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box flex="2" minWidth="300px">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Tendance
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <TrendingUp color="warning" />
                      <Typography variant="h5" sx={{ ml: 1 }}>
                        +5.2%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {predictions?.recommendations && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Recommandations
                  </Typography>
                  {predictions.recommendations.map((rec: string, index: number) => (
                    <Alert key={index} severity="info" sx={{ mt: 1 }}>
                      {rec}
                    </Alert>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </TabPanel>
      {/* Anomalies Alert */}
      {anomalies?.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {anomalies.length} anomalie(s) détectée(s)
          </Typography>
          {anomalies.slice(0, 3).map((anomaly, index) => (
            <Box key={index} sx={{ mt: 1 }}>
              <Typography variant="body2">
                • {anomaly?.transaction?.['counterparty name'] || anomaly?.transaction?.counterparty_name || 'N/A'} -{' '}
                {formatCurrency(anomaly?.transaction?.amount || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {anomaly?.reasons?.join(', ') || 'Anomalie détectée'}
              </Typography>
            </Box>
          ))}
        </Alert>
      )}
    </Container>
  );
};

export default Dashboard;