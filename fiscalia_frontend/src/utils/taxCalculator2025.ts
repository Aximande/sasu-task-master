/**
 * Calculateur fiscal complet pour SASU - France 2025
 * Basé sur les taux officiels et barèmes progressifs
 */

export interface TaxInputs {
  // Revenus
  caHT: number; // Chiffre d'affaires HT
  chargesExploitation: number; // Charges d'exploitation
  chargesDeductibles: number; // Autres charges déductibles
  
  // Rémunération président
  salaireBrut: number; // Salaire brut annuel
  primesBonus: number; // Primes et bonus
  avantagesNature: number; // Avantages en nature
  
  // Dividendes
  dividendesBruts: number; // Montant des dividendes à distribuer
  optionBaremeProgressif: boolean; // true = barème progressif, false = PFU 30%
  
  // Situation personnelle (pour IR)
  situationFamiliale: 'celibataire' | 'marie' | 'pacse';
  nombreEnfants: number;
  autresRevenusImposables: number; // Autres revenus du foyer
  
  // Options
  eligibleACRE: boolean; // Aide à la création/reprise
  effectifEntreprise: number; // Pour certains seuils
}

export interface DetailedTaxResults {
  // Compte de résultat simplifié
  comptabilite: {
    caHT: number;
    chargesExploitation: number;
    chargesDeductibles: number;
    masseSalariale: number; // Salaire brut + charges patronales
    ebitda: number; // Résultat avant impôts et taxes
    resultatAvantIS: number;
    impotSocietes: number;
    resultatNet: number;
    capaciteDistribution: number; // Ce qui peut être distribué en dividendes
  };
  
  // Détail salaire président
  salaire: {
    brutAnnuel: number;
    chargesPatronales: {
      maladie: number;
      vieillesse: number;
      vieillesseDeplafonnee: number;
      allocFamiliales: number;
      accidentTravail: number;
      retraiteComplementaire: number;
      prevoyance: number;
      formationPro: number;
      taxeApprentissage: number;
      versementTransport: number;
      fnal: number;
      ags: number;
      total: number;
      taux: number;
    };
    chargesSalariales: {
      maladie: number;
      vieillesse: number;
      vieillesseDeplafonnee: number;
      retraiteComplementaire: number;
      prevoyance: number;
      csg: number;
      crds: number;
      total: number;
      taux: number;
    };
    netAvantImpot: number;
    netImposable: number; // Pour calcul IR
    coutTotal: number; // Pour l'entreprise
  };
  
  // Détail IS (Impôt sur les sociétés)
  impotSocietes: {
    beneficeImposable: number;
    tranche15: { base: number; impot: number; };
    tranche25: { base: number; impot: number; };
    totalIS: number;
    tauxEffectif: number;
  };
  
  // Détail dividendes
  dividendes: {
    montantBrut: number;
    montantDistribuable: number; // Min entre souhaité et capacité
    
    // Si PFU (flat tax)
    pfu?: {
      prelevementsSociaux: number; // 17.2%
      impotRevenu: number; // 12.8%
      totalPrelevements: number; // 30%
      netPercu: number;
    };
    
    // Si barème progressif
    baremeProgressif?: {
      abattement40: number;
      baseImposable: number;
      prelevementsSociaux: number; // 17.2%
      csgDeductible: number; // 6.8%
      impotRevenu: number; // Selon tranche
      totalPrelevements: number;
      netPercu: number;
    };
  };
  
  // Impôt sur le revenu global
  impotRevenu: {
    // Revenus catégoriels
    salaires: number;
    dividendes: number;
    autresRevenus: number;
    
    // Calcul quotient familial
    revenuImposable: number;
    nombreParts: number;
    quotientFamilial: number;
    
    // Calcul par tranches
    tranches: Array<{
      limite: number;
      taux: number;
      base: number;
      impot: number;
    }>;
    
    impotBrut: number;
    decoteCelibataire?: number;
    impotNet: number;
    tauxMarginal: number;
    tauxEffectif: number;
  };
  
  // Autres taxes et cotisations
  autresTaxes: {
    cfe: number; // Cotisation Foncière des Entreprises
    cvae: number; // Cotisation sur la Valeur Ajoutée
    formationContinue: number;
    taxeApprentissage: number;
    effortConstruction?: number; // Si > 20 salariés
    total: number;
  };
  
  // Synthèse
  synthese: {
    // Pour l'entreprise
    totalChargesSociales: number;
    totalImpotsTaxes: number;
    tresorerieFinale: number;
    
    // Pour le dirigeant
    remunerationNette: number;
    dividendesNets: number;
    totalNetPercu: number;
    
    // Taux de prélèvement global
    totalPrelevements: number;
    tauxPressionFiscale: number;
    
    // Optimisation
    salaireOptimal: number;
    dividendesOptimaux: number;
    economiesPotentielles: number;
  };
  
