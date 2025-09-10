import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  AutoFixHigh,
  TrendingUp,
  TrendingDown,
  Euro,
  Speed,
  Psychology,
  Timeline,
  CompareArrows,
  Info,
  CheckCircle,
  Warning,
  ExpandMore,
  Lightbulb,
  Security,
  AccountBalance,
  MonetizationOn,
  Assessment,
  EmojiObjects,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';
import {
  optimizeTaxes,
  OptimizationResults,
  OptimizationScenario,
  OptimizationPreferences,
  generateAIRecommendations,
} from '../../utils/taxOptimizer2025';
import { TaxInputs } from '../../utils/taxCalculator2025';

interface TaxOptimizationPanelProps {
  inputs: TaxInputs;
  onApplyOptimization?: (salaire: number, dividendes: number) => void;
}

export const TaxOptimizationPanel: React.FC<TaxOptimizationPanelProps> = ({
  inputs,
  onApplyOptimization
}) => {
  const [optimization, setOptimization] = useState<OptimizationResults | null>(null);
  const [objective, setObjective] = useState<'max_net' | 'min_taxes' | 'balanced' | 'max_retirement' | 'max_liquidity'>('balanced');
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<OptimizationScenario | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preferences, setPreferences] = useState<Partial<OptimizationPreferences>>({
    constraints: {
      needsRetirement: true,
      prefersPFU: true,
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Lancer l'optimisation
  const runOptimization = async () => {
    setIsCalculating(true);
    
    // Simulation d'un calcul complexe
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = optimizeTaxes(
      inputs.caHT,
      inputs.chargesExploitation,
      inputs.chargesDeductibles,
      inputs.salaireBrut,
      {
        objectif: objective,
        constraints: preferences.constraints
      }
    );
    
    setOptimization(results);
    setSelectedScenario(results.optimalScenario);
    setIsCalculating(false);
  };

  useEffect(() => {
    runOptimization();
  }, [objective, inputs.caHT, inputs.chargesExploitation]);

  if (!optimization) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Calcul de l'optimisation en cours...</Typography>
      </Box>
    );
  }

  // Préparer les données pour les graphiques
  const comparisonData = [
    {
      name: 'Actuel',
      salaire: optimization.currentScenario.salaireBrut,
      dividendes: optimization.currentScenario.dividendes,
      netPercu: optimization.currentScenario.totalNetPercu,
      charges: optimization.currentScenario.totalCharges,
      taux: optimization.currentScenario.tauxPressionFiscale * 100
    },
    {
      name: 'Optimal',
      salaire: optimization.optimalScenario.salaireBrut,
      dividendes: optimization.optimalScenario.dividendes,
      netPercu: optimization.optimalScenario.totalNetPercu,
      charges: optimization.optimalScenario.totalCharges,
      taux: optimization.optimalScenario.tauxPressionFiscale * 100
    }
  ];

  const scenariosData = [
    optimization.currentScenario,
    optimization.optimalScenario,
    ...optimization.alternativeScenarios.slice(0, 3)
  ].map((s, i) => ({
    name: i === 0 ? 'Actuel' : i === 1 ? 'Optimal' : `Alt ${i-1}`,
    ...s
  }));

  const radarData = [
    {
      metric: 'Net perçu',
      actuel: (optimization.currentScenario.totalNetPercu / inputs.caHT) * 100,
      optimal: (optimization.optimalScenario.totalNetPercu / inputs.caHT) * 100,
    },
    {
      metric: 'Efficacité fiscale',
      actuel: (1 - optimization.currentScenario.tauxPressionFiscale) * 100,
      optimal: (1 - optimization.optimalScenario.tauxPressionFiscale) * 100,
    },
    {
      metric: 'Retraite',
      actuel: Math.min((optimization.currentScenario.salaireBrut / 46368) * 100, 100),
      optimal: Math.min((optimization.optimalScenario.salaireBrut / 46368) * 100, 100),
    },
    {
      metric: 'Liquidité',
      actuel: (optimization.currentScenario.dividendes / (optimization.currentScenario.salaireBrut + optimization.currentScenario.dividendes)) * 100,
      optimal: (optimization.optimalScenario.dividendes / (optimization.optimalScenario.salaireBrut + optimization.optimalScenario.dividendes)) * 100,
    },
    {
      metric: 'Stabilité',
      actuel: (optimization.currentScenario.salaireBrut / (optimization.currentScenario.salaireBrut + optimization.currentScenario.dividendes)) * 100,
      optimal: (optimization.optimalScenario.salaireBrut / (optimization.optimalScenario.salaireBrut + optimization.optimalScenario.dividendes)) * 100,
    }
  ];

  // Graphique de sensibilité (comment le net évolue selon le salaire)
  const sensitivityData = optimization.alternativeScenarios
    .concat([optimization.currentScenario, optimization.optimalScenario])
    .sort((a, b) => a.salaireBrut - b.salaireBrut)
    .map(s => ({
      salaire: s.salaireBrut,
      netPercu: s.totalNetPercu,
      tauxPression: s.tauxPressionFiscale * 100,
      isOptimal: s.isOptimal,
      isCurrent: s === optimization.currentScenario
    }));

  return (
    <Box>
      {/* Header avec objectif */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Psychology sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flex: 1 }}>
              Optimisation fiscale intelligente
            </Typography>
            <Chip 
              icon={<AutoFixHigh />}
              label="IA-Powered" 
              color="primary" 
              variant="outlined"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sélectionnez votre objectif principal :
          </Typography>
          
          <ToggleButtonGroup
            value={objective}
            exclusive
            onChange={(e, val) => val && setObjective(val)}
            sx={{ mt: 2, mb: 2 }}
            fullWidth
          >
            <ToggleButton value="max_net">
              <MonetizationOn sx={{ mr: 1 }} />
              Max Net
            </ToggleButton>
            <ToggleButton value="min_taxes">
              <TrendingDown sx={{ mr: 1 }} />
              Min Taxes
            </ToggleButton>
            <ToggleButton value="balanced">
              <Speed sx={{ mr: 1 }} />
              Équilibré
            </ToggleButton>
            <ToggleButton value="max_retirement">
              <Security sx={{ mr: 1 }} />
              Retraite
            </ToggleButton>
            <ToggleButton value="max_liquidity">
              <Euro sx={{ mr: 1 }} />
              Liquidité
            </ToggleButton>
          </ToggleButtonGroup>

          {isCalculating && <LinearProgress />}
        </CardContent>
      </Card>

      {/* Résultat principal */}
      <Alert 
        severity={optimization.savings > 0 ? "success" : "info"} 
        sx={{ mb: 3 }}
        icon={<EmojiObjects />}
      >
        <Typography variant="subtitle1" gutterBottom>
          {optimization.savings > 0 ? (
            <>
              💡 Optimisation trouvée ! Gain potentiel de <strong>{formatCurrency(optimization.savings)}</strong> 
              {' '}(+{optimization.savingsPercent.toFixed(1)}%)
            </>
          ) : (
            "Votre configuration actuelle est déjà optimale pour vos critères"
          )}
        </Typography>
        <Typography variant="body2">
          {optimization.optimalScenario.explanation}
        </Typography>
      </Alert>

      {/* Comparaison visuelle */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {/* Graphique en barres de comparaison */}
        <Paper sx={{ p: 2, flex: '1 1 45%' }}>
          <Typography variant="subtitle2" gutterBottom>
            Comparaison Actuel vs Optimal
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
              <ChartTooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="salaire" fill="#2196f3" name="Salaire" />
              <Bar dataKey="dividendes" fill="#4caf50" name="Dividendes" />
              <Bar dataKey="netPercu" fill="#ff9800" name="Net perçu" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Graphique radar des critères */}
        <Paper sx={{ p: 2, flex: '1 1 45%' }}>
          <Typography variant="subtitle2" gutterBottom>
            Analyse multicritères
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Actuel" dataKey="actuel" stroke="#ff7300" fill="#ff7300" fillOpacity={0.3} />
              <Radar name="Optimal" dataKey="optimal" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Tableau des scénarios */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CompareArrows sx={{ mr: 1, verticalAlign: 'middle' }} />
            Comparaison des scénarios
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scénario</TableCell>
                  <TableCell align="right">Salaire</TableCell>
                  <TableCell align="right">Dividendes</TableCell>
                  <TableCell align="right">Net perçu</TableCell>
                  <TableCell align="right">Taux pression</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scenariosData.map((scenario, index) => (
                  <TableRow 
                    key={index}
                    selected={selectedScenario === (index === 0 ? optimization.currentScenario : index === 1 ? optimization.optimalScenario : optimization.alternativeScenarios[index-2])}
                    sx={{ 
                      bgcolor: index === 1 ? 'success.light' : undefined,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedScenario(
                      index === 0 ? optimization.currentScenario : 
                      index === 1 ? optimization.optimalScenario : 
                      optimization.alternativeScenarios[index-2]
                    )}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {scenario.name}
                        {index === 0 && <Chip label="Actuel" size="small" />}
                        {index === 1 && <Chip label="Optimal" size="small" color="success" />}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(scenario.salaireBrut)}</TableCell>
                    <TableCell align="right">{formatCurrency(scenario.dividendes)}</TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(scenario.totalNetPercu)}</strong>
                    </TableCell>
                    <TableCell align="right">{formatPercent(scenario.tauxPressionFiscale)}</TableCell>
                    <TableCell align="center">
                      <LinearProgress 
                        variant="determinate" 
                        value={(scenario.score / optimization.optimalScenario.score) * 100}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      {index === 1 && onApplyOptimization && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => onApplyOptimization(scenario.salaireBrut, scenario.dividendes)}
                        >
                          Appliquer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Graphique de sensibilité */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
            Analyse de sensibilité
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Évolution du net perçu selon la répartition salaire/dividendes
          </Typography>
          
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={sensitivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="salaire" 
                tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`}
                label={{ value: 'Salaire brut annuel', position: 'insideBottom', offset: -5 }}
              />
              <YAxis yAxisId="left" tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
              <ChartTooltip 
                formatter={(value: number, name: string) => 
                  name === 'Taux de pression' ? `${value.toFixed(1)}%` : formatCurrency(value)
                }
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="netPercu"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                name="Net perçu"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tauxPression"
                stroke="#ff7300"
                name="Taux de pression"
                strokeWidth={2}
              />
              {sensitivityData.map((point, index) => 
                point.isOptimal ? (
                  <Line
                    key={`optimal-${index}`}
                    yAxisId="left"
                    type="monotone"
                    dataKey={() => point.netPercu}
                    stroke="#4caf50"
                    strokeWidth={4}
                    dot={{ fill: '#4caf50', r: 8 }}
                  />
                ) : point.isCurrent ? (
                  <Line
                    key={`current-${index}`}
                    yAxisId="left"
                    type="monotone"
                    dataKey={() => point.netPercu}
                    stroke="#f44336"
                    strokeWidth={4}
                    dot={{ fill: '#f44336', r: 6 }}
                  />
                ) : null
              )}
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stratégies détaillées */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Assessment sx={{ mr: 2 }} />
          <Typography>Stratégies d'optimisation détaillées</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {optimization.detailedAnalysis.strategies.map((strategy, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>
                    {strategy.name}
                  </Typography>
                  <Chip 
                    label={`Gain: ${formatCurrency(strategy.netGain)}`}
                    color={strategy.netGain > 0 ? 'success' : 'default'}
                  />
                  <Chip 
                    label={`Risque: ${strategy.riskLevel}`}
                    color={
                      strategy.riskLevel === 'low' ? 'success' : 
                      strategy.riskLevel === 'medium' ? 'warning' : 'error'
                    }
                    sx={{ ml: 1 }}
                  />
                </Box>
                
                <Typography variant="body2" gutterBottom>
                  {strategy.description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      Mise en œuvre :
                    </Typography>
                    <List dense>
                      {strategy.implementation.map((step, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <CheckCircle fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={step} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="warning.main">
                      Points d'attention :
                    </Typography>
                    <List dense>
                      {strategy.legalConsiderations.map((point, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <Warning fontSize="small" color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={point} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Horizon : {strategy.timeHorizon}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Recommandations AI */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Lightbulb sx={{ mr: 2, color: 'warning.main' }} />
            <Typography variant="h6">
              Recommandations personnalisées
            </Typography>
          </Box>
          
          <List>
            {optimization.globalRecommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
          
          {selectedScenario && selectedScenario.recommendations.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Pour le scénario sélectionné :
              </Typography>
              <List dense>
                {selectedScenario.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>

      {/* Paramètres avancés */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Paramètres avancés de l'optimisation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset">
            <FormLabel component="legend">Contraintes</FormLabel>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.constraints?.needsRetirement || false}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    constraints: {
                      ...preferences.constraints,
                      needsRetirement: e.target.checked
                    }
                  })}
                />
              }
              label="Valider 4 trimestres de retraite"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.constraints?.prefersPFU || false}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    constraints: {
                      ...preferences.constraints,
                      prefersPFU: e.target.checked
                    }
                  })}
                />
              }
              label="Préférer le PFU (flat tax) au barème progressif"
            />
          </FormControl>
          
          <Button
            variant="contained"
            onClick={runOptimization}
            sx={{ mt: 2 }}
            startIcon={<Psychology />}
          >
            Recalculer l'optimisation
          </Button>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};