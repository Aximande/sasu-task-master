import { calculateCompleteTaxation, TaxInputs, DetailedTaxResults } from './taxCalculator2025';

export interface OptimizationScenario {
  salaireBrut: number;
  dividendes: number;
  totalNetPercu: number;
  totalCharges: number;
  tauxPressionFiscale: number;
  score: number;
  explanation: string;
  recommendations: string[];
  isOptimal?: boolean;
}

export interface OptimizationResults {
  currentScenario: OptimizationScenario;
  optimalScenario: OptimizationScenario;
  alternativeScenarios: OptimizationScenario[];
  savings: number;
  savingsPercent: number;
  globalRecommendations: string[];
  detailedAnalysis: {
    salaireOptimal: number;
    dividendesOptimaux: number;
    rationSalaireDividendes: number;
    breakPoints: {
      minSalaire: number;
      maxSalaireEfficient: number;
      seuilRentabilite: number;
    };
    strategies: StrategyAnalysis[];
  };
}

export interface StrategyAnalysis {
  name: string;
  description: string;
  netGain: number;
  riskLevel: 'low' | 'medium' | 'high';
  implementation: string[];
  legalConsiderations: string[];
  timeHorizon: string;
}

// Contraintes légales et pratiques
const CONSTRAINTS = {
  MIN_SALAIRE_PRESIDENT: 0, // Pas de minimum obligatoire en SASU
  MIN_SALAIRE_RETRAITE: 6000, // Minimum pour valider 4 trimestres retraite
  MIN_SALAIRE_CHOMAGE: 0, // Pas de chômage pour président SASU
  MAX_DIVIDENDES_RATIO: 0.9, // Max 90% du résultat net en dividendes
  SMIC_ANNUEL: 21203, // SMIC 2025
  PASS: 46368, // Plafond annuel Sécu 2025
};

// Fonction objectif : ce qu'on veut maximiser
function calculateObjectiveScore(
  netPercu: number,
  tauxPression: number,
  salaire: number,
  dividendes: number,
  preferences: OptimizationPreferences
): number {
  // Score basé sur plusieurs critères pondérés
  const netScore = netPercu * preferences.weights.netIncome;
  const taxScore = (1 - tauxPression) * 100000 * preferences.weights.taxEfficiency;
  const retraiteScore = Math.min(salaire / CONSTRAINTS.PASS, 1) * 50000 * preferences.weights.retirement;
  const liquidityScore = dividendes * preferences.weights.liquidity;
  const stabilityScore = (salaire / (salaire + dividendes)) * 30000 * preferences.weights.stability;
  
  return netScore + taxScore + retraiteScore + liquidityScore + stabilityScore;
}

export interface OptimizationPreferences {
  objectif: 'max_net' | 'min_taxes' | 'balanced' | 'max_retirement' | 'max_liquidity';
  weights: {
    netIncome: number;
    taxEfficiency: number;
    retirement: number;
    liquidity: number;
    stability: number;
  };
  constraints: {
    minSalaire?: number;
    maxSalaire?: number;
    minDividendes?: number;
    needsRetirement?: boolean;
    prefersPFU?: boolean;
  };
}

// Préférences prédéfinies selon l'objectif
const PREFERENCE_PRESETS: Record<string, OptimizationPreferences['weights']> = {
  max_net: {
    netIncome: 1.0,
    taxEfficiency: 0.6,
    retirement: 0.2,
    liquidity: 0.4,
    stability: 0.2
  },
  min_taxes: {
    netIncome: 0.6,
    taxEfficiency: 1.0,
    retirement: 0.2,
    liquidity: 0.3,
    stability: 0.3
  },
  balanced: {
    netIncome: 0.5,
    taxEfficiency: 0.5,
    retirement: 0.5,
    liquidity: 0.5,
    stability: 0.5
  },
  max_retirement: {
    netIncome: 0.4,
    taxEfficiency: 0.3,
    retirement: 1.0,
    liquidity: 0.2,
    stability: 0.6
  },
  max_liquidity: {
    netIncome: 0.5,
    taxEfficiency: 0.4,
    retirement: 0.1,
    liquidity: 1.0,
    stability: 0.2
  }
};

