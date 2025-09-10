import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Calculate,
  Info,
  Warning,
  Lightbulb,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';

interface TaxRates2025 {
  // Impôt sur le revenu 2025 (revenus 2024)
  incomeTax: Array<{ limit: number; rate: number }>;
  // Impôt sur les sociétés
  corporateTax: {
    reduced: { limit: number; rate: number };
    normal: number;
  };
  // Charges sociales SASU
  socialCharges: {
    salary: {
      employer: number; // ~80-85% du net
      employee: number; // Inclus dans le brut
    };
    dividends: {
      social: number; // 17.2% prélèvements sociaux
      pfu: number; // 12.8% impôt (flat tax)
    };
  };
  // TVA
  vat: {
    standard: number;
    intermediate: number;
    reduced: number;
  };
}

const TAX_RATES_2025: TaxRates2025 = {
  incomeTax: [
    { limit: 11497, rate: 0 },
    { limit: 29315, rate: 0.11 },
    { limit: 83823, rate: 0.30 },
    { limit: 180294, rate: 0.41 },
    { limit: Infinity, rate: 0.45 },
  ],
  corporateTax: {
    reduced: { limit: 42500, rate: 0.15 },
    normal: 0.25,
  },
  socialCharges: {
    salary: {
      employer: 0.82, // 82% du net (moyenne)
      employee: 0.22, // Déjà inclus dans le calcul brut/net
    },
    dividends: {
      social: 0.172,
      pfu: 0.128,
    },
  },
  vat: {
    standard: 0.20,
    intermediate: 0.10,
    reduced: 0.055,
  },
};

interface CalculationInputs {
  // Chiffre d'affaires
  revenueHT: number;
  vatRate: number;
  
  // Charges
  operatingExpenses: number;
  deductibleExpenses: number;
  nonDeductibleExpenses: number;
  
  // Rémunération
  grossSalary: number;
  dividends: number;
  
  // Autres paramètres
  workingDays: number;
  numberOfParts: number; // Quotient familial
  previousLosses: number; // Déficits reportables
  
  // Options
  optForIR: boolean; // Option IR au lieu d'IS
  includeSocialSecurity: boolean;
}

interface CalculationResults {
  // CA et TVA
  revenueTTC: number;
  vatCollected: number;
  vatDeductible: number;
  vatBalance: number;
  
  // Résultat fiscal
  grossProfit: number;
  taxableProfit: number;
  corporateTax: number;
  netProfit: number;
  
  // Rémunération salaire
  salaryEmployerCharges: number;
  salaryTotalCost: number;
  salaryNetBeforeTax: number;
  salaryIncomeTax: number;
  salaryNetAfterTax: number;
  
  // Dividendes
  dividendsGross: number;
  dividendsSocialCharges: number;
  dividendsIncomeTax: number;
  dividendsNetAfterTax: number;
  
  // Total
  totalCost: number;
  totalNetIncome: number;
  effectiveTaxRate: number;
  
  // Métriques
  dailyRate: number;
  monthlyEquivalent: number;
  quarterlyValidation: boolean;
  socialProtection: boolean;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TaxCalculation: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [inputs, setInputs] = useState<CalculationInputs>({
    revenueHT: 150000,
    vatRate: 0.20,
    operatingExpenses: 30000,
    deductibleExpenses: 20000,
    nonDeductibleExpenses: 5000,
    grossSalary: 45000,
    dividends: 30000,
    workingDays: 220,
    numberOfParts: 1,
    previousLosses: 0,
    optForIR: false,
    includeSocialSecurity: true,
  });
  
  const [results, setResults] = useState<CalculationResults | null>(null);
  
