import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { DetailedTaxResults } from '../../utils/taxCalculator2025';

interface WaterfallChartProps {
  data: DetailedTaxResults;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Construire les données pour le waterfall
  const waterfallData = [
    {
      name: 'CA HT',
      value: data.comptabilite.caHT,
      cumulative: data.comptabilite.caHT,
      fill: '#4caf50',
      isPositive: true,
      detail: 'Chiffre d\'affaires initial'
    },
    {
      name: 'Charges Expl.',
      value: -data.comptabilite.chargesExploitation,
      cumulative: data.comptabilite.caHT - data.comptabilite.chargesExploitation,
      fill: '#ff9800',
      isPositive: false,
      detail: `Charges d'exploitation: ${formatCurrency(data.comptabilite.chargesExploitation)}`
    },
    {
      name: 'Charges Déd.',
      value: -data.comptabilite.chargesDeductibles,
      cumulative: data.comptabilite.caHT - data.comptabilite.chargesExploitation - data.comptabilite.chargesDeductibles,
      fill: '#ff9800',
      isPositive: false,
      detail: `Charges déductibles: ${formatCurrency(data.comptabilite.chargesDeductibles)}`
    },
    {
      name: 'EBITDA',
      value: data.comptabilite.caHT - data.comptabilite.chargesExploitation - data.comptabilite.chargesDeductibles,
      cumulative: data.comptabilite.caHT - data.comptabilite.chargesExploitation - data.comptabilite.chargesDeductibles,
      fill: '#03a9f4',
      isPositive: true,
      isIntermediate: true,
      detail: 'Résultat opérationnel'
    },
    {
      name: 'Salaire Brut',
      value: -data.salaire.brutAnnuel,
      cumulative: data.comptabilite.caHT - data.comptabilite.chargesExploitation - data.comptabilite.chargesDeductibles - data.salaire.brutAnnuel,
      fill: '#f44336',
      isPositive: false,
      detail: `Rémunération dirigeant: ${formatCurrency(data.salaire.brutAnnuel)}`
    },
    {
      name: 'Charges Pat.',
      value: -data.salaire.chargesPatronales.total,
      cumulative: data.comptabilite.resultatAvantIS,
      fill: '#e91e63',
      isPositive: false,
      detail: `Charges patronales (${formatPercent(data.salaire.chargesPatronales.taux)}): ${formatCurrency(data.salaire.chargesPatronales.total)}`
    },
    {
      name: 'Résultat avant IS',
      value: data.comptabilite.resultatAvantIS,
      cumulative: data.comptabilite.resultatAvantIS,
      fill: '#2196f3',
      isPositive: true,
      isIntermediate: true,
      detail: 'Base imposable IS'
    },
    {
      name: 'IS',
      value: -data.impotSocietes.totalIS,
      cumulative: data.comptabilite.resultatNet,
      fill: '#9c27b0',
      isPositive: false,
      detail: `Impôt sociétés (${formatPercent(data.impotSocietes.tauxEffectif)}): ${formatCurrency(data.impotSocietes.totalIS)}`
    },
    {
      name: 'Résultat Net',
      value: data.comptabilite.resultatNet,
      cumulative: data.comptabilite.resultatNet,
      fill: '#00bcd4',
      isPositive: true,
      isIntermediate: true,
      detail: 'Bénéfice après impôt'
    },
    {
      name: 'Dividendes',
      value: -data.dividendes.montantDistribuable,
      cumulative: data.comptabilite.resultatNet - data.dividendes.montantDistribuable,
      fill: '#ff5722',
      isPositive: false,
      detail: `Distribution: ${formatCurrency(data.dividendes.montantDistribuable)}`
    },
    {
      name: 'Prélèvements',
      value: -(data.dividendes.pfu?.totalPrelevements || data.dividendes.baremeProgressif?.totalPrelevements || 0),
      cumulative: data.synthese.tresorerieFinale,
      fill: '#ff3d00',
      isPositive: false,
      detail: data.dividendes.pfu ? 'PFU 30% (17.2% + 12.8%)' : 'Prélèvements sociaux 17.2%'
    },
    {
      name: 'Trésorerie',
      value: data.synthese.tresorerieFinale,
      cumulative: data.synthese.tresorerieFinale,
      fill: '#8bc34a',
      isPositive: true,
      isFinal: true,
      detail: 'Reste en société'
    }
  ];

  // Préparer les données pour le graphique
  const chartData = waterfallData.map((item, index) => {
    if (index === 0) {
      return {
        ...item,
        start: 0,
        end: item.value,
        displayValue: item.value
      };
    }
    
    const prevCumulative = waterfallData[index - 1].cumulative;
    
    if (item.isIntermediate || item.isFinal) {
      return {
        ...item,
        start: 0,
        end: item.cumulative,
        displayValue: item.cumulative
      };
    }
    
    return {
      ...item,
      start: item.isPositive ? prevCumulative : prevCumulative + item.value,
      end: item.isPositive ? prevCumulative + item.value : prevCumulative,
      displayValue: Math.abs(item.value)
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2" color={data.isPositive ? 'success.main' : 'error.main'}>
            {formatCurrency(data.displayValue)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.detail}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  const CustomBar = (props: any) => {
    const { fill, x, y, width, height, payload } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          opacity={payload.isIntermediate || payload.isFinal ? 1 : 0.8}
          stroke={payload.isIntermediate || payload.isFinal ? '#000' : 'none'}
          strokeWidth={payload.isIntermediate || payload.isFinal ? 2 : 0}
        />
        {/* Ajouter une ligne de connexion pour les étapes non-intermédiaires */}
        {!payload.isIntermediate && !payload.isFinal && props.index > 0 && (
          <line
            x1={x}
            y1={payload.isPositive ? y + height : y}
            x2={x - 5}
            y2={payload.isPositive ? y + height : y}
            stroke="#666"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </g>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cascade fiscale - Vue Waterfall
      </Typography>
      
      <Paper sx={{ p: 2 }}>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 80, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
              domain={[0, 'dataMax']}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" />
            
            <Bar 
              dataKey="end"
              fill="#8884d8"
              shape={<CustomBar />}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Légende personnalisée */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50' }} />
            <Typography variant="caption">Revenus</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#ff9800' }} />
            <Typography variant="caption">Charges</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#f44336' }} />
            <Typography variant="caption">Salaires</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#9c27b0' }} />
            <Typography variant="caption">Impôts</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#03a9f4', border: '2px solid #000' }} />
            <Typography variant="caption">Étapes clés</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Synthèse Net dans ma poche */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'success.light' }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'success.dark' }}>
          💰 Net dans ma poche
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Salaire net après charges
            </Typography>
            <Typography variant="h6">
              {formatCurrency(data.salaire.netAvantImpot)}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ alignSelf: 'center' }}>+</Typography>
          
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Dividendes nets après prélèvements
            </Typography>
            <Typography variant="h6">
              {formatCurrency(data.dividendes.pfu?.netPercu || data.dividendes.baremeProgressif?.netPercu || 0)}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ alignSelf: 'center' }}>=</Typography>
          
          <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              TOTAL NET PERÇU
            </Typography>
            <Typography variant="h4" color="success.dark">
              {formatCurrency(data.synthese.totalNetPercu)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Après toutes charges et impôts
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="body2">
            <strong>Taux de prélèvement global :</strong> {formatPercent(1 - (data.synthese.totalNetPercu / data.comptabilite.caHT))}
          </Typography>
          <Typography variant="body2">
            <strong>Trésorerie restante en société :</strong> {formatCurrency(data.synthese.tresorerieFinale)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};