// Algorithme d'optimisation par recherche intelligente
export function findOptimalDistribution(
  baseInputs: TaxInputs,
  preferences: OptimizationPreferences = {
    objectif: 'balanced',
    weights: PREFERENCE_PRESETS.balanced,
    constraints: {}
  }
): OptimizationResults {
  const resultatDisponible = baseInputs.caHT - baseInputs.chargesExploitation - baseInputs.chargesDeductibles;
  
  // Définir les bornes de recherche
  const minSalaire = Math.max(
    preferences.constraints.minSalaire || 0,
    preferences.constraints.needsRetirement ? CONSTRAINTS.MIN_SALAIRE_RETRAITE : 0
  );
  const maxSalaire = Math.min(
    preferences.constraints.maxSalaire || resultatDisponible * 0.8,
    resultatDisponible * 0.8 // Max 80% en salaire pour garder de la marge
  );

  // Points stratégiques à tester
  const strategicPoints = [
    0, // Tout en dividendes
    CONSTRAINTS.MIN_SALAIRE_RETRAITE, // Minimum retraite
    CONSTRAINTS.SMIC_ANNUEL, // SMIC
    CONSTRAINTS.PASS * 0.5, // 50% PASS
    CONSTRAINTS.PASS, // 1 PASS
    CONSTRAINTS.PASS * 2, // 2 PASS
    CONSTRAINTS.PASS * 3, // 3 PASS
    42500, // Seuil IS 15%
    83823, // Seuil IR 30%
    180294, // Seuil IR 41%
  ].filter(s => s >= minSalaire && s <= maxSalaire);

  // Recherche par dichotomie + points stratégiques
  const scenarios: OptimizationScenario[] = [];
  const testedSalaires = new Set([...strategicPoints]);
  
  // Ajouter des points intermédiaires
  for (let i = 0; i < strategicPoints.length - 1; i++) {
    const mid = (strategicPoints[i] + strategicPoints[i + 1]) / 2;
    testedSalaires.add(Math.round(mid));
  }

  // Recherche fine autour du PASS
  for (let factor = 0.8; factor <= 1.2; factor += 0.05) {
    testedSalaires.add(Math.round(CONSTRAINTS.PASS * factor));
  }

  // Calculer chaque scénario
  for (const salaire of Array.from(testedSalaires).sort((a, b) => a - b)) {
    const inputs: TaxInputs = {
      ...baseInputs,
      salaireBrut: salaire,
      dividendesBruts: 0 // Sera calculé automatiquement
    };

    const results = calculateCompleteTaxation(inputs);
    const dividendes = results.dividendes.montantDistribuable;
    
    const scenario: OptimizationScenario = {
      salaireBrut: salaire,
      dividendes: dividendes,
      totalNetPercu: results.synthese.totalNetPercu,
      totalCharges: results.synthese.totalChargesSociales + results.synthese.totalImpotsTaxes,
      tauxPressionFiscale: results.synthese.tauxPressionFiscale,
      score: calculateObjectiveScore(
        results.synthese.totalNetPercu,
        results.synthese.tauxPressionFiscale,
        salaire,
        dividendes,
        preferences
      ),
      explanation: generateExplanation(salaire, dividendes, results),
      recommendations: generateRecommendations(salaire, dividendes, results, preferences)
    };

    scenarios.push(scenario);
  }

  // Trouver le scénario optimal
  const optimalScenario = scenarios.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  optimalScenario.isOptimal = true;

  // Scénario actuel pour comparaison
  const currentResults = calculateCompleteTaxation(baseInputs);
  const currentScenario: OptimizationScenario = {
    salaireBrut: baseInputs.salaireBrut,
    dividendes: currentResults.dividendes.montantDistribuable,
    totalNetPercu: currentResults.synthese.totalNetPercu,
    totalCharges: currentResults.synthese.totalChargesSociales + currentResults.synthese.totalImpotsTaxes,
    tauxPressionFiscale: currentResults.synthese.tauxPressionFiscale,
    score: calculateObjectiveScore(
      currentResults.synthese.totalNetPercu,
      currentResults.synthese.tauxPressionFiscale,
      baseInputs.salaireBrut,
      currentResults.dividendes.montantDistribuable,
      preferences
    ),
    explanation: "Configuration actuelle",
    recommendations: []
  };

  // Sélectionner les meilleurs scénarios alternatifs
  const alternativeScenarios = scenarios
    .filter(s => s !== optimalScenario)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Analyser les stratégies disponibles
  const strategies = analyzeStrategies(baseInputs, optimalScenario, currentScenario);

  return {
    currentScenario,
    optimalScenario,
    alternativeScenarios,
    savings: optimalScenario.totalNetPercu - currentScenario.totalNetPercu,
    savingsPercent: ((optimalScenario.totalNetPercu - currentScenario.totalNetPercu) / currentScenario.totalNetPercu) * 100,
    globalRecommendations: generateGlobalRecommendations(optimalScenario, currentScenario, preferences),
    detailedAnalysis: {
      salaireOptimal: optimalScenario.salaireBrut,
      dividendesOptimaux: optimalScenario.dividendes,
      rationSalaireDividendes: optimalScenario.salaireBrut / (optimalScenario.salaireBrut + optimalScenario.dividendes),
      breakPoints: {
        minSalaire: minSalaire,
        maxSalaireEfficient: CONSTRAINTS.PASS * 2,
        seuilRentabilite: CONSTRAINTS.PASS
      },
      strategies
    }
  };
}

