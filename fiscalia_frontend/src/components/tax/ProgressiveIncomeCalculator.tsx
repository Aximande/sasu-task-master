import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import { TrendingUp, Info } from '@mui/icons-material';

interface TaxBracket {
  limite: number;
  taux: number;
  revenuImposable: number;
  montantImpose: number;
  impot: number;
}

interface ProgressiveIncomeCalculatorProps {
  revenuImposable: number;
  quotientFamilial: number;
  color?: string;
}

export const ProgressiveIncomeCalculator: React.FC<ProgressiveIncomeCalculatorProps> = ({
  revenuImposable,
  quotientFamilial = 1,
  color = '#4caf50'
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  // Barème IR 2025
  const BAREME_IR_2025 = [
    { limite: 11497, taux: 0, nom: "Franchise" },
    { limite: 29315, taux: 0.11, nom: "Tranche 1" },
    { limite: 83823, taux: 0.30, nom: "Tranche 2" },
    { limite: 180294, taux: 0.41, nom: "Tranche 3" },
    { limite: Infinity, taux: 0.45, nom: "Tranche 4" }
  ];

  // Calcul par tranche détaillé
  const calculateProgressiveTax = () => {
    const revenuParPart = revenuImposable / quotientFamilial;
    const tranches: TaxBracket[] = [];
    let montantRestant = revenuParPart;
    let limiteInferieure = 0;
    let impotTotal = 0;

    BAREME_IR_2025.forEach((tranche, index) => {
      if (montantRestant > 0) {
        const largeurTranche = tranche.limite === Infinity 
          ? montantRestant 
          : Math.min(tranche.limite - limiteInferieure, montantRestant);
        
        const montantDansTranche = Math.max(0, largeurTranche);
        const impotTranche = montantDansTranche * tranche.taux;
        
        tranches.push({
          limite: tranche.limite,
          taux: tranche.taux,
          revenuImposable: montantDansTranche,
          montantImpose: montantDansTranche,
          impot: impotTranche
        });

        impotTotal += impotTranche;
        montantRestant -= montantDansTranche;
        limiteInferieure = tranche.limite;
      } else {
        // Tranches non utilisées
        tranches.push({
          limite: tranche.limite,
          taux: tranche.taux,
          revenuImposable: 0,
          montantImpose: 0,
          impot: 0
        });
      }
    });

    return {
      tranches,
      impotParPart: impotTotal,
      impotTotal: impotTotal * quotientFamilial,
      tauxMarginal: tranches.filter(t => t.revenuImposable > 0).slice(-1)[0]?.taux || 0,
      tauxMoyen: revenuImposable > 0 ? (impotTotal * quotientFamilial) / revenuImposable : 0
    };
  };

  const result = calculateProgressiveTax();

  // Calcul des limites pour l'affichage
  const getLimiteAffichage = (index: number, tranche: any) => {
    if (index === 0) return `0 - ${formatCurrency(tranche.limite)}`;
    if (tranche.limite === Infinity) return `> ${formatCurrency(BAREME_IR_2025[index - 1].limite)}`;
    return `${formatCurrency(BAREME_IR_2025[index - 1].limite)} - ${formatCurrency(tranche.limite)}`;
  };

  return (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendingUp sx={{ mr: 2, color }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Calcul progressif de l'impôt sur le revenu
          </Typography>
          <Chip 
            label={`IR Total: ${formatCurrency(result.impotTotal)}`} 
            color="primary" 
            sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}
          />
        </Box>

        {/* Informations clés */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 1.5, flex: '1 1 200px' }}>
            <Typography variant="caption" color="text.secondary">
              Revenu imposable
            </Typography>
            <Typography variant="h6">
              {formatCurrency(revenuImposable)}
            </Typography>
          </Paper>
          <Paper sx={{ p: 1.5, flex: '1 1 200px' }}>
            <Typography variant="caption" color="text.secondary">
              Quotient familial
            </Typography>
            <Typography variant="h6">
              {quotientFamilial} part{quotientFamilial > 1 ? 's' : ''}
            </Typography>
          </Paper>
          <Paper sx={{ p: 1.5, flex: '1 1 200px' }}>
            <Typography variant="caption" color="text.secondary">
              Taux marginal
              <Tooltip title="Taux d'imposition de votre dernière tranche">
                <Info sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
              </Tooltip>
            </Typography>
            <Typography variant="h6" color="warning.main">
              {formatPercent(result.tauxMarginal)}
            </Typography>
          </Paper>
          <Paper sx={{ p: 1.5, flex: '1 1 200px' }}>
            <Typography variant="caption" color="text.secondary">
              Taux moyen effectif
              <Tooltip title="Impôt total / Revenu imposable">
                <Info sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
              </Tooltip>
            </Typography>
            <Typography variant="h6" color="success.main">
              {formatPercent(result.tauxMoyen)}
            </Typography>
          </Paper>
        </Box>

        {/* Tableau détaillé par tranche */}
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
          Détail du calcul par tranche (pour {quotientFamilial} part{quotientFamilial > 1 ? 's' : ''})
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tranche</TableCell>
                <TableCell>Limites</TableCell>
                <TableCell align="center">Taux</TableCell>
                <TableCell align="right">Base imposable</TableCell>
                <TableCell align="right">Impôt</TableCell>
                <TableCell>Visualisation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {BAREME_IR_2025.map((tranche, index) => {
                const trancheCalc = result.tranches[index];
                const pourcentageUtilise = trancheCalc.revenuImposable > 0 
                  ? (trancheCalc.revenuImposable / (revenuImposable / quotientFamilial)) * 100
                  : 0;
                
                return (
                  <TableRow key={index} sx={{ 
                    bgcolor: trancheCalc.revenuImposable > 0 ? 'action.hover' : 'inherit' 
                  }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {tranche.nom}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getLimiteAffichage(index, tranche)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={formatPercent(tranche.taux)} 
                        size="small"
                        color={tranche.taux === 0 ? 'success' : tranche.taux <= 0.11 ? 'info' : tranche.taux <= 0.30 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {trancheCalc.revenuImposable > 0 ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(trancheCalc.revenuImposable)}
                          </Typography>
                          {quotientFamilial > 1 && (
                            <Typography variant="caption" color="text.secondary">
                              × {quotientFamilial} = {formatCurrency(trancheCalc.revenuImposable * quotientFamilial)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {trancheCalc.impot > 0 ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            {formatCurrency(trancheCalc.impot)}
                          </Typography>
                          {quotientFamilial > 1 && (
                            <Typography variant="caption" color="text.secondary">
                              × {quotientFamilial} = {formatCurrency(trancheCalc.impot * quotientFamilial)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: 100 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={pourcentageUtilise}
                          sx={{ 
                            height: 8,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: tranche.taux === 0 ? 'success.main' : 
                                      tranche.taux <= 0.11 ? 'info.main' : 
                                      tranche.taux <= 0.30 ? 'warning.main' : 'error.main'
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {pourcentageUtilise.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell colSpan={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    TOTAL
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(revenuImposable)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {formatCurrency(result.impotTotal)}
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Formule de calcul */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Formule du calcul progressif :</strong><br/>
            1. Division du revenu imposable par le quotient familial : {formatCurrency(revenuImposable)} ÷ {quotientFamilial} = {formatCurrency(revenuImposable / quotientFamilial)}<br/>
            2. Application du barème progressif sur le revenu par part<br/>
            3. Multiplication par le nombre de parts : {formatCurrency(result.impotParPart)} × {quotientFamilial} = {formatCurrency(result.impotTotal)}<br/>
            <strong>Résultat :</strong> Impôt total de {formatCurrency(result.impotTotal)} soit un taux moyen de {formatPercent(result.tauxMoyen)}
          </Typography>
        </Alert>

        {/* Conseils d'optimisation */}
        {result.tauxMarginal >= 0.30 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>💡 Optimisation possible :</strong> Avec un taux marginal de {formatPercent(result.tauxMarginal)}, 
              certains dispositifs de défiscalisation peuvent être intéressants (PER, investissements défiscalisants, etc.)
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};