  // Fonction de calcul principal
  const calculateTaxes = useCallback(() => {
    const r: CalculationResults = {
      revenueTTC: 0,
      vatCollected: 0,
      vatDeductible: 0,
      vatBalance: 0,
      grossProfit: 0,
      taxableProfit: 0,
      corporateTax: 0,
      netProfit: 0,
      salaryEmployerCharges: 0,
      salaryTotalCost: 0,
      salaryNetBeforeTax: 0,
      salaryIncomeTax: 0,
      salaryNetAfterTax: 0,
      dividendsGross: 0,
      dividendsSocialCharges: 0,
      dividendsIncomeTax: 0,
      dividendsNetAfterTax: 0,
      totalCost: 0,
      totalNetIncome: 0,
      effectiveTaxRate: 0,
      dailyRate: 0,
      monthlyEquivalent: 0,
      quarterlyValidation: false,
      socialProtection: false,
    };
    
    // 1. TVA
    r.vatCollected = inputs.revenueHT * inputs.vatRate;
    r.revenueTTC = inputs.revenueHT + r.vatCollected;
    r.vatDeductible = inputs.operatingExpenses * 0.20 * 0.8; // Estimation 80% récupérable
    r.vatBalance = r.vatCollected - r.vatDeductible;
    
    // 2. Calcul du salaire
    const netSalary = inputs.grossSalary / 1.22; // Conversion brut -> net
    r.salaryNetBeforeTax = netSalary;
    r.salaryEmployerCharges = netSalary * TAX_RATES_2025.socialCharges.salary.employer;
    r.salaryTotalCost = inputs.grossSalary + r.salaryEmployerCharges;
    
    // 3. Résultat fiscal
    r.grossProfit = inputs.revenueHT - inputs.operatingExpenses - inputs.deductibleExpenses - r.salaryTotalCost;
    r.taxableProfit = Math.max(0, r.grossProfit - inputs.previousLosses);
    
    // 4. Impôt sur les sociétés
    if (!inputs.optForIR) {
      const reducedLimit = TAX_RATES_2025.corporateTax.reduced.limit;
      const reducedRate = TAX_RATES_2025.corporateTax.reduced.rate;
      const normalRate = TAX_RATES_2025.corporateTax.normal;
      
      if (r.taxableProfit <= reducedLimit) {
        r.corporateTax = r.taxableProfit * reducedRate;
      } else {
        r.corporateTax = reducedLimit * reducedRate + (r.taxableProfit - reducedLimit) * normalRate;
      }
    }
    
    r.netProfit = r.taxableProfit - r.corporateTax;
    
    // 5. Dividendes
    r.dividendsGross = Math.min(inputs.dividends, r.netProfit);
    r.dividendsSocialCharges = r.dividendsGross * TAX_RATES_2025.socialCharges.dividends.social;
    r.dividendsIncomeTax = r.dividendsGross * TAX_RATES_2025.socialCharges.dividends.pfu;
    r.dividendsNetAfterTax = r.dividendsGross - r.dividendsSocialCharges - r.dividendsIncomeTax;
    
    // 6. Impôt sur le revenu (salaire)
    const taxableIncome = r.salaryNetBeforeTax * 0.9; // Abattement 10%
    let incomeTax = 0;
    let previousLimit = 0;
    
    for (const bracket of TAX_RATES_2025.incomeTax) {
      const taxableInBracket = Math.min(Math.max(0, taxableIncome - previousLimit), bracket.limit - previousLimit);
      incomeTax += taxableInBracket * bracket.rate;
      previousLimit = bracket.limit;
      if (taxableIncome <= bracket.limit) break;
    }
    
    r.salaryIncomeTax = incomeTax / inputs.numberOfParts;
    r.salaryNetAfterTax = r.salaryNetBeforeTax - r.salaryIncomeTax;
    
    // 7. Totaux
    r.totalCost = r.salaryTotalCost + r.corporateTax + r.vatBalance;
    r.totalNetIncome = r.salaryNetAfterTax + r.dividendsNetAfterTax;
    r.effectiveTaxRate = r.totalCost / inputs.revenueHT;
    
    // 8. Métriques
    r.dailyRate = inputs.revenueHT / inputs.workingDays;
    r.monthlyEquivalent = r.totalNetIncome / 12;
    r.quarterlyValidation = inputs.grossSalary >= 7128; // 4 trimestres retraite
    r.socialProtection = inputs.grossSalary >= 24116; // Seuil indemnités journalières
    
    setResults(r);
  }, [inputs]);
  
