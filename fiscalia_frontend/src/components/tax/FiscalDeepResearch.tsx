import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  Stack,
} from '@mui/material';
import {
  Psychology,
  Search,
  Lightbulb,
  TrendingUp,
  Security,
  AccountBalance,
  Family,
  Home,
  School,
  ExpandMore,
  CheckCircle,
  Warning,
  Info,
  EmojiObjects,
  AutoAwesome,
  Insights,
} from '@mui/icons-material';
import { DetailedTaxResults } from '../../utils/taxCalculator2025';
import { OptimizationResults } from '../../utils/taxOptimizer2025';

interface FiscalPersona {
  age: number;
  situationFamiliale: 'celibataire' | 'marie' | 'pacse' | 'divorce';
  nombreEnfants: number;
  objectifsPrincipaux: string[];
  horizonTemporel: string;
  toleranceRisque: 'faible' | 'modere' | 'eleve';
  projetsSpecifiques: string[];
  contraintesSpecifiques: string[];
  experienceFiscale: 'debutant' | 'intermediaire' | 'expert';
  patrimoine: {
    immobilier: boolean;
    epargne: number;
    autresRevenus: number;
  };
}

interface ResearchResult {
  topic: string;
  findings: string[];
  recommendations: string[];
  sources: string[];
  confidence: number;
}

interface DeepResearchReport {
  persona: FiscalPersona;
  strategiesPrincipales: ResearchResult[];
  opportunitesOptimisation: ResearchResult[];
  risquesIdentifies: ResearchResult[];
  planActionDetaille: {
    courtTerme: string[];
    moyenTerme: string[];
    longTerme: string[];
  };
  syntheseExecutive: string;
  scoreOptimisation: number;
}

interface FiscalDeepResearchProps {
  taxResults: DetailedTaxResults;
  optimizationResults?: OptimizationResults;
  onResearchComplete?: (report: DeepResearchReport) => void;
}