function generateExplanation(salaire: number, dividendes: number, results: DetailedTaxResults): string {
  const ratio = salaire / (salaire + dividendes + 0.01);
  
  if (ratio === 0) {
    return "Stratégie 100% dividendes : Aucune cotisation retraite mais fiscalité optimale avec le PFU à 30%";
  } else if (ratio < 0.2) {
    return "Stratégie dividendes dominante : Minimise les charges sociales, adapté si pas besoin de droits retraite";
  } else if (ratio < 0.4) {
    return "Stratégie mixte orientée dividendes : Bon compromis entre fiscalité et protection sociale minimale";
  } else if (ratio < 0.6) {
    return "Stratégie équilibrée : Balance optimale entre net perçu, charges sociales et droits sociaux";
  } else if (ratio < 0.8) {
    return "Stratégie mixte orientée salaire : Favorise les droits retraite avec une fiscalité maîtrisée";
  } else if (ratio < 1) {
    return "Stratégie salaire dominante : Maximise les droits sociaux, adapté pour une approche prudente";
  } else {
    return "Stratégie 100% salaire : Maximise la protection sociale et les droits retraite";
  }
}

function generateRecommendations(
  salaire: number, 
  dividendes: number, 
  results: DetailedTaxResults,
  preferences: OptimizationPreferences
): string[] {
  const recommendations: string[] = [];
  
  // Recommandations sur le salaire
  if (salaire < CONSTRAINTS.MIN_SALAIRE_RETRAITE) {
    recommendations.push("⚠️ Salaire insuffisant pour valider 4 trimestres de retraite (minimum 6 000€/an)");
  }
  
  if (salaire > CONSTRAINTS.PASS * 3) {
    recommendations.push("📊 Salaire très élevé : les cotisations au-delà de 3 PASS ont un rendement décroissant");
  }
  
  if (salaire >= CONSTRAINTS.PASS && salaire <= CONSTRAINTS.PASS * 1.2) {
    recommendations.push("✅ Salaire optimal autour d'1 PASS : bon équilibre cotisations/prestations");
  }

  // Recommandations sur les dividendes
  if (dividendes > 0 && results.dividendes.pfu) {
    recommendations.push("💡 PFU appliqué (30%) : fiscalité forfaitaire avantageuse sur les dividendes");
  }
  
  if (dividendes > salaire * 2) {
    recommendations.push("📈 Forte proportion de dividendes : attention à la régularité des distributions");
  }

  // Recommandations sur l'optimisation
  if (results.impotRevenu.tauxMarginal >= 0.30) {
    recommendations.push("🎯 Taux marginal IR élevé : envisager des dispositifs de défiscalisation (PER, etc.)");
  }
  
  if (results.synthese.tauxPressionFiscale > 0.45) {
    recommendations.push("⚡ Pression fiscale élevée : explorer les niches fiscales et crédits d'impôt");
  }

  return recommendations;
}