  // Comparaisons
  comparaisons: {
    pfuVsProgressif?: {
      economie: number;
      meilleurChoix: 'pfu' | 'progressif';
    };
    salaireVsDividendes: {
      coutSalaire1000: number;
      coutDividende1000: number;
      ratioOptimal: number;
    };
  };
  
  // Validation retraite
  retraite: {
    trimestresValides: number;
    salairePourTrimestres: number;
    manquePourValidation?: number;
  };
}

// Constantes 2025
const SMIC_HORAIRE_2025 = 11.88;
const SMIC_ANNUEL_2025 = SMIC_HORAIRE_2025 * 35 * 52;
const PASS_2025 = 47100; // Plafond Annuel Sécurité Sociale
const PASS_MENSUEL_2025 = 3925;

// Barème IR 2025 (impôt sur revenus 2024)
const BAREME_IR_2025 = [
  { limite: 11497, taux: 0 },
  { limite: 29315, taux: 0.11 },
  { limite: 83823, taux: 0.30 },
  { limite: 180294, taux: 0.41 },
  { limite: Infinity, taux: 0.45 }
];

// Barème IS 2025
const BAREME_IS_2025 = [
  { limite: 42500, taux: 0.15 },
  { limite: Infinity, taux: 0.25 }
];

/**
 * Calcule les charges patronales détaillées
 */
function calculateChargesPatronales(salaireBrut: number, eligible_ACRE: boolean = false): any {
  const tranches = {
    ta: Math.min(salaireBrut, PASS_2025), // Tranche A
    tb: Math.max(0, Math.min(salaireBrut - PASS_2025, PASS_2025 * 3)), // Tranche B (1 à 4 PASS)
    tc: Math.max(0, salaireBrut - PASS_2025 * 4) // Tranche C (4 à 8 PASS)
  };
  
  // Taux 2025 pour président SASU (assimilé salarié cadre)
  const charges = {
    maladie: salaireBrut * 0.1300, // 13%
    vieillesse: tranches.ta * 0.0855, // 8.55% plafonné
    vieillesseDeplafonnee: salaireBrut * 0.0190, // 1.90% déplafonné
    allocFamiliales: salaireBrut < SMIC_ANNUEL_2025 * 3.3 ? salaireBrut * 0.0345 : salaireBrut * 0.0545,
    accidentTravail: salaireBrut * 0.0120, // Taux moyen
    retraiteComplementaire: tranches.ta * 0.0465 + tranches.tb * 0.1295, // AGIRC-ARRCO
    prevoyance: tranches.ta * 0.0076, // 0.76%
    formationPro: salaireBrut * 0.0055, // 0.55%
    taxeApprentissage: salaireBrut * 0.0068, // 0.68%
    versementTransport: salaireBrut * 0.0200, // ~2% (variable selon localité)
    fnal: salaireBrut < SMIC_ANNUEL_2025 * 2.5 ? salaireBrut * 0.0010 : salaireBrut * 0.0050,
    ags: tranches.ta * 0.0015, // 0.15% sur TA
    total: 0,
    taux: 0
  };
  
  // Pas de cotisation chômage pour président SASU
  
  // Application ACRE si éligible (exonération partielle première année)
  if (eligible_ACRE && salaireBrut < 39732) {
    const reduction = salaireBrut < 29799 ? 1 : (39732 - salaireBrut) / (39732 - 29799);
    Object.keys(charges).forEach(key => {
      if (key !== 'total' && key !== 'taux' && 
          ['maladie', 'vieillesse', 'allocFamiliales'].includes(key)) {
        charges[key as keyof typeof charges] *= (1 - reduction * 0.5);
      }
    });
  }
  
  charges.total = Object.values(charges)
    .filter((_, i) => i < Object.keys(charges).length - 2)
    .reduce((sum, val) => sum + val, 0);
  charges.taux = charges.total / salaireBrut;
  
  return charges;
}

/**
 * Calcule les charges salariales détaillées
 */
