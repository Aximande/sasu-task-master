import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Info, CheckCircle, Warning } from '@mui/icons-material';

interface CalculationStep {
  label: string;
  formula: string;
  values: { [key: string]: number | string };
  result: number;
  explanation?: string;
  warning?: string;
}

interface DetailedCalculationCardProps {
  title: string;
  icon?: React.ReactNode;
  steps: CalculationStep[];
  finalResult: number;
  color?: string;
}

export const DetailedCalculationCard: React.FC<DetailedCalculationCardProps> = ({
  title,
  icon,
  steps,
  finalResult,
  color = '#2196f3'
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  const formatValue = (value: number | string): string => {
    if (typeof value === 'string') return value;
    if (value < 1) return formatPercent(value);
    return formatCurrency(value);
  };

  const evaluateFormula = (formula: string, values: { [key: string]: number | string }): string => {
    let result = formula;
    Object.entries(values).forEach(([key, value]) => {
      const formattedValue = typeof value === 'number' ? formatValue(value) : value;
      result = result.replace(new RegExp(`{${key}}`, 'g'), formattedValue);
    });
    return result;
  };

  return (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && <Box sx={{ mr: 2 }}>{icon}</Box>}
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          <Chip 
            label={formatCurrency(finalResult)} 
            color="primary" 
            sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>
                      {step.label}
                      {step.explanation && (
                        <Tooltip title={step.explanation}>
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <Info fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {evaluateFormula(step.formula, step.values)}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        = {formatCurrency(step.result)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {step.warning && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                          <Typography variant="caption">{step.warning}</Typography>
                        </Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Vérification finale */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Vérification: Somme des étapes = {formatCurrency(
              steps.reduce((sum, step) => sum + step.result, 0)
            )} {steps.reduce((sum, step) => sum + step.result, 0) === finalResult ? 
              <CheckCircle color="success" sx={{ fontSize: 16, ml: 1 }} /> : 
              <Warning color="error" sx={{ fontSize: 16, ml: 1 }} />
            }
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};