function generateGlobalRecommendations(
  optimal: OptimizationScenario,
  current: OptimizationScenario,
  preferences: OptimizationPreferences
): string[] {
  const recommendations: string[] = [];
  const gainPotentiel = optimal.totalNetPercu - current.totalNetPercu;
  
  if (gainPotentiel > 1000) {
    recommendations.push(`💰 Gain potentiel de ${Math.round(gainPotentiel)}€ en optimisant la répartition salaire/dividendes`);
  }
  
  if (optimal.salaireBrut < current.salaireBrut && gainPotentiel > 0) {
    recommendations.push(`📉 Réduire le salaire à ${Math.round(optimal.salaireBrut)}€ permettrait d'économiser sur les charges sociales`);
  }
  
  if (optimal.salaireBrut > current.salaireBrut && preferences.constraints.needsRetirement) {
    recommendations.push(`📈 Augmenter le salaire améliorerait vos droits retraite tout en restant fiscalement optimal`);
  }
  
  if (optimal.tauxPressionFiscale < current.tauxPressionFiscale - 0.02) {
    recommendations.push(`🎯 L'optimisation permettrait de réduire le taux de prélèvement de ${((current.tauxPressionFiscale - optimal.tauxPressionFiscale) * 100).toFixed(1)}%`);
  }

  // Recommandations stratégiques
  if (optimal.salaireBrut <= CONSTRAINTS.PASS) {
    recommendations.push("✅ Stratégie PASS : Limiter le salaire à 1 PASS optimise le ratio cotisations/prestations");
  }
  
  if (optimal.dividendes > 0 && optimal.dividendes < 10000) {
    recommendations.push("💡 Pour des petits montants de dividendes, vérifier si le versement vaut les formalités administratives");
  }

  return recommendations;
}

function analyzeStrategies(
  inputs: TaxInputs,
  optimal: OptimizationScenario,
  current: OptimizationScenario
): StrategyAnalysis[] {
  const strategies: StrategyAnalysis[] = [];

  // Stratégie 1: Optimisation pure
  strategies.push({
    name: "Optimisation mathématique",
    description: `Salaire à ${Math.round(optimal.salaireBrut)}€ et dividendes à ${Math.round(optimal.dividendes)}€`,
    netGain: optimal.totalNetPercu - current.totalNetPercu,
    riskLevel: 'low',
    implementation: [
      "Ajuster le salaire lors de la prochaine AG",
      "Voter la distribution de dividendes optimale",
      "Mettre en place un calendrier de versement"
    ],
    legalConsiderations: [
      "Respecter les formalités de modification de rémunération",
      "S'assurer de la capacité distributive de la société",
      "Documenter les décisions en AG"
    ],
    timeHorizon: "Immédiat (prochain exercice)"
  });

  // Stratégie 2: PASS Strategy
  const passInputs = { ...inputs, salaireBrut: CONSTRAINTS.PASS };
  const passResults = calculateCompleteTaxation(passInputs);
  strategies.push({
    name: "Stratégie 1 PASS",
    description: `Limiter le salaire à 1 PASS (${CONSTRAINTS.PASS}€) pour optimiser les cotisations`,
    netGain: passResults.synthese.totalNetPercu - current.totalNetPercu,
    riskLevel: 'low',
    implementation: [
      "Fixer le salaire exactement à 1 PASS",
      "Maximiser les dividendes avec le surplus",
      "Réviser annuellement selon l'évolution du PASS"
    ],
    legalConsiderations: [
      "Validation des 4 trimestres retraite assurée",
      "Cotisations retraite complémentaire optimales",
      "Flexibilité pour ajustements futurs"
    ],
    timeHorizon: "Court terme (1-2 ans)"
  });

  // Stratégie 3: Minimum vital
  const minInputs = { ...inputs, salaireBrut: CONSTRAINTS.MIN_SALAIRE_RETRAITE };
  const minResults = calculateCompleteTaxation(minInputs);
  strategies.push({
    name: "Stratégie minimaliste",
    description: `Salaire minimum pour valider les trimestres (${CONSTRAINTS.MIN_SALAIRE_RETRAITE}€)`,
    netGain: minResults.synthese.totalNetPercu - current.totalNetPercu,
    riskLevel: 'medium',
    implementation: [
      "Réduire le salaire au minimum pour les trimestres",
      "Maximiser les dividendes",
      "Prévoir une épargne retraite complémentaire"
    ],
    legalConsiderations: [
      "Droits retraite minimaux",
      "Pas de couverture chômage (déjà inexistante en SASU)",
      "Nécessité d'une prévoyance personnelle"
    ],
    timeHorizon: "Court terme avec vigilance"
  });

  // Stratégie 4: Progressive
  strategies.push({
    name: "Stratégie progressive",
    description: "Évolution graduelle vers l'optimum sur 3 ans",
    netGain: (optimal.totalNetPercu - current.totalNetPercu) * 0.7, // 70% du gain sur la période
    riskLevel: 'low',
    implementation: [
      "Année 1: Réduire l'écart de 33%",
      "Année 2: Réduire l'écart de 66%", 
      "Année 3: Atteindre l'optimum",
      "Ajuster selon l'évolution de l'activité"
    ],
    legalConsiderations: [
      "Lissage de l'impact fiscal",
      "Adaptation progressive de la trésorerie",
      "Flexibilité pour ajustements"
    ],
    timeHorizon: "Moyen terme (3 ans)"
  });

  return strategies.sort((a, b) => b.netGain - a.netGain);
}