export const FiscalDeepResearch: React.FC<FiscalDeepResearchProps> = ({
  taxResults,
  optimizationResults,
  onResearchComplete
}) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchReport, setResearchReport] = useState<DeepResearchReport | null>(null);
  const [persona, setPersona] = useState<Partial<FiscalPersona>>({
    age: 35,
    situationFamiliale: 'celibataire',
    nombreEnfants: 0,
    toleranceRisque: 'modere',
    experienceFiscale: 'intermediaire',
    horizonTemporel: '3-5 ans',
    patrimoine: {
      immobilier: false,
      epargne: 0,
      autresRevenus: 0
    }
  });
  const [showPersonaForm, setShowPersonaForm] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Simulation de recherche approfondie avec LLM
  const conductDeepResearch = async () => {
    setIsResearching(true);
    
    // Simuler un appel API de recherche approfondie
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Générer un rapport basé sur le persona et les résultats fiscaux
    const report = generateDeepResearchReport(persona as FiscalPersona, taxResults, optimizationResults);
    
    setResearchReport(report);
    setIsResearching(false);
    setShowPersonaForm(false);
    
    if (onResearchComplete) {
      onResearchComplete(report);
    }
  };

  // Fonction pour générer le rapport de recherche approfondie
  const generateDeepResearchReport = (
    persona: FiscalPersona,
    taxResults: DetailedTaxResults,
    optimizationResults?: OptimizationResults
  ): DeepResearchReport => {
    const strategiesPrincipales: ResearchResult[] = [];
    const opportunitesOptimisation: ResearchResult[] = [];
    const risquesIdentifies: ResearchResult[] = [];

    // Analyser la situation actuelle
    const tauxPression = taxResults.synthese.tauxPressionFiscale;
    const ratioSalaireDividendes = taxResults.salaire.brutAnnuel / 
      (taxResults.salaire.brutAnnuel + taxResults.dividendes.montantDistribuable + 0.01);

    // Stratégies basées sur l'âge et la situation familiale
    if (persona.age < 35) {
      strategiesPrincipales.push({
        topic: "Stratégie jeune entrepreneur",
        findings: [
          "À votre âge, privilégier la constitution de droits retraite est crucial",
          "Le PER (Plan Épargne Retraite) permet une déduction fiscale jusqu'à 10% des revenus",
          "Les versements volontaires sur l'assurance vieillesse sont possibles"
        ],
        recommendations: [
          "Maintenir un salaire d'au moins 1 PASS pour optimiser les cotisations retraite",
          "Ouvrir un PER individuel avec versements déductibles",
          "Envisager une épargne salariale (PEE/PERCO) si l'entreprise se développe"
        ],
        sources: ["Code de la Sécurité Sociale", "Bulletin Officiel des Finances Publiques"],
        confidence: 0.9
      });
    }

    // Opportunités basées sur la pression fiscale
    if (tauxPression > 0.45) {
      opportunitesOptimisation.push({
        topic: "Réduction de la pression fiscale",
        findings: [
          `Votre taux de pression fiscale de ${(tauxPression * 100).toFixed(1)}% est élevé`,
          "Des dispositifs de défiscalisation sont disponibles",
          "L'optimisation du mix salaire/dividendes peut réduire significativement les charges"
        ],
        recommendations: [
          "Investir dans des dispositifs Pinel ou Denormandie pour l'immobilier locatif",
          "Souscrire à des FIP/FCPI pour une réduction d'IR jusqu'à 25%",
          "Employer un salarié à domicile (crédit d'impôt 50%)",
          optimizationResults ? 
            `Ajuster le salaire à ${formatCurrency(optimizationResults.optimalScenario.salaireBrut)}` :
            "Optimiser la répartition salaire/dividendes"
        ],
        sources: ["Article 199 undecies CGI", "Loi de finances 2025"],
        confidence: 0.85
      });
    }

    // Opportunités spécifiques selon le ratio salaire/dividendes
    if (ratioSalaireDividendes < 0.3) {
      opportunitesOptimisation.push({
        topic: "Équilibrage salaire/dividendes",
        findings: [
          "Votre stratégie privilégie fortement les dividendes",
          "Risque de sous-cotisation pour la retraite",
          "Absence de protection sociale (chômage inexistant en SASU)"
        ],
        recommendations: [
          "Augmenter le salaire pour valider au moins 4 trimestres retraite",
          "Considérer une prévoyance complémentaire privée",
          "Évaluer le coût/bénéfice d'une mutuelle Madelin"
        ],
        sources: ["URSSAF", "Caisse de retraite complémentaire AGIRC-ARRCO"],
        confidence: 0.92
      });
    }

    // Risques identifiés
    if (taxResults.salaire.brutAnnuel < 6000) {
      risquesIdentifies.push({
        topic: "Validation trimestres retraite",
        findings: [
          "Salaire insuffisant pour valider 4 trimestres",
          `Il manque ${formatCurrency(6000 - taxResults.salaire.brutAnnuel)} pour atteindre le seuil`,
          "Impact sur la retraite future"
        ],
        recommendations: [
          "Augmenter immédiatement le salaire au minimum requis",
          "Ou effectuer des versements volontaires retraite",
          "Documenter la situation pour justifier auprès des caisses"
        ],
        sources: ["CNAV", "URSSAF"],
        confidence: 1.0
      });
    }

    // Opportunités selon les objectifs
    if (persona.objectifsPrincipaux?.includes('immobilier')) {
      opportunitesOptimisation.push({
        topic: "Optimisation pour projet immobilier",
        findings: [
          "Un salaire régulier facilite l'obtention de prêt",
          "Les banques privilégient 2-3 ans d'historique de revenus stables",
          "Le taux d'endettement maximum est de 35%"
        ],
        recommendations: [
          "Maintenir un salaire stable d'au moins 2 SMIC pour rassurer les banques",
          "Constituer un apport de 10-20% via les dividendes",
          "Utiliser le PEL ou CEL pour bonifier le taux"
        ],
        sources: ["Banque de France", "HCSF - Haut Conseil de Stabilité Financière"],
        confidence: 0.88
      });
    }

    // Stratégies avancées
    strategiesPrincipales.push({
      topic: "Stratégies fiscales avancées",
      findings: [
        "La holding peut permettre de différer l'imposition des dividendes",
        "Le régime mère-fille exonère 95% des dividendes remontés",
        "L'apport-cession permet de différer la plus-value"
      ],
      recommendations: [
        persona.patrimoine.epargne > 100000 ? 
          "Envisager une structure holding pour optimiser les flux" :
          "La holding devient intéressante au-delà de 100k€ de dividendes annuels",
        "Étudier l'intégration fiscale si plusieurs sociétés",
        "Planifier la transmission avec un pacte Dutreil (-75% droits)"
      ],
      sources: ["Article 145 CGI", "Article 787 B CGI"],
      confidence: 0.75
    });

    // Plan d'action détaillé
    const planActionDetaille = {
      courtTerme: [
        optimizationResults ? 
          `Ajuster immédiatement le salaire à ${formatCurrency(optimizationResults.optimalScenario.salaireBrut)}` :
          "Optimiser la répartition salaire/dividendes",
        "Mettre en place un suivi mensuel des charges déductibles",
        "Ouvrir un PER avec versement initial déductible",
        "Réviser les contrats d'assurance pour optimiser les garanties/coûts"
      ],
      moyenTerme: [
        "Étudier la pertinence d'une holding (6-12 mois)",
        "Mettre en place une épargne salariale si croissance",
        "Investir dans l'immobilier locatif défiscalisant",
        "Optimiser la trésorerie avec des placements court terme"
      ],
      longTerme: [
        "Préparer la transmission d'entreprise (pacte Dutreil)",
        "Constituer un patrimoine immobilier diversifié",
        "Planifier la retraite avec rachats de trimestres si nécessaire",
        "Étudier l'expatriation fiscale si pertinent"
      ]
    };

    // Synthèse executive
    const syntheseExecutive = `
      Votre situation fiscale présente un potentiel d'optimisation ${
        optimizationResults && optimizationResults.savings > 5000 ? 'significatif' : 'modéré'
      }.
      Avec un taux de pression fiscale de ${(tauxPression * 100).toFixed(1)}%, 
      ${tauxPression > 0.45 ? 'des actions immédiates sont recommandées' : 'votre situation est relativement optimisée'}.
      
      Points clés:
      - ${optimizationResults ? `Économie potentielle: ${formatCurrency(optimizationResults.savings)}/an` : 'Optimisation du mix salaire/dividendes recommandée'}
      - ${taxResults.retraite.trimestresValides === 4 ? 'Trimestres retraite validés ✓' : `⚠️ ${taxResults.retraite.trimestresValides}/4 trimestres validés`}
      - Stratégie actuelle: ${ratioSalaireDividendes > 0.7 ? 'Orientée salaire' : ratioSalaireDividendes > 0.3 ? 'Équilibrée' : 'Orientée dividendes'}
      
      Priorités:
      1. ${planActionDetaille.courtTerme[0]}
      2. ${opportunitesOptimisation[0]?.recommendations[0] || 'Maintenir la stratégie actuelle'}
      3. ${risquesIdentifies[0]?.recommendations[0] || 'Surveiller l\'évolution réglementaire'}
    `;

    return {
      persona: persona,
      strategiesPrincipales,
      opportunitesOptimisation,
      risquesIdentifies,
      planActionDetaille,
      syntheseExecutive,
      scoreOptimisation: optimizationResults ? 
        Math.round((1 - (optimizationResults.savings / taxResults.synthese.totalNetPercu)) * 100) : 
        75
    };
  };

  return (
    <Box>
      {/* Formulaire de persona fiscal */}
      {showPersonaForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Psychology sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5">
                  Analyse fiscale approfondie par IA
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Personnalisez votre profil pour des recommandations sur-mesure
                </Typography>
              </Box>
              <Chip 
                icon={<AutoAwesome />}
                label="Deep Research AI" 
                color="primary" 
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Informations personnelles */}
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Informations personnelles
                </Typography>
                
                <TextField
                  label="Âge"
                  type="number"
                  value={persona.age || 35}
                  onChange={(e) => setPersona({...persona, age: parseInt(e.target.value)})}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Situation familiale</InputLabel>
                  <Select
                    value={persona.situationFamiliale || 'celibataire'}
                    onChange={(e) => setPersona({...persona, situationFamiliale: e.target.value as any})}
                  >
                    <MenuItem value="celibataire">Célibataire</MenuItem>
                    <MenuItem value="marie">Marié(e)</MenuItem>
                    <MenuItem value="pacse">Pacsé(e)</MenuItem>
                    <MenuItem value="divorce">Divorcé(e)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Nombre d'enfants"
                  type="number"
                  value={persona.nombreEnfants || 0}
                  onChange={(e) => setPersona({...persona, nombreEnfants: parseInt(e.target.value)})}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel>Tolérance au risque</FormLabel>
                  <RadioGroup
                    value={persona.toleranceRisque || 'modere'}
                    onChange={(e) => setPersona({...persona, toleranceRisque: e.target.value as any})}
                  >
                    <FormControlLabel value="faible" control={<Radio />} label="Faible (sécurité avant tout)" />
                    <FormControlLabel value="modere" control={<Radio />} label="Modérée (équilibre)" />
                    <FormControlLabel value="eleve" control={<Radio />} label="Élevée (maximiser les gains)" />
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* Objectifs et projets */}
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Objectifs et projets
                </Typography>
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel>Objectifs principaux</FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox />}
                      label="Préparer ma retraite"
                      onChange={(e: any) => {
                        const objectifs = persona.objectifsPrincipaux || [];
                        if (e.target.checked) {
                          setPersona({...persona, objectifsPrincipaux: [...objectifs, 'retraite']});
                        } else {
                          setPersona({...persona, objectifsPrincipaux: objectifs.filter(o => o !== 'retraite')});
                        }
                      }}
                    />
                    <FormControlLabel
                      control={<Checkbox />}
                      label="Acheter un bien immobilier"
                      onChange={(e: any) => {
                        const objectifs = persona.objectifsPrincipaux || [];
                        if (e.target.checked) {
                          setPersona({...persona, objectifsPrincipaux: [...objectifs, 'immobilier']});
                        } else {
                          setPersona({...persona, objectifsPrincipaux: objectifs.filter(o => o !== 'immobilier')});
                        }
                      }}
                    />
                    <FormControlLabel
                      control={<Checkbox />}
                      label="Transmettre mon patrimoine"
                      onChange={(e: any) => {
                        const objectifs = persona.objectifsPrincipaux || [];
                        if (e.target.checked) {
                          setPersona({...persona, objectifsPrincipaux: [...objectifs, 'transmission']});
                        } else {
                          setPersona({...persona, objectifsPrincipaux: objectifs.filter(o => o !== 'transmission')});
                        }
                      }}
                    />
                    <FormControlLabel
                      control={<Checkbox />}
                      label="Développer mon entreprise"
                      onChange={(e: any) => {
                        const objectifs = persona.objectifsPrincipaux || [];
                        if (e.target.checked) {
                          setPersona({...persona, objectifsPrincipaux: [...objectifs, 'croissance']});
                        } else {
                          setPersona({...persona, objectifsPrincipaux: objectifs.filter(o => o !== 'croissance')});
                        }
                      }}
                    />
                  </FormGroup>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Horizon temporel</InputLabel>
                  <Select
                    value={persona.horizonTemporel || '3-5 ans'}
                    onChange={(e) => setPersona({...persona, horizonTemporel: e.target.value})}
                  >
                    <MenuItem value="< 1 an">Court terme (< 1 an)</MenuItem>
                    <MenuItem value="1-3 ans">Moyen terme (1-3 ans)</MenuItem>
                    <MenuItem value="3-5 ans">Long terme (3-5 ans)</MenuItem>
                    <MenuItem value="> 5 ans">Très long terme (> 5 ans)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Expérience fiscale</InputLabel>
                  <Select
                    value={persona.experienceFiscale || 'intermediaire'}
                    onChange={(e) => setPersona({...persona, experienceFiscale: e.target.value as any})}
                  >
                    <MenuItem value="debutant">Débutant (besoin de conseils simples)</MenuItem>
                    <MenuItem value="intermediaire">Intermédiaire (notions de base acquises)</MenuItem>
                    <MenuItem value="expert">Expert (stratégies avancées)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={conductDeepResearch}
              disabled={isResearching}
              startIcon={isResearching ? <CircularProgress size={20} /> : <Search />}
              sx={{ py: 1.5 }}
            >
              {isResearching ? 'Analyse en cours... (30 sec)' : 'Lancer l\'analyse approfondie'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rapport de recherche */}
      {researchReport && (
        <Box>
          {/* Synthèse executive */}
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            icon={<Insights />}
          >
            <Typography variant="h6" gutterBottom>
              Synthèse Executive
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {researchReport.syntheseExecutive}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Chip 
                label={`Score d'optimisation: ${researchReport.scoreOptimisation}%`}
                color={researchReport.scoreOptimisation > 80 ? 'success' : 'warning'}
              />
              {optimizationResults && (
                <Chip 
                  label={`Économie potentielle: ${formatCurrency(optimizationResults.savings)}`}
                  color="primary"
                />
              )}
            </Box>
          </Alert>

          {/* Stratégies principales */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <EmojiObjects sx={{ mr: 2, color: 'warning.main' }} />
              <Typography variant="h6">Stratégies principales</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {researchReport.strategiesPrincipales.map((strategy, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      {strategy.topic}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Constats :
                    </Typography>
                    <List dense>
                      {strategy.findings.map((finding, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <Info fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={finding} />
                        </ListItem>
                      ))}
                    </List>

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Recommandations :
                    </Typography>
                    <List dense>
                      {strategy.recommendations.map((rec, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <CheckCircle fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Sources : {strategy.sources.join(', ')}
                      </Typography>
                      <Chip 
                        label={`Confiance: ${(strategy.confidence * 100).toFixed(0)}%`}
                        size="small"
                        color={strategy.confidence > 0.8 ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </AccordionDetails>
          </Accordion>

          {/* Opportunités d'optimisation */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
              <Typography variant="h6">Opportunités d'optimisation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {researchReport.opportunitesOptimisation.map((opp, index) => (
                <Card key={index} sx={{ mb: 2, borderLeft: '4px solid #4caf50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {opp.topic}
                    </Typography>
                    <List dense>
                      {opp.recommendations.map((rec, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <Lightbulb fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ))}
            </AccordionDetails>
          </Accordion>

          {/* Risques identifiés */}
          {researchReport.risquesIdentifies.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Warning sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h6">Risques identifiés</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {researchReport.risquesIdentifies.map((risk, index) => (
                  <Alert key={index} severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {risk.topic}
                    </Typography>
                    {risk.findings.map((finding, i) => (
                      <Typography key={i} variant="body2">
                        • {finding}
                      </Typography>
                    ))}
                  </Alert>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Plan d'action */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
                Plan d'action détaillé
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 2, flex: '1 1 30%' }}>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>
                    Actions immédiates (0-3 mois)
                  </Typography>
                  <List dense>
                    {researchReport.planActionDetaille.courtTerme.map((action, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={`${i+1}. ${action}`} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>

                <Paper sx={{ p: 2, flex: '1 1 30%' }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    Moyen terme (3-12 mois)
                  </Typography>
                  <List dense>
                    {researchReport.planActionDetaille.moyenTerme.map((action, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={`${i+1}. ${action}`} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>

                <Paper sx={{ p: 2, flex: '1 1 30%' }}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    Long terme (1-5 ans)
                  </Typography>
                  <List dense>
                    {researchReport.planActionDetaille.longTerme.map((action, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={`${i+1}. ${action}`} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            </CardContent>
          </Card>

          {/* Bouton pour relancer une analyse */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setShowPersonaForm(true);
                setResearchReport(null);
              }}
              startIcon={<Psychology />}
            >
              Relancer une analyse avec un profil différent
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};