function calculateChargesSalariales(salaireBrut: number): any {
  const tranches = {
    ta: Math.min(salaireBrut, PASS_2025),
    tb: Math.max(0, Math.min(salaireBrut - PASS_2025, PASS_2025 * 3)),
    tc: Math.max(0, salaireBrut - PASS_2025 * 4)
  };
  
  const charges = {
    maladie: 0, // 0% pour les salariés (tout est patronal maintenant)
    vieillesse: tranches.ta * 0.0690, // 6.90% plafonné
    vieillesseDeplafonnee: salaireBrut * 0.0040, // 0.40% déplafonné
    retraiteComplementaire: tranches.ta * 0.0310 + tranches.tb * 0.0865, // AGIRC-ARRCO
    prevoyance: tranches.ta * 0.0024, // 0.24%
    csg: salaireBrut * 0.98 * 0.092, // CSG 9.2% sur 98% du brut
    crds: salaireBrut * 0.98 * 0.005, // CRDS 0.5% sur 98% du brut
    total: 0,
    taux: 0
  };
  
  charges.total = Object.values(charges)
    .filter((_, i) => i < Object.keys(charges).length - 2)
    .reduce((sum, val) => sum + val, 0);
  charges.taux = charges.total / salaireBrut;
  
  return charges;
}

/**
 * Calcule l'impôt sur les sociétés
 */
function calculateIS(benefice: number): any {
  if (benefice <= 0) {
    return {
      beneficeImposable: benefice,
      tranche15: { base: 0, impot: 0 },
      tranche25: { base: 0, impot: 0 },
      totalIS: 0,
      tauxEffectif: 0
    };
  }
  
  const tranche15Base = Math.min(benefice, BAREME_IS_2025[0].limite);
  const tranche25Base = Math.max(0, benefice - BAREME_IS_2025[0].limite);
  
  return {
    beneficeImposable: benefice,
    tranche15: {
      base: tranche15Base,
      impot: tranche15Base * BAREME_IS_2025[0].taux
    },
    tranche25: {
      base: tranche25Base,
      impot: tranche25Base * BAREME_IS_2025[1].taux
    },
    totalIS: tranche15Base * BAREME_IS_2025[0].taux + tranche25Base * BAREME_IS_2025[1].taux,
    tauxEffectif: (tranche15Base * BAREME_IS_2025[0].taux + tranche25Base * BAREME_IS_2025[1].taux) / benefice
  };
}

/**
 * Calcule l'impôt sur le revenu par tranches
 */
function calculateIR(revenuImposable: number, nombreParts: number): any {
  const quotient = revenuImposable / nombreParts;
  const tranches = [];
  let impotParPart = 0;
  let prevLimite = 0;
  
  for (const bareme of BAREME_IR_2025) {
    const base = Math.min(Math.max(0, quotient - prevLimite), bareme.limite - prevLimite);
    const impot = base * bareme.taux;
    
    if (base > 0) {
      tranches.push({
        limite: bareme.limite,
        taux: bareme.taux,
        base: base * nombreParts,
        impot: impot * nombreParts
      });
      impotParPart += impot;
    }
    
    if (quotient <= bareme.limite) break;
    prevLimite = bareme.limite;
  }
  
  const impotBrut = impotParPart * nombreParts;
  
  // Décote pour célibataires (si applicable)
  let decoteCelibataire = 0;
  if (nombreParts === 1 && impotBrut < 1929) {
    decoteCelibataire = Math.min(873 - impotBrut * 0.4525, impotBrut);
  }
  
  const impotNet = Math.max(0, impotBrut - decoteCelibataire);
  
  // Déterminer la tranche marginale
  let tauxMarginal = 0;
  for (const bareme of BAREME_IR_2025) {
    if (quotient <= bareme.limite) {
      tauxMarginal = bareme.taux;
      break;
    }
  }
  
  return {
    revenuImposable,
    nombreParts,
    quotientFamilial: quotient,
    tranches,
    impotBrut,
    decoteCelibataire: decoteCelibataire > 0 ? decoteCelibataire : undefined,
    impotNet,
    tauxMarginal,
    tauxEffectif: revenuImposable > 0 ? impotNet / revenuImposable : 0
  };
}

/**
 * Calcule le nombre de parts fiscales
 */
function calculateNombreParts(situation: string, enfants: number): number {
  let parts = situation === 'celibataire' ? 1 : 2;
  
  // Parts supplémentaires pour enfants
  if (enfants === 1) parts += 0.5;
  else if (enfants === 2) parts += 1;
  else if (enfants > 2) parts += 1 + (enfants - 2);
  
  return parts;
}

/**
 * Calcule les autres taxes
 */
function calculateAutresTaxes(caHT: number, masseSalariale: number, effectif: number): any {
  return {
    cfe: Math.min(caHT * 0.001, 3000), // Estimation CFE
    cvae: caHT > 500000 ? (caHT - 500000) * 0.0075 : 0, // CVAE si CA > 500k
    formationContinue: masseSalariale * (effectif < 11 ? 0.0055 : 0.01),
    taxeApprentissage: masseSalariale * 0.0068,
    effortConstruction: effectif >= 20 ? masseSalariale * 0.0045 : undefined,
    total: 0
  };
}

