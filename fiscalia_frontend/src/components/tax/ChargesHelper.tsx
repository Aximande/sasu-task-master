import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Warning,
  Info,
  Store,
  LocalShipping,
  Computer,
  Home,
  DirectionsCar,
  Restaurant,
  School,
  AccountBalance,
  Phone,
  Flight,
  ShoppingCart,
  Build,
  People,
  AttachMoney,
  Description,
  Help,
} from '@mui/icons-material';

interface ChargeExample {
  categorie: string;
  exemples: string[];
  deductible: boolean;
  taux?: number;
  conditions?: string;
  alerte?: string;
}

const CHARGES_EXPLOITATION: ChargeExample[] = [
  {
    categorie: "Achats de marchandises",
    exemples: [
      "Stock de produits pour revente",
      "Matières premières",
      "Emballages",
      "Fournitures consommables"
    ],
    deductible: true,
    taux: 1,
    conditions: "Directement liés à l'activité"
  },
  {
    categorie: "Services externes",
    exemples: [
      "Sous-traitance opérationnelle",
      "Prestations de services",
      "Locations de matériel",
      "Maintenance équipements"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Loyers et charges locatives",
    exemples: [
      "Loyer bureau/local commercial",
      "Charges de copropriété",
      "Taxe foncière local pro",
      "Location parking professionnel"
    ],
    deductible: true,
    taux: 1,
    conditions: "Local à usage professionnel exclusif"
  },
  {
    categorie: "Énergie et fluides",
    exemples: [
      "Électricité du local",
      "Gaz",
      "Eau",
      "Chauffage"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Assurances professionnelles",
    exemples: [
      "RC Pro obligatoire",
      "Assurance local",
      "Assurance stock",
      "Protection juridique pro"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Frais bancaires",
    exemples: [
      "Tenue de compte pro",
      "Commissions CB",
      "Frais virements",
      "Intérêts emprunts pro"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Marketing et communication",
    exemples: [
      "Publicité en ligne (Google Ads, Facebook)",
      "Site internet",
      "Cartes de visite",
      "Flyers, brochures"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Honoraires",
    exemples: [
      "Expert-comptable",
      "Avocat",
      "Commissaire aux comptes",
      "Consultant"
    ],
    deductible: true,
    taux: 1,
  }
];

const CHARGES_DEDUCTIBLES_AUTRES: ChargeExample[] = [
  {
    categorie: "Frais de véhicule",
    exemples: [
      "Carburant",
      "Entretien véhicule",
      "Assurance auto",
      "Leasing/location"
    ],
    deductible: true,
    taux: 1,
    conditions: "Usage professionnel prouvé (livre de bord)",
    alerte: "⚠️ Véhicule de tourisme : déduction TVA limitée"
  },
  {
    categorie: "Frais de repas",
    exemples: [
      "Repas d'affaires clients",
      "Repas seul hors domicile",
      "Invitations restaurant"
    ],
    deductible: true,
    taux: 0.5,
    conditions: "Repas d'affaires: 100% / Repas seul: différence avec 5,20€",
    alerte: "⚠️ Conservation des justificatifs avec mentions (qui, pourquoi)"
  },
  {
    categorie: "Frais de déplacement",
    exemples: [
      "Train/avion professionnel",
      "Hôtels",
      "Taxis/VTC",
      "Péages"
    ],
    deductible: true,
    taux: 1,
    conditions: "Déplacements professionnels justifiés"
  },
  {
    categorie: "Formation professionnelle",
    exemples: [
      "Formations métier",
      "Certifications",
      "Conférences",
      "Abonnements formations en ligne"
    ],
    deductible: true,
    taux: 1,
    conditions: "En lien direct avec l'activité"
  },
  {
    categorie: "Cadeaux d'affaires",
    exemples: [
      "Cadeaux clients",
      "Objets publicitaires",
      "Coffrets fin d'année"
    ],
    deductible: true,
    taux: 1,
    conditions: "Max 73€ TTC/personne/an pour déduction TVA",
    alerte: "⚠️ Au-delà de 73€ : pas de récup TVA"
  },
  {
    categorie: "Cotisations et adhésions",
    exemples: [
      "Syndicat professionnel",
      "Chambre de commerce",
      "Association professionnelle",
      "Club d'entrepreneurs"
    ],
    deductible: true,
    taux: 1,
  },
  {
    categorie: "Amortissements",
    exemples: [
      "Matériel informatique (>500€)",
      "Mobilier de bureau",
      "Véhicule professionnel",
      "Logiciels"
    ],
    deductible: true,
    taux: 1,
    conditions: "Immobilisations > 500€ HT",
    alerte: "💡 <500€ : charge directe possible"
  },
  {
    categorie: "Provisions",
    exemples: [
      "Provision pour créances douteuses",
      "Provision pour litiges",
      "Provision pour garanties"
    ],
    deductible: true,
    taux: 1,
    conditions: "Risque probable et évaluable"
  }
];

const CHARGES_NON_DEDUCTIBLES: ChargeExample[] = [
  {
    categorie: "Dépenses personnelles",
    exemples: [
      "Vêtements non spécifiques",
      "Dépenses famille",
      "Loisirs personnels",
      "Abonnements perso (Netflix, Spotify...)"
    ],
    deductible: false,
    alerte: "❌ Jamais déductible même si payé par la société"
  },
  {
    categorie: "Amendes et pénalités",
    exemples: [
      "Amendes circulation",
      "Pénalités fiscales",
      "Pénalités sociales",
      "Majorations de retard"
    ],
    deductible: false,
    alerte: "❌ Principe : sanctions non déductibles"
  },
  {
    categorie: "Impôts non déductibles",
    exemples: [
      "Impôt sur les sociétés (IS)",
      "Impôt sur le revenu (IR)",
      "CSG/CRDS non déductible"
    ],
    deductible: false,
  },
  {
    categorie: "Charges somptuaires",
    exemples: [
      "Yacht de plaisance",
      "Résidence de plaisance",
      "Chasse/pêche non professionnelle",
      "Dépenses de luxe excessives"
    ],
    deductible: false,
    alerte: "❌ Article 39-4 du CGI"
  }
];

export const ChargesHelper: React.FC = () => {
  const [expandedPanel, setExpandedPanel] = useState<string>('exploitation');

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedPanel(isExpanded ? panel : '');
  };

  const formatPercent = (taux?: number) => {
    if (!taux) return '';
    if (taux === 1) return '100%';
    return `${(taux * 100).toFixed(0)}%`;
  };

  const ChargesList: React.FC<{ charges: ChargeExample[] }> = ({ charges }) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Catégorie</TableCell>
            <TableCell>Exemples concrets</TableCell>
            <TableCell align="center">Déductible</TableCell>
            <TableCell>Conditions / Alertes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {charges.map((charge, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="subtitle2">{charge.categorie}</Typography>
                {charge.taux && charge.taux < 1 && (
                  <Chip 
                    label={`${formatPercent(charge.taux)} déductible`} 
                    size="small" 
                    color="warning"
                    sx={{ mt: 0.5 }}
                  />
                )}
              </TableCell>
              <TableCell>
                <List dense disablePadding>
                  {charge.exemples.map((ex, i) => (
                    <ListItem key={i} disableGutters>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <Typography variant="body2">•</Typography>
                      </ListItemIcon>
                      <ListItemText 
                        primary={ex} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </TableCell>
              <TableCell align="center">
                {charge.deductible ? (
                  <CheckCircle color="success" />
                ) : (
                  <Warning color="error" />
                )}
              </TableCell>
              <TableCell>
                {charge.conditions && (
                  <Typography variant="caption" display="block">
                    {charge.conditions}
                  </Typography>
                )}
                {charge.alerte && (
                  <Alert severity={charge.deductible ? "warning" : "error"} sx={{ mt: 1, py: 0 }}>
                    <Typography variant="caption">{charge.alerte}</Typography>
                  </Alert>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Principe de base :</strong> Une charge est déductible si elle est :
        </Typography>
        <List dense>
          <ListItem>• Engagée dans l'intérêt de l'entreprise</ListItem>
          <ListItem>• Justifiée par une facture conforme</ListItem>
          <ListItem>• Comptabilisée sur l'exercice concerné</ListItem>
          <ListItem>• Non exclue par la loi (art. 39 CGI)</ListItem>
        </List>
      </Alert>

      <Accordion 
        expanded={expandedPanel === 'exploitation'}
        onChange={handleAccordionChange('exploitation')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Store sx={{ mr: 2 }} />
          <Typography sx={{ flex: 1 }}>
            Charges d'exploitation (100% déductibles)
          </Typography>
          <Chip label="Cœur d'activité" color="success" size="small" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Charges directement liées à votre activité principale. Elles apparaissent dans le compte de résultat.
          </Typography>
          <ChargesList charges={CHARGES_EXPLOITATION} />
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expandedPanel === 'autres'}
        onChange={handleAccordionChange('autres')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <AttachMoney sx={{ mr: 2 }} />
          <Typography sx={{ flex: 1 }}>
            Autres charges déductibles (avec conditions)
          </Typography>
          <Chip label="Vigilance requise" color="warning" size="small" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Charges professionnelles mais nécessitant une attention particulière sur la justification et les limites.
          </Typography>
          <ChargesList charges={CHARGES_DEDUCTIBLES_AUTRES} />
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expandedPanel === 'non-deductibles'}
        onChange={handleAccordionChange('non-deductibles')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Warning sx={{ mr: 2, color: 'error.main' }} />
          <Typography sx={{ flex: 1 }}>
            Charges NON déductibles
          </Typography>
          <Chip label="À exclure" color="error" size="small" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Ces charges ne peuvent JAMAIS être déduites du résultat fiscal, même si payées par l'entreprise.
          </Typography>
          <ChargesList charges={CHARGES_NON_DEDUCTIBLES} />
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          ⚠️ Points de vigilance fiscale :
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Conservation des justificatifs : 10 ans minimum"
              secondary="Factures, relevés bancaires, contrats..."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Principe de territorialité"
              secondary="Charges engagées en France ou pour l'activité française"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Acte anormal de gestion"
              secondary="L'administration peut requalifier des charges excessives ou sans contrepartie"
            />
          </ListItem>
        </List>
      </Box>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Optimisations possibles :
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Charges constatées d'avance"
              secondary="Reporter des charges sur l'exercice suivant si payées d'avance"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Provisions déductibles"
              secondary="Anticiper des charges futures probables et chiffrables"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Abandon de compte courant"
              secondary="Déductible si clause de retour à meilleure fortune"
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};