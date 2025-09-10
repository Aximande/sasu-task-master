import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
  Stack,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Calculate,
  Info,
  Warning,
  Lightbulb,
  ExpandMore,
  TrendingUp,
  TrendingDown,
  Euro,
  AccountBalance,
  Person,
  Business,
  Receipt,
  ShowChart,
  Help,
  CheckCircle,
  Error,
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
  Sankey,
  Rectangle,
} from 'recharts';
import { 
  calculateCompleteTaxation, 
  TaxInputs, 
  DetailedTaxResults 
} from '../utils/taxCalculator2025';

// Import des composants fiscaux
import { DetailedCalculationCard } from '../components/tax/DetailedCalculationCard';
import { ChargesHelper } from '../components/tax/ChargesHelper';
import { ProgressiveIncomeCalculator } from '../components/tax/ProgressiveIncomeCalculator';
import { WaterfallChart } from '../components/tax/WaterfallChart';
import { calculateDetailedSocialCharges } from '../utils/detailedSocialCharges2025';

// Composant pour afficher la cascade fiscale de manière visuelle
const FiscalWaterfall: React.FC<{ data: DetailedTaxResults }> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  // Construire les étapes de la cascade avec plus de granularité
  const waterfallSteps = [
    {
      label: 'CA HT',
      value: data.comptabilite.caHT,
      type: 'start',
      color: '#4caf50',
      details: 'Chiffre d\'affaires hors taxes'
    },
    {
      label: 'Charges exploitation',
      value: -data.comptabilite.chargesExploitation,
      type: 'decrease',
      color: '#ff9800',
      details: 'Achats, loyers, services externes, fournitures...'
    },
    {
      label: 'Charges déductibles',
      value: -data.comptabilite.chargesDeductibles,
      type: 'decrease',
      color: '#ff9800',
      details: 'Frais de déplacement, formation, assurances...'
    },
    {
      label: '= EBITDA',
      value: data.comptabilite.caHT - data.comptabilite.chargesExploitation - data.comptabilite.chargesDeductibles,
      type: 'subtotal',
      color: '#03a9f4',
      details: 'Résultat avant intérêts, impôts, dépréciation et amortissement'
    },
    {
      label: 'Salaire brut dirigeant',
      value: -data.salaire.brutAnnuel,
      type: 'decrease',
      color: '#f44336',
      details: `Rémunération brute annuelle: ${formatCurrency(data.salaire.brutAnnuel)}`
    },
    {
      label: 'Charges patronales',
      value: -data.salaire.chargesPatronales.total,
      type: 'decrease',
      color: '#e91e63',
      details: `Cotisations patronales: ${formatPercent(data.salaire.chargesPatronales.taux)} du brut`
    },
    {
      label: '= Résultat avant IS',
      value: data.comptabilite.resultatAvantIS,
      type: 'subtotal',
      color: '#2196f3',
      details: 'Base imposable pour l\'impôt sur les sociétés'
    },
    {
      label: 'IS tranche 15%',
      value: -data.impotSocietes.tranche15.impot,
      type: 'decrease',
      color: '#9c27b0',
      details: `15% sur ${formatCurrency(data.impotSocietes.tranche15.base)} (jusqu\'à 42.5k€)`
    },
    {
      label: 'IS tranche 25%',
      value: -data.impotSocietes.tranche25.impot,
      type: 'decrease',
      color: '#7b1fa2',
      details: `25% sur ${formatCurrency(data.impotSocietes.tranche25.base)} (au-delà de 42.5k€)`
    },
    {
      label: '= Résultat net',
      value: data.comptabilite.resultatNet,
      type: 'subtotal',
      color: '#00bcd4',
      details: 'Bénéfice après impôt disponible pour distribution'
    },
    {
      label: 'Dividendes bruts',
      value: -data.dividendes.montantDistribuable,
      type: 'decrease',
      color: '#ff5722',
      details: `Distribution de ${formatCurrency(data.dividendes.montantDistribuable)}`
    },
    {
      label: data.dividendes.pfu ? 'PFU (flat tax 30%)' : 'Prélèvements sociaux',
      value: -(data.dividendes.pfu?.totalPrelevements || data.dividendes.baremeProgressif?.prelevementsSociaux || 0),
      type: 'decrease',
      color: '#ff3d00',
      details: data.dividendes.pfu ? '17.2% sociaux + 12.8% IR' : '17.2% de prélèvements sociaux'
    },
    {
      label: '= Trésorerie finale',
      value: data.synthese.tresorerieFinale,
      type: 'end',
      color: '#8bc34a',
      details: 'Liquidités restant dans la société'
    }
  ];
  
  // Calculer les positions cumulées
  let cumulative = 0;
  const processedSteps = waterfallSteps.map(step => {
    const start = cumulative;
    if (step.type !== 'subtotal') {
      cumulative += step.value;
    } else {
      cumulative = step.value;
    }
    return {
      ...step,
      start,
      end: cumulative,
      displayValue: Math.abs(step.value)
    };
  });
  
  // Construire les calculs détaillés avec formules
  const detailedCalculations = [
    {
      title: "Résultat avant charges sociales",
      color: '#4caf50',
      steps: [
        {
          label: "Chiffre d'affaires HT",
          formula: "CA HT",
          values: { "ca": data.comptabilite.caHT } as { [key: string]: number | string },
          result: data.comptabilite.caHT,
          explanation: "Revenus totaux hors taxes de l'entreprise"
        },
        {
          label: "Charges d'exploitation",
          formula: "- Charges exploitation",
          values: { "charges": data.comptabilite.chargesExploitation } as { [key: string]: number | string },
          result: -data.comptabilite.chargesExploitation,
          explanation: "Achats, fournitures, loyers, services externes..."
        },
        {
          label: "Charges déductibles",
          formula: "- Charges déductibles",
          values: { "deductibles": data.comptabilite.chargesDeductibles } as { [key: string]: number | string },
          result: -data.comptabilite.chargesDeductibles,
          explanation: "Autres charges fiscalement déductibles"
        }
      ],
      finalResult: data.comptabilite.ebitda
    },
    {
      title: "Charges sociales président SASU",
      color: '#f44336',
      steps: [
        {
          label: "Salaire brut",
          formula: "Salaire brut annuel + Primes",
          values: { "salaire": data.salaire.brutAnnuel } as { [key: string]: number | string },
          result: data.salaire.brutAnnuel,
          explanation: "Base de calcul des cotisations sociales"
        },
        {
          label: "Charges patronales",
          formula: "{salaire} × {taux} (maladie: 13% + vieillesse: 10.45% + alloc: 5.45% + retraite: 12.95% + autres)",
          values: { 
            "salaire": data.salaire.brutAnnuel,
            "taux": data.salaire.chargesPatronales.taux
          } as { [key: string]: number | string },
          result: -data.salaire.chargesPatronales.total,
          explanation: "Cotisations employeur (~42% en moyenne)",
          warning: data.salaire.chargesPatronales.taux > 0.45 ? 
            "Taux élevé, vérifiez l'éligibilité aux réductions" : undefined
        },
        {
          label: "Charges salariales",
          formula: "{salaire} × {taux} (vieillesse: 7.3% + retraite: 11.75% + CSG/CRDS: 9.7%)",
          values: {
            "salaire": data.salaire.brutAnnuel,
            "taux": data.salaire.chargesSalariales.taux
          } as { [key: string]: number | string },
          result: -data.salaire.chargesSalariales.total,
          explanation: "Cotisations salarié (~22% en moyenne)"
        }
      ],
      finalResult: -(data.salaire.chargesPatronales.total + data.salaire.chargesSalariales.total)
    },
    {
      title: "Impôt sur les sociétés (IS)",
      color: '#9c27b0',
      steps: [
        {
          label: "Résultat fiscal",
          formula: "EBITDA - Masse salariale",
          values: {
            "ebitda": data.comptabilite.ebitda,
            "masse": data.comptabilite.masseSalariale
          } as { [key: string]: number | string },
          result: data.comptabilite.resultatAvantIS,
          explanation: "Base imposable à l'IS"
        },
        {
          label: "IS tranche 15%",
          formula: "MIN({resultat}, 42500) × 15%",
          values: {
            "resultat": data.comptabilite.resultatAvantIS,
            "base": data.impotSocietes.tranche15.base
          } as { [key: string]: number | string },
          result: -data.impotSocietes.tranche15.impot,
          explanation: "Taux réduit jusqu'à 42 500€"
        },
        {
          label: "IS tranche 25%",
          formula: "MAX(0, {resultat} - 42500) × 25%",
          values: {
            "resultat": data.comptabilite.resultatAvantIS,
            "base": data.impotSocietes.tranche25.base
          } as { [key: string]: number | string },
          result: -data.impotSocietes.tranche25.impot,
          explanation: "Taux normal au-delà de 42 500€"
        }
      ],
      finalResult: -data.impotSocietes.totalIS
    },
    {
      title: "Impôt sur le revenu (IR)",
      color: '#3f51b5',
      steps: [
        {
          label: "Salaire brut annuel",
          formula: "Rémunération brute",
          values: { "salaire": data.salaire.brutAnnuel } as { [key: string]: number | string },
          result: data.salaire.brutAnnuel,
          explanation: "Base de calcul du revenu imposable"
        },
        {
          label: "Charges salariales déductibles",
          formula: "{salaire} × {taux} (CSG déductible 6.8%)",
          values: {
            "salaire": data.salaire.brutAnnuel,
            "taux": 0.068
          } as { [key: string]: number | string },
          result: -(data.salaire.brutAnnuel * 0.068),
          explanation: "CSG déductible de l'assiette IR"
        },
        {
          label: "Abattement forfaitaire 10%",
          formula: "({salaire} - CSG déductible) × 10%",
          values: {
            "base": data.salaire.brutAnnuel - (data.salaire.brutAnnuel * 0.068),
            "taux": 0.10
          } as { [key: string]: number | string },
          result: -((data.salaire.brutAnnuel - (data.salaire.brutAnnuel * 0.068)) * 0.10),
          explanation: "Abattement pour frais professionnels"
        },
        {
          label: "Revenu imposable",
          formula: "Salaire - CSG déductible - Abattement 10%",
          values: {
            "revenu": data.impotRevenu.revenuImposable
          } as { [key: string]: number | string },
          result: data.impotRevenu.revenuImposable,
          explanation: "Base de calcul de l'IR"
        },
        ...data.impotRevenu.tranches.map((tranche, index) => ({
          label: `IR tranche ${formatPercent(tranche.taux)}`,
          formula: index === 0 ? "Franchise d'impôt" : `{base} × ${formatPercent(tranche.taux)}`,
          values: {
            "base": tranche.base,
            "taux": tranche.taux
          } as { [key: string]: number | string },
          result: -tranche.impot,
          explanation: index === 0 ? "Pas d'impôt jusqu'à 11 497€" : 
                       index === 1 ? "Taux de 11% de 11 497€ à 29 315€" :
                       index === 2 ? "Taux de 30% de 29 315€ à 83 823€" :
                       index === 3 ? "Taux de 41% de 83 823€ à 180 294€" :
                       "Taux de 45% au-delà de 180 294€",
          warning: tranche.impot > 0 && index >= 2 ? 
            "Taux marginal élevé - Des dispositifs de défiscalisation peuvent être intéressants" : undefined
        }))
      ],
      finalResult: -data.impotRevenu.impotNet
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cascade fiscale avec formules détaillées
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Chaque calcul est détaillé avec sa formule exacte et les valeurs actuelles. 
          Vérifiez que les taux correspondent à votre situation.
        </Typography>
      </Alert>
      
      {/* Cartes de calcul détaillées */}
      <Box sx={{ mb: 3 }}>
        {detailedCalculations.map((calc, index) => (
          <DetailedCalculationCard
            key={index}
            title={calc.title}
            steps={calc.steps}
            finalResult={calc.finalResult}
            color={calc.color}
          />
        ))}
        
        {/* Dividendes si applicables */}
        {data.dividendes.montantDistribuable > 0 && (
          <DetailedCalculationCard
            title="Taxation des dividendes"
            color="#ff5722"
            steps={data.dividendes.pfu ? [
              {
                label: "Dividendes bruts",
                formula: "Montant distribué",
                values: { "montant": data.dividendes.montantDistribuable } as { [key: string]: number | string },
                result: data.dividendes.montantDistribuable,
                explanation: "Montant prélevé sur le résultat net"
              },
              {
                label: "Prélèvements sociaux",
                formula: "{montant} × 17.2%",
                values: { 
                  "montant": data.dividendes.montantDistribuable,
                  "taux": 0.172
                } as { [key: string]: number | string },
                result: -data.dividendes.pfu.prelevementsSociaux,
                explanation: "CSG/CRDS sur dividendes"
              },
              {
                label: "Flat tax IR",
                formula: "{montant} × 12.8%",
                values: {
                  "montant": data.dividendes.montantDistribuable,
                  "taux": 0.128
                } as { [key: string]: number | string },
                result: -data.dividendes.pfu.impotRevenu,
                explanation: "Impôt forfaitaire (PFU)"
              }
            ] : [
              {
                label: "Dividendes bruts",
                formula: "Montant distribué",
                values: { "montant": data.dividendes.montantDistribuable } as { [key: string]: number | string },
                result: data.dividendes.montantDistribuable,
                explanation: "Montant prélevé sur le résultat net"
              },
              {
                label: "Abattement 40%",
                formula: "{montant} × 40%",
                values: {
                  "montant": data.dividendes.montantDistribuable,
                  "taux": 0.40
                } as { [key: string]: number | string },
                result: -data.dividendes.baremeProgressif!.abattement40,
                explanation: "Abattement pour option barème progressif"
              },
              {
                label: "Base imposable",
                formula: "{montant} × 60%",
                values: {
                  "montant": data.dividendes.montantDistribuable,
                  "taux": 0.60
                } as { [key: string]: number | string },
                result: data.dividendes.baremeProgressif!.baseImposable,
                explanation: "Montant soumis au barème IR"
              },
              {
                label: "Prélèvements sociaux",
                formula: "{montant} × 17.2%",
                values: {
                  "montant": data.dividendes.montantDistribuable,
                  "taux": 0.172
                } as { [key: string]: number | string },
                result: -data.dividendes.baremeProgressif!.prelevementsSociaux,
                explanation: "CSG/CRDS sur montant total"
              }
            ]}
            finalResult={data.dividendes.pfu?.netPercu || data.dividendes.baremeProgressif?.netPercu || 0}
          />
        )}
        
        {/* Résumé visuel */}
        <Card sx={{ mt: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Synthèse de la cascade
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  CA HT initial
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(data.comptabilite.caHT)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total prélèvements
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(data.synthese.totalPrelevements)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Net dirigeant
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(data.synthese.totalNetPercu)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Trésorerie société
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(data.synthese.tresorerieFinale)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      {/* Graphique en barres horizontales */}
      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={processedSteps}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis dataKey="label" type="category" width={80} />
            <ChartTooltip
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Bar dataKey="displayValue" radius={[0, 4, 4, 0]}>
              {processedSteps.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

// Composant principal
export default function TaxCalculationV2() {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['entreprise', 'remuneration', 'dividendes', 'personnel']);
  const [chargesHelpOpen, setChargesHelpOpen] = useState(false);
  
  // État complet des inputs
  const [inputs, setInputs] = useState<TaxInputs>({
    // Revenus
    caHT: 100000,
    chargesExploitation: 20000,
    chargesDeductibles: 5000,
    
    // Rémunération président
    salaireBrut: 30000,
    primesBonus: 0,
    avantagesNature: 0,
    
    // Dividendes
    dividendesBruts: 20000,
    optionBaremeProgressif: false,
    
    // Situation personnelle
    situationFamiliale: 'celibataire',
    nombreEnfants: 0,
    autresRevenusImposables: 0,
    
    // Options
    eligibleACRE: false,
    effectifEntreprise: 1,
  });
  
  const [results, setResults] = useState<DetailedTaxResults | null>(null);
  
  // Calcul automatique à chaque changement
  useEffect(() => {
    const newResults = calculateCompleteTaxation(inputs);
    setResults(newResults);
  }, [inputs]);
  
  const handleInputChange = (field: keyof TaxInputs) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : Number(event.target.value);
    setInputs(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedPanels(prev => 
      isExpanded 
        ? [...prev, panel]
        : prev.filter(p => p !== panel)
    );
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Calculateur fiscal SASU 2025
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Calculateur complet intégrant tous les barèmes progressifs 2025 : 
          IS (15%/25%), IR (0% à 45%), charges sociales détaillées, 
          choix PFU/progressif pour dividendes, optimisation fiscale.
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Panneau de configuration */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 35%' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Paramètres de simulation
            </Typography>
            
            {/* Accordéons pour organiser les paramètres */}
            <Accordion 
              expanded={expandedPanels.includes('entreprise')}
              onChange={handleAccordionChange('entreprise')}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Business sx={{ mr: 2 }} />
                <Typography sx={{ flex: 1 }}>Entreprise & Activité</Typography>
                <Button 
                  size="small" 
                  startIcon={<Help />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChargesHelpOpen(true);
                  }}
                  sx={{ mr: 2 }}
                >
                  Aide charges
                </Button>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="Chiffre d'affaires HT"
                    value={inputs.caHT}
                    onChange={handleInputChange('caHT')}
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                  />
                  <Box>
                    <TextField
                      label="Charges d'exploitation (100% déductibles)"
                      value={inputs.chargesExploitation}
                      onChange={handleInputChange('chargesExploitation')}
                      type="number"
                      fullWidth
                      helperText="Achats marchandises, sous-traitance, loyers, assurances, honoraires comptable, marketing..."
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setChargesHelpOpen(true)}
                            >
                              <Help fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                  <Box>
                    <TextField
                      label="Autres charges déductibles (avec conditions)"
                      value={inputs.chargesDeductibles}
                      onChange={handleInputChange('chargesDeductibles')}
                      type="number"
                      fullWidth
                      helperText="Frais véhicule, repas, déplacements, formations, amortissements... (cliquez sur ? pour détails)"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setChargesHelpOpen(true)}
                            >
                              <Help fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                  <TextField
                    label="Effectif entreprise"
                    value={inputs.effectifEntreprise}
                    onChange={handleInputChange('effectifEntreprise')}
                    type="number"
                    fullWidth
                    helperText="Impact sur certaines cotisations"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
            
            <Accordion
              expanded={expandedPanels.includes('remuneration')}
              onChange={handleAccordionChange('remuneration')}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Person sx={{ mr: 2 }} />
                <Typography>Rémunération président</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="Salaire brut annuel"
                    value={inputs.salaireBrut}
                    onChange={handleInputChange('salaireBrut')}
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                  />
                  <TextField
                    label="Primes et bonus"
                    value={inputs.primesBonus}
                    onChange={handleInputChange('primesBonus')}
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                  />
                  <TextField
                    label="Avantages en nature"
                    value={inputs.avantagesNature}
                    onChange={handleInputChange('avantagesNature')}
                    type="number"
                    fullWidth
                    helperText="Véhicule, logement..."
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={inputs.eligibleACRE}
                        onChange={(e) => setInputs(prev => ({ 
                          ...prev, 
                          eligibleACRE: e.target.checked 
                        }))}
                      />
                    }
                    label="Éligible ACRE (1ère année)"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
            
            <Accordion
              expanded={expandedPanels.includes('dividendes')}
              onChange={handleAccordionChange('dividendes')}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Receipt sx={{ mr: 2 }} />
                <Typography>Dividendes</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="Dividendes souhaités"
                    value={inputs.dividendesBruts}
                    onChange={handleInputChange('dividendesBruts')}
                    type="number"
                    fullWidth
                    helperText={results ? 
                      `Maximum distribuable: ${formatCurrency(results.comptabilite.capaciteDistribution)}` : 
                      ''
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                    error={!!(results && inputs.dividendesBruts > results.comptabilite.capaciteDistribution)}
                  />
                  
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Mode d'imposition</FormLabel>
                    <RadioGroup
                      value={inputs.optionBaremeProgressif ? 'progressif' : 'pfu'}
                      onChange={(e) => setInputs(prev => ({
                        ...prev,
                        optionBaremeProgressif: e.target.value === 'progressif'
                      }))}
                    >
                      <FormControlLabel 
                        value="pfu" 
                        control={<Radio />} 
                        label="PFU/Flat tax (30%)" 
                      />
                      <FormControlLabel 
                        value="progressif" 
                        control={<Radio />} 
                        label="Barème progressif IR" 
                      />
                    </RadioGroup>
                  </FormControl>
                  
                  {results && results.comparaisons.pfuVsProgressif && (
                    <Alert 
                      severity={results.comparaisons.pfuVsProgressif.meilleurChoix === 
                        (inputs.optionBaremeProgressif ? 'progressif' : 'pfu') ? 
                        'success' : 'warning'
                      }
                    >
                      <Typography variant="body2">
                        {results.comparaisons.pfuVsProgressif.meilleurChoix === 'pfu' ? 
                          'La flat tax est plus avantageuse' : 
                          'Le barème progressif est plus avantageux'
                        } (économie: {formatCurrency(results.comparaisons.pfuVsProgressif.economie)})
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
            
            <Accordion
              expanded={expandedPanels.includes('personnel')}
              onChange={handleAccordionChange('personnel')}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Person sx={{ mr: 2 }} />
                <Typography>Situation personnelle</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Situation familiale</InputLabel>
                    <Select
                      value={inputs.situationFamiliale}
                      onChange={(e) => setInputs(prev => ({
                        ...prev,
                        situationFamiliale: e.target.value as any
                      }))}
                    >
                      <MenuItem value="celibataire">Célibataire</MenuItem>
                      <MenuItem value="marie">Marié(e)</MenuItem>
                      <MenuItem value="pacse">Pacsé(e)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Nombre d'enfants à charge"
                    value={inputs.nombreEnfants}
                    onChange={handleInputChange('nombreEnfants')}
                    type="number"
                    fullWidth
                    helperText={results ? 
                      `${results.impotRevenu.nombreParts} parts fiscales` : ''
                    }
                  />
                  
                  <TextField
                    label="Autres revenus imposables du foyer"
                    value={inputs.autresRevenusImposables}
                    onChange={handleInputChange('autresRevenusImposables')}
                    type="number"
                    fullWidth
                    helperText="Revenus conjoint, fonciers..."
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Box>
        
        {/* Panneau de résultats */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 63%' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Cascade fiscale" />
              <Tab label="Détail des calculs" />
              <Tab label="Optimisation" />
              <Tab label="Synthèse" />
            </Tabs>
            
            {/* Tab 1: Cascade fiscale */}
            {activeTab === 0 && results && (
              <Box sx={{ mt: 3 }}>
                <WaterfallChart data={results} />
                <Box sx={{ mt: 4 }}>
                  <FiscalWaterfall data={results} />
                </Box>
              </Box>
            )}
            
            {/* Tab 2: Détail des calculs */}
            {activeTab === 1 && results && (
              <Box sx={{ mt: 3 }}>
                <Stepper orientation="vertical">
                  {/* Étape 1: Charges sociales */}
                  <Step expanded>
                    <StepLabel>Charges sociales sur salaire (détail complet)</StepLabel>
                    <StepContent>
                      {(() => {
                        const detailedCharges = calculateDetailedSocialCharges(results.salaire.brutAnnuel);
                        return (
                          <Box>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <Typography variant="caption">
                                <strong>Spécificité SASU:</strong> Le président de SASU est assimilé salarié mais ne cotise pas au chômage ni à l'AGS.
                                Les taux présentés sont ceux applicables en 2025.
                              </Typography>
                            </Alert>
                            
                            {/* Tableau détaillé des cotisations */}
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Cotisation</TableCell>
                                    <TableCell align="center">Assiette</TableCell>
                                    <TableCell align="center">Taux patronal</TableCell>
                                    <TableCell align="center">Taux salarial</TableCell>
                                    <TableCell align="right">Montant patronal</TableCell>
                                    <TableCell align="right">Montant salarial</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailedCharges.cotisations.map((cotisation, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="body2">{cotisation.nom}</Typography>
                                        {cotisation.explication && (
                                          <Typography variant="caption" color="text.secondary">
                                            {cotisation.explication}
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Typography variant="caption">
                                          {cotisation.plafond || 'Salaire total'}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        {cotisation.tauxPatronal > 0 ? formatPercent(cotisation.tauxPatronal) : '-'}
                                      </TableCell>
                                      <TableCell align="center">
                                        {cotisation.tauxSalarial > 0 ? formatPercent(cotisation.tauxSalarial) : '-'}
                                      </TableCell>
                                      <TableCell align="right">
                                        {cotisation.montantPatronal > 0 ? formatCurrency(cotisation.montantPatronal) : '-'}
                                      </TableCell>
                                      <TableCell align="right">
                                        {cotisation.montantSalarial > 0 ? formatCurrency(cotisation.montantSalarial) : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell colSpan={4}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        TOTAUX
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {formatCurrency(detailedCharges.totaux.chargesPatronales)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {formatCurrency(detailedCharges.totaux.chargesSalariales)}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                            
                            {/* Résumé */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                              <Paper sx={{ p: 2, flex: '1 1 200px' }}>
                                <Typography variant="caption" color="text.secondary">Salaire brut</Typography>
                                <Typography variant="h6">{formatCurrency(results.salaire.brutAnnuel)}</Typography>
                              </Paper>
                              <Paper sx={{ p: 2, flex: '1 1 200px' }}>
                                <Typography variant="caption" color="text.secondary">Total charges patronales</Typography>
                                <Typography variant="h6" color="error">{formatCurrency(detailedCharges.totaux.chargesPatronales)}</Typography>
                                <Typography variant="caption">{formatPercent(detailedCharges.totaux.tauxPatronal)}</Typography>
                              </Paper>
                              <Paper sx={{ p: 2, flex: '1 1 200px' }}>
                                <Typography variant="caption" color="text.secondary">Total charges salariales</Typography>
                                <Typography variant="h6" color="error">{formatCurrency(detailedCharges.totaux.chargesSalariales)}</Typography>
                                <Typography variant="caption">{formatPercent(detailedCharges.totaux.tauxSalarial)}</Typography>
                              </Paper>
                              <Paper sx={{ p: 2, flex: '1 1 200px' }}>
                                <Typography variant="caption" color="text.secondary">Salaire net</Typography>
                                <Typography variant="h6" color="success.main">{formatCurrency(detailedCharges.totaux.netAvantImpot)}</Typography>
                              </Paper>
                              <Paper sx={{ p: 2, flex: '1 1 200px' }}>
                                <Typography variant="caption" color="text.secondary">Coût total employeur</Typography>
                                <Typography variant="h6" color="warning.main">{formatCurrency(detailedCharges.totaux.coutTotal)}</Typography>
                              </Paper>
                            </Box>
                          </Box>
                        );
                      })()}
                    </StepContent>
                  </Step>
                  
                  {/* Étape 2: IS */}
                  <Step expanded>
                    <StepLabel>Impôt sur les sociétés</StepLabel>
                    <StepContent>
                      <Card>
                        <CardContent>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="caption">
                              <strong>EBITDA :</strong> {formatCurrency(results.comptabilite.caHT - results.comptabilite.chargesExploitation - results.comptabilite.chargesDeductibles)}<br/>
                              L'EBITDA (Earnings Before Interest, Taxes, Depreciation & Amortization) représente le résultat d'exploitation avant les charges financières, impôts et amortissements. C'est un indicateur de la performance opérationnelle pure de l'entreprise.
                            </Typography>
                          </Alert>
                          <Typography variant="body1" gutterBottom>
                            Bénéfice imposable: {formatCurrency(results.impotSocietes.beneficeImposable)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                            = EBITDA - Salaires - Charges sociales patronales
                          </Typography>
                          <List>
                            <ListItem>
                              <ListItemText
                                primary="Tranche à 15% (jusqu'à 42 500€)"
                                secondary={`Base: ${formatCurrency(results.impotSocietes.tranche15.base)} → IS: ${formatCurrency(results.impotSocietes.tranche15.impot)}`}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Tranche à 25% (au-delà)"
                                secondary={`Base: ${formatCurrency(results.impotSocietes.tranche25.base)} → IS: ${formatCurrency(results.impotSocietes.tranche25.impot)}`}
                              />
                            </ListItem>
                          </List>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="h6">
                            Total IS: {formatCurrency(results.impotSocietes.totalIS)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Taux effectif: {formatPercent(results.impotSocietes.tauxEffectif)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </StepContent>
                  </Step>
                  
                  {/* Étape 3: IR */}
                  <Step expanded>
                    <StepLabel>Impôt sur le revenu</StepLabel>
                    <StepContent>
                      <ProgressiveIncomeCalculator
                        revenuImposable={results.impotRevenu.revenuImposable}
                        quotientFamilial={results.impotRevenu.nombreParts}
                      />
                    </StepContent>
                  </Step>
                </Stepper>
              </Box>
            )}
            
            {/* Tab 3: Optimisation */}
            {activeTab === 2 && results && (
              <Box sx={{ mt: 3 }}>
                <Stack spacing={3}>
                  {/* Comparaison salaire/dividendes */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Arbitrage salaire vs dividendes
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" color="primary">
                            Pour 1000€ de salaire
                          </Typography>
                          <Typography variant="body1">
                            Coût entreprise: {formatCurrency(results.comparaisons.salaireVsDividendes.coutSalaire1000)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Protection sociale complète
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" color="primary">
                            Pour 1000€ de dividendes
                          </Typography>
                          <Typography variant="body1">
                            Coût après IS: {formatCurrency(results.comparaisons.salaireVsDividendes.coutDividende1000)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pas de protection sociale
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Recommandation:</strong> Salaire optimal de {formatCurrency(results.synthese.salaireOptimal)} 
                          + dividendes de {formatCurrency(results.synthese.dividendesOptimaux)}
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                  
                  {/* Validation retraite */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Validation trimestres retraite
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={results.retraite.trimestresValides * 25}
                        sx={{ height: 10, borderRadius: 1, mb: 2 }}
                      />
                      <Typography variant="body1">
                        {results.retraite.trimestresValides}/4 trimestres validés
                      </Typography>
                      {results.retraite.manquePourValidation && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Il manque {formatCurrency(results.retraite.manquePourValidation)} de salaire 
                          pour valider 4 trimestres
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Économies potentielles */}
                  {results.synthese.economiesPotentielles > 1000 && (
                    <Alert severity="success">
                      <Typography variant="body1">
                        <strong>Économies potentielles:</strong> {formatCurrency(results.synthese.economiesPotentielles)}
                      </Typography>
                      <Typography variant="body2">
                        En optimisant le mix salaire/dividendes selon nos recommandations
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </Box>
            )}
            
            {/* Tab 4: Synthèse */}
            {activeTab === 3 && results && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {/* KPIs principaux */}
                  <Card sx={{ flex: '1 1 30%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Net dans la poche
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(results.synthese.totalNetPercu)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Salaire net + dividendes nets
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ flex: '1 1 30%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Pression fiscale totale
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {formatPercent(results.synthese.tauxPressionFiscale)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total prélèvements / CA HT
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ flex: '1 1 30%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Trésorerie société
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(results.synthese.tresorerieFinale)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reste en société
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                
                {/* Répartition en camembert */}
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Répartition du CA HT
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Charges exploitation', value: results.comptabilite.chargesExploitation, fill: '#ff9800' },
                            { name: 'Charges sociales', value: results.synthese.totalChargesSociales, fill: '#f44336' },
                            { name: 'IS', value: results.impotSocietes.totalIS, fill: '#9c27b0' },
                            { name: 'IR', value: results.impotRevenu.impotNet, fill: '#3f51b5' },
                            { name: 'Prélèvements dividendes', value: results.dividendes.pfu?.totalPrelevements || results.dividendes.baremeProgressif?.totalPrelevements || 0, fill: '#ff5722' },
                            { name: 'Net dirigeant', value: results.synthese.totalNetPercu, fill: '#4caf50' },
                            { name: 'Trésorerie société', value: results.synthese.tresorerieFinale, fill: '#00bcd4' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          outerRadius={120}
                          dataKey="value"
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                            <Cell key={`cell-${index}`} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(value) => formatCurrency(Number(value))} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
      
      {/* Dialog d'aide pour les charges */}
      <Dialog 
        open={chargesHelpOpen} 
        onClose={() => setChargesHelpOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Help sx={{ mr: 2 }} />
            <Typography variant="h6">
              Guide détaillé des charges déductibles
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ChargesHelper />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChargesHelpOpen(false)} color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}