/**
 * Fonction principale de calcul
 */
export function calculateCompleteTaxation(inputs: TaxInputs): DetailedTaxResults {
  // 1. Calcul salaire et charges
  const chargesPatronales = calculateChargesPatronales(
    inputs.salaireBrut + inputs.primesBonus,
    inputs.eligibleACRE
  );
  const chargesSalariales = calculateChargesSalariales(
    inputs.salaireBrut + inputs.primesBonus
  );
  
  const masseSalariale = inputs.salaireBrut + inputs.primesBonus + chargesPatronales.total;
  const netAvantImpot = inputs.salaireBrut + inputs.primesBonus - chargesSalariales.total;
  const netImposable = netAvantImpot * 0.9 + inputs.avantagesNature; // Abattement 10%
  
  // 2. Calcul résultat comptable
  const ebitda = inputs.caHT - inputs.chargesExploitation - inputs.chargesDeductibles;
  const resultatAvantIS = ebitda - masseSalariale;
  
  // 3. Calcul IS
  const impotSocietes = calculateIS(resultatAvantIS);
  const resultatNet = resultatAvantIS - impotSocietes.totalIS;
  const capaciteDistribution = Math.max(0, resultatNet);
  
  // 4. Calcul dividendes
  const dividendesDistribuables = Math.min(inputs.dividendesBruts, capaciteDistribution);
  
  let dividendesResult: any = {
    montantBrut: inputs.dividendesBruts,
    montantDistribuable: dividendesDistribuables
  };
  
  if (dividendesDistribuables > 0) {
    if (!inputs.optionBaremeProgressif) {
      // PFU (Flat Tax)
      dividendesResult.pfu = {
        prelevementsSociaux: dividendesDistribuables * 0.172,
        impotRevenu: dividendesDistribuables * 0.128,
        totalPrelevements: dividendesDistribuables * 0.30,
        netPercu: dividendesDistribuables * 0.70
      };
    } else {
      // Barème progressif
      const abattement40 = dividendesDistribuables * 0.40;
      const baseImposable = dividendesDistribuables * 0.60;
      const prelevementsSociaux = dividendesDistribuables * 0.172;
      const csgDeductible = dividendesDistribuables * 0.068;
      
      dividendesResult.baremeProgressif = {
        abattement40,
        baseImposable,
        prelevementsSociaux,
        csgDeductible,
        impotRevenu: 0, // Sera calculé avec l'IR global
        totalPrelevements: 0, // Sera mis à jour
        netPercu: 0 // Sera mis à jour
      };
    }
  }
  
  // 5. Calcul IR global
  const nombreParts = calculateNombreParts(inputs.situationFamiliale, inputs.nombreEnfants);
  
  let revenuImposableTotal = netImposable + inputs.autresRevenusImposables;
  
  if (inputs.optionBaremeProgressif && dividendesResult.baremeProgressif) {
    revenuImposableTotal += dividendesResult.baremeProgressif.baseImposable;
    revenuImposableTotal -= dividendesResult.baremeProgressif.csgDeductible;
  }
  
  const impotRevenu = calculateIR(revenuImposableTotal, nombreParts);
  
  // Mise à jour dividendes si barème progressif
  if (dividendesResult.baremeProgressif) {
    // Calcul approximatif de l'IR sur les dividendes
    const irSansDividendes = calculateIR(
      netImposable + inputs.autresRevenusImposables,
      nombreParts
    );
    dividendesResult.baremeProgressif.impotRevenu = 
      impotRevenu.impotNet - irSansDividendes.impotNet;
    dividendesResult.baremeProgressif.totalPrelevements = 
      dividendesResult.baremeProgressif.prelevementsSociaux + 
      dividendesResult.baremeProgressif.impotRevenu;
    dividendesResult.baremeProgressif.netPercu = 
      dividendesDistribuables - dividendesResult.baremeProgressif.totalPrelevements;
  }
  
  // 6. Autres taxes
  const autresTaxes = calculateAutresTaxes(inputs.caHT, masseSalariale, inputs.effectifEntreprise);
  autresTaxes.total = Object.values(autresTaxes)
    .filter(v => typeof v === 'number')
    .reduce((sum: number, val) => (sum as number) + (val as number), 0);
  
  // 7. Calcul retraite
  const salaireMinTrimestre = SMIC_HORAIRE_2025 * 150; // 150h SMIC pour 1 trimestre
  const trimestresValides = Math.min(4, Math.floor((inputs.salaireBrut + inputs.primesBonus) / salaireMinTrimestre));
  
  // 8. Synthèse et comparaisons
  const totalChargesSociales = chargesPatronales.total + chargesSalariales.total;
  const totalImpotsTaxes = impotSocietes.totalIS + autresTaxes.total + 
    (inputs.optionBaremeProgressif ? 0 : (dividendesResult.pfu?.impotRevenu || 0));
  
  const dividendesNets = dividendesResult.pfu?.netPercu || 
    dividendesResult.baremeProgressif?.netPercu || 0;
  
  // Comparaison PFU vs Progressif
  let comparaisonPfuProgressif;
  if (dividendesDistribuables > 0) {
    // Calculer les deux options
    const pfuTotal = dividendesDistribuables * 0.30;
    
    const progressifAbattement = dividendesDistribuables * 0.60;
    const progressifIR = progressifAbattement * impotRevenu.tauxMarginal;
    const progressifTotal = dividendesDistribuables * 0.172 + progressifIR;
    
    comparaisonPfuProgressif = {
      economie: Math.abs(pfuTotal - progressifTotal),
      meilleurChoix: (pfuTotal < progressifTotal ? 'pfu' : 'progressif') as 'pfu' | 'progressif'
    };
  }
  
  // Optimisation salaire/dividendes
  const coutSalaire1000 = 1000 * (1 + chargesPatronales.taux);
  const netSalaire1000 = 1000 * (1 - chargesSalariales.taux) * (1 - impotRevenu.tauxMarginal);
  const coutDividende1000 = 1000; // Après IS
  const netDividende1000 = inputs.optionBaremeProgressif ? 
    1000 * (1 - 0.172 - 0.60 * impotRevenu.tauxMarginal) :
    1000 * 0.70;
  
  // Calcul salaire optimal (simplification)
  const salaireOptimal = Math.max(
    salaireMinTrimestre * 4, // Minimum pour 4 trimestres
    Math.min(PASS_2025, inputs.caHT * 0.25) // Max 1 PASS ou 25% du CA
  );
  
  const results: DetailedTaxResults = {
    comptabilite: {
      caHT: inputs.caHT,
      chargesExploitation: inputs.chargesExploitation,
      chargesDeductibles: inputs.chargesDeductibles,
      masseSalariale,
      ebitda,
      resultatAvantIS,
      impotSocietes: impotSocietes.totalIS,
      resultatNet,
      capaciteDistribution
    },
    
    salaire: {
      brutAnnuel: inputs.salaireBrut + inputs.primesBonus,
      chargesPatronales,
      chargesSalariales,
      netAvantImpot,
      netImposable,
      coutTotal: masseSalariale
    },
    
    impotSocietes,
    dividendes: dividendesResult,
    
    impotRevenu: {
      salaires: netImposable,
      dividendes: inputs.optionBaremeProgressif ? 
        (dividendesResult.baremeProgressif?.baseImposable || 0) : 0,
      autresRevenus: inputs.autresRevenusImposables,
      ...impotRevenu
    },
    
    autresTaxes,
    
    synthese: {
      totalChargesSociales,
      totalImpotsTaxes,
      tresorerieFinale: inputs.caHT - inputs.chargesExploitation - 
        inputs.chargesDeductibles - masseSalariale - 
        impotSocietes.totalIS - autresTaxes.total - dividendesDistribuables,
      remunerationNette: netAvantImpot - impotRevenu.impotNet,
      dividendesNets,
      totalNetPercu: netAvantImpot - impotRevenu.impotNet + dividendesNets,
      totalPrelevements: totalChargesSociales + totalImpotsTaxes + impotRevenu.impotNet,
      tauxPressionFiscale: (totalChargesSociales + totalImpotsTaxes + impotRevenu.impotNet) / inputs.caHT,
      salaireOptimal,
      dividendesOptimaux: Math.max(0, capaciteDistribution * 0.7),
      economiesPotentielles: Math.abs(inputs.salaireBrut - salaireOptimal) * 0.20
    },
    
    comparaisons: {
      pfuVsProgressif: comparaisonPfuProgressif,
      salaireVsDividendes: {
        coutSalaire1000,
        coutDividende1000,
        ratioOptimal: netSalaire1000 / netDividende1000
      }
    },
    
    retraite: {
      trimestresValides,
      salairePourTrimestres: salaireMinTrimestre * 4,
      manquePourValidation: trimestresValides < 4 ? 
        salaireMinTrimestre * 4 - (inputs.salaireBrut + inputs.primesBonus) : undefined
    }
  };
  
  return results;
}