  useEffect(() => {
    calculateTaxes();
  }, [inputs, calculateTaxes]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Generate intelligent recommendations based on current inputs and results
  const generateRecommendations = () => {
    const recommendations = [];
    
    if (results) {
      // Salary optimization
      const optimalSalary = Math.min(45000, inputs.revenueHT * 0.3);
      const salarySavings = Math.abs(inputs.grossSalary - optimalSalary) * 0.42;
      if (Math.abs(inputs.grossSalary - optimalSalary) > 5000) {
        recommendations.push({
          type: 'success',
          title: 'Optimisation du salaire',
          message: `Ajuster votre salaire à ${formatCurrency(optimalSalary)} pourrait économiser ${formatCurrency(salarySavings)} en charges sociales`
        });
      }
      
      // Dividend timing
      if (inputs.dividends > results.netProfit) {
        recommendations.push({
          type: 'error',
          title: 'Dividendes excessifs',
          message: `Les dividendes (${formatCurrency(inputs.dividends)}) dépassent le bénéfice net (${formatCurrency(results.netProfit)})`
        });
      }
      
      // Expense optimization
      const expenseRatio = (inputs.operatingExpenses + inputs.deductibleExpenses) / inputs.revenueHT;
      if (expenseRatio < 0.3) {
        recommendations.push({
          type: 'info',
          title: 'Charges déductibles',
          message: 'Vos charges représentent moins de 30% du CA. Vérifiez que toutes vos dépenses professionnelles sont bien comptabilisées.'
        });
      }
      
      // Tax rate warning
      if (results.effectiveTaxRate > 0.45) {
        recommendations.push({
          type: 'warning',
          title: 'Taux d\'imposition élevé',
          message: `Votre taux effectif (${(results.effectiveTaxRate * 100).toFixed(1)}%) est élevé. Envisagez des dispositifs de défiscalisation.`
        });
      }
    }
    
    return recommendations;
  };
  
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // Données pour le graphique en entonnoir
  const funnelData = results ? [
    { name: 'CA HT', value: inputs.revenueHT, fill: '#4caf50' },
    { name: 'Après charges', value: inputs.revenueHT - inputs.operatingExpenses - inputs.deductibleExpenses, fill: '#2196f3' },
    { name: 'Après salaires', value: results.grossProfit, fill: '#ff9800' },
    { name: 'Après IS', value: results.netProfit, fill: '#f44336' },
    { name: 'Net dans la poche', value: results.totalNetIncome, fill: '#9c27b0' },
  ] : [];
  
  // Données pour la répartition
  const distributionData = results ? [
    { name: 'Charges sociales', value: results.salaryEmployerCharges },
    { name: 'IS', value: results.corporateTax },
    { name: 'TVA nette', value: results.vatBalance },
    { name: 'IR salaire', value: results.salaryIncomeTax },
    { name: 'Prélèvements dividendes', value: results.dividendsSocialCharges + results.dividendsIncomeTax },
    { name: 'Net conservé', value: results.totalNetIncome },
  ] : [];
  
  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#74B9FF'];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <Calculate sx={{ mr: 1, verticalAlign: 'middle' }} />
        Calcul Fiscal SASU 2025
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Simulateur basé sur les taux fiscaux 2025 : IS (15%/25%), IR (barème progressif), charges sociales SASU (~82% du net), PFU (30% sur dividendes)
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Panneau de saisie */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 30%' }, minWidth: 0 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Paramètres de calcul
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Chiffre d'affaires
              </Typography>
              
              <TextField
                fullWidth
                label="CA HT annuel"
                type="number"
                value={inputs.revenueHT}
                onChange={(e) => setInputs({...inputs, revenueHT: Number(e.target.value)})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
                Charges d'exploitation
              </Typography>
              
              <TextField
                fullWidth
                label="Charges déductibles"
                type="number"
                value={inputs.deductibleExpenses}
                onChange={(e) => setInputs({...inputs, deductibleExpenses: Number(e.target.value)})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Autres charges"
                type="number"
                value={inputs.operatingExpenses}
                onChange={(e) => setInputs({...inputs, operatingExpenses: Number(e.target.value)})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
                Rémunération président
              </Typography>
              
              <TextField
                fullWidth
                label="Salaire brut annuel"
                type="number"
                value={inputs.grossSalary}
                onChange={(e) => setInputs({...inputs, grossSalary: Number(e.target.value)})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                helperText={inputs.grossSalary < 7128 ? "⚠️ Moins de 4 trimestres retraite" : "✅ 4 trimestres validés"}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Dividendes souhaités"
                type="number"
                value={inputs.dividends}
                onChange={(e) => setInputs({...inputs, dividends: Number(e.target.value)})}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
                Paramètres avancés
              </Typography>
              
              <TextField
                fullWidth
                label="Jours travaillés/an"
                type="number"
                value={inputs.workingDays}
                onChange={(e) => setInputs({...inputs, workingDays: Number(e.target.value)})}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Parts fiscales (quotient familial)"
                type="number"
                value={inputs.numberOfParts}
                onChange={(e) => setInputs({...inputs, numberOfParts: Number(e.target.value)})}
                sx={{ mb: 2 }}
              />
            </Box>
          </Paper>
        </Box>
        
        {/* Résultats et visualisations */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 65%' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Vue d'ensemble" />
              <Tab label="Détail des calculs" />
              <Tab label="Optimisation" />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              {results && (
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {/* KPIs principaux */}
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: { xs: '1 1 45%', md: '1 1 22%' } }}>
                        <Card>
                          <CardContent>
                            <Typography color="textSecondary" gutterBottom variant="body2">
                              CA HT
                            </Typography>
                            <Typography variant="h5">
                              {formatCurrency(inputs.revenueHT)}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              TJM: {formatCurrency(results.dailyRate)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      
                      <Box sx={{ flex: { xs: '1 1 45%', md: '1 1 22%' } }}>
                        <Card>
                          <CardContent>
                            <Typography color="textSecondary" gutterBottom variant="body2">
                              Total charges & impôts
                            </Typography>
                            <Typography variant="h5" color="error.main">
                              {formatCurrency(results.totalCost)}
                            </Typography>
                            <Typography variant="body2">
                              {formatPercent(results.effectiveTaxRate)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      
                      <Box sx={{ flex: { xs: '1 1 45%', md: '1 1 22%' } }}>
                        <Card>
                          <CardContent>
                            <Typography color="textSecondary" gutterBottom variant="body2">
                              Net dans la poche
                            </Typography>
                            <Typography variant="h5" color="success.main">
                              {formatCurrency(results.totalNetIncome)}
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(results.monthlyEquivalent)}/mois
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      
                      <Box sx={{ flex: { xs: '1 1 45%', md: '1 1 22%' } }}>
                        <Card>
                          <CardContent>
                            <Typography color="textSecondary" gutterBottom variant="body2">
                              Protection sociale
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip
                                size="small"
                                label={results.quarterlyValidation ? "4 trim." : "< 4 trim."}
                                color={results.quarterlyValidation ? "success" : "warning"}
                              />
                              <Chip
                                size="small"
                                label={results.socialProtection ? "IJ OK" : "Pas d'IJ"}
                                color={results.socialProtection ? "success" : "error"}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Graphique en entonnoir */}
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                    <Typography variant="h6" gutterBottom>
                      Cascade fiscale
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <ChartTooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  {/* Répartition */}
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                    <Typography variant="h6" gutterBottom>
                      Répartition des prélèvements
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <RechartsPieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.name}: ${formatCurrency(entry.value || 0)}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(value) => formatCurrency(Number(value))} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              {results && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Détail des calculs étape par étape
                  </Typography>
                  
                  <Stepper orientation="vertical" activeStep={-1}>
                    <Step expanded={true}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          1. Chiffre d'affaires et TVA
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="CA HT"
                              secondary={formatCurrency(inputs.revenueHT)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="TVA collectée (20%)"
                              secondary={formatCurrency(results.vatCollected)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="TVA déductible"
                              secondary={formatCurrency(results.vatDeductible)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="TVA à payer"
                              secondary={formatCurrency(results.vatBalance)}
                              secondaryTypographyProps={{ color: 'error' }}
                            />
                          </ListItem>
                        </List>
                      </StepContent>
                    </Step>
                    
                    <Step expanded={true}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          2. Charges et salaires
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Salaire brut président"
                              secondary={formatCurrency(inputs.grossSalary)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Charges patronales (82%)"
                              secondary={formatCurrency(results.salaryEmployerCharges)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Coût total salaire"
                              secondary={formatCurrency(results.salaryTotalCost)}
                              secondaryTypographyProps={{ color: 'error' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Charges déductibles"
                              secondary={formatCurrency(inputs.deductibleExpenses + inputs.operatingExpenses)}
                            />
                          </ListItem>
                        </List>
                      </StepContent>
                    </Step>
                    
                    <Step expanded={true}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          3. Impôt sur les sociétés
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Résultat avant IS"
                              secondary={formatCurrency(results.taxableProfit)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary={`IS (15% < 42.5k€, 25% au-delà)`}
                              secondary={formatCurrency(results.corporateTax)}
                              secondaryTypographyProps={{ color: 'error' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Résultat net après IS"
                              secondary={formatCurrency(results.netProfit)}
                            />
                          </ListItem>
                        </List>
                      </StepContent>
                    </Step>
                    
                    <Step expanded={true}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          4. Imposition personnelle
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Salaire net avant IR"
                              secondary={formatCurrency(results.salaryNetBeforeTax)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="IR sur salaire (barème progressif)"
                              secondary={formatCurrency(results.salaryIncomeTax)}
                              secondaryTypographyProps={{ color: 'error' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Dividendes bruts"
                              secondary={formatCurrency(results.dividendsGross)}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="PFU 30% (17.2% + 12.8%)"
                              secondary={formatCurrency(results.dividendsSocialCharges + results.dividendsIncomeTax)}
                              secondaryTypographyProps={{ color: 'error' }}
                            />
                          </ListItem>
                        </List>
                      </StepContent>
                    </Step>
                    
                    <Step expanded={true}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          5. Résultat final
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Salaire net après tout"
                              secondary={formatCurrency(results.salaryNetAfterTax)}
                              secondaryTypographyProps={{ color: 'success' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Dividendes nets"
                              secondary={formatCurrency(results.dividendsNetAfterTax)}
                              secondaryTypographyProps={{ color: 'success' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="TOTAL NET DANS LA POCHE"
                              secondary={formatCurrency(results.totalNetIncome)}
                              secondaryTypographyProps={{ 
                                color: 'success',
                                variant: 'h6',
                                fontWeight: 'bold'
                              }}
                            />
                          </ListItem>
                        </List>
                      </StepContent>
                    </Step>
                  </Stepper>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Recommandations d'optimisation
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Dynamic recommendations */}
                {generateRecommendations().map((rec, index) => (
                  <Box key={index}>
                    <Alert severity={rec.type as any} icon={<Lightbulb />}>
                      <Typography variant="subtitle2" gutterBottom>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2">
                        {rec.message}
                      </Typography>
                    </Alert>
                  </Box>
                ))}
                
                {/* Static recommendations */}
                <Box>
                  <Alert severity="info" icon={<Info />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Trimestres retraite
                    </Typography>
                    <Typography variant="body2">
                      {inputs.grossSalary >= 7128 
                        ? "✅ Vos 4 trimestres sont validés avec ce salaire"
                        : `⚠️ Il vous manque ${formatCurrency(7128 - inputs.grossSalary)} de salaire brut pour valider 4 trimestres`
                      }
                    </Typography>
                  </Alert>
                </Box>
                
                <Box>
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Points d'attention
                    </Typography>
                    <Typography variant="body2">
                      • Les dividendes ne donnent aucun droit social (pas de retraite, pas de chômage)
                      <br />• Un salaire minimum de 24 116€ brut/an est nécessaire pour les indemnités journalières
                      <br />• La flat tax (30%) est généralement plus avantageuse que le barème progressif
                      <br />• Pensez à provisionner l'IS et la TVA trimestriellement
                    </Typography>
                  </Alert>
                </Box>
                
                {/* Optimal strategy */}
                <Box>
                  <Alert severity="success" icon={<Lightbulb />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Stratégie optimale pour votre situation
                    </Typography>
                    <Typography variant="body2">
                      Pour votre CA de {formatCurrency(inputs.revenueHT)} :
                      <br />• <strong>Salaire optimal :</strong> {formatCurrency(Math.min(45000, inputs.revenueHT * 0.3))} (couverture sociale + déduction)
                      <br />• <strong>Dividendes suggérés :</strong> {formatCurrency(Math.max(0, (results?.netProfit || 0) * 0.7))} (après constitution de réserves)
                      <br />• <strong>Économie potentielle :</strong> {formatCurrency(Math.abs((inputs.grossSalary - Math.min(45000, inputs.revenueHT * 0.3)) * 0.42))}
                    </Typography>
                  </Alert>
                </Box>
              </Box>
            </TabPanel>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default TaxCalculation;