// Fonction pour générer des recommandations LLM-powered
export function generateAIRecommendations(
  optimization: OptimizationResults,
  context: {
    age?: number;
    situationFamiliale?: string;
    objectifsLongTerme?: string[];
    averseRisque?: boolean;
  }
): string[] {
  const recommendations: string[] = [];
  
  // Analyse contextuelle
  if (context.age && context.age < 40) {
    recommendations.push("🎯 À votre âge, privilégier une stratégie mixte permet de construire des droits retraite tout en optimisant le net perçu");
  } else if (context.age && context.age > 55) {
    recommendations.push("🎯 Proche de la retraite, maximiser le salaire peut être pertinent pour améliorer vos dernières années de cotisation");
  }
  
  if (context.situationFamiliale === 'marié' || context.situationFamiliale === 'pacsé') {
    recommendations.push("💑 En couple, l'optimisation peut inclure des stratégies de répartition des revenus du foyer");
  }
  
  if (context.averseRisque) {
    recommendations.push("🛡️ Profil prudent : privilégier un salaire plus élevé pour la sécurité des droits sociaux");
  }
  
  // Analyse des objectifs
  if (context.objectifsLongTerme?.includes('retraite')) {
    recommendations.push("🏖️ Pour préparer la retraite : combiner salaire optimal (1-2 PASS) + PER pour défiscalisation");
  }
  
  if (context.objectifsLongTerme?.includes('immobilier')) {
    recommendations.push("🏠 Projet immobilier : un salaire régulier facilite l'obtention d'un prêt bancaire");
  }
  
  if (context.objectifsLongTerme?.includes('transmission')) {
    recommendations.push("👨‍👩‍👧 Transmission : les dividendes peuvent être utilisés pour des donations défiscalisées");
  }

  return recommendations;
}

// Export de la fonction principale pour une utilisation simple
export function optimizeTaxes(
  caHT: number,
  chargesExploitation: number,
  chargesDeductibles: number = 0,
  currentSalaire: number = 0,
  preferences?: Partial<OptimizationPreferences>
): OptimizationResults {
  const inputs: TaxInputs = {
    caHT,
    chargesExploitation,
    chargesDeductibles,
    salaireBrut: currentSalaire,
    primesBonus: 0,
    dividendesBruts: 0,
    avantagesNature: 0,
    optionBaremeProgressif: false, // PFU par défaut
    situationFamiliale: 'celibataire',
    nombreEnfants: 0,
    autresRevenusImposables: 0,
    eligibleACRE: false,
    effectifEntreprise: 1
  };

  const fullPreferences: OptimizationPreferences = {
    objectif: preferences?.objectif || 'balanced',
    weights: preferences?.weights || PREFERENCE_PRESETS[preferences?.objectif || 'balanced'],
    constraints: preferences?.constraints || {}
  };

  return findOptimalDistribution(inputs, fullPreferences);
}