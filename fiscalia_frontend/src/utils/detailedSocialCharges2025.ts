/**
 * Cotisations sociales détaillées SASU président 2025
 * Sources: URSSAF, AGIRC-ARRCO, Service-public.fr
 * Mise à jour: Janvier 2025
 */

// Plafonds 2025
export const PLAFONDS_2025 = {
  SMIC_HORAIRE: 11.88,
  SMIC_ANNUEL: 11.88 * 35 * 52, // 21,631.68€
  PASS_ANNUEL: 47100, // Plafond Annuel Sécurité Sociale
  PASS_MENSUEL: 3925,
  get PASS_TRIMESTRIEL() { return this.PASS_MENSUEL * 3; },
};

// Tranches de salaire
export const TRANCHES = {
  // Tranche A : jusqu'à 1 PASS
  TA: (salaire: number) => Math.min(salaire, PLAFONDS_2025.PASS_ANNUEL),
  // Tranche B : de 1 à 4 PASS
  TB: (salaire: number) => Math.max(0, Math.min(salaire - PLAFONDS_2025.PASS_ANNUEL, PLAFONDS_2025.PASS_ANNUEL * 3)),
  // Tranche C : de 4 à 8 PASS
  TC: (salaire: number) => Math.max(0, salaire - PLAFONDS_2025.PASS_ANNUEL * 4),
  // Tranche 1 : jusqu'à 1 PASS (pour AGIRC-ARRCO)
  T1: (salaire: number) => Math.min(salaire, PLAFONDS_2025.PASS_ANNUEL),
  // Tranche 2 : de 1 à 8 PASS
  T2: (salaire: number) => Math.max(0, Math.min(salaire - PLAFONDS_2025.PASS_ANNUEL, PLAFONDS_2025.PASS_ANNUEL * 7)),
};

export interface CotisationDetail {
  nom: string;
  base: number;
  tauxPatronal: number;
  tauxSalarial: number;
  montantPatronal: number;
  montantSalarial: number;
  plafond?: string;
  explication: string;
}

/**
 * Calcule les cotisations sociales détaillées pour un président de SASU
 * IMPORTANT: Pas de cotisation chômage pour président SASU (assimilé salarié)
 */
export function calculateDetailedSocialCharges(salaireBrut: number): {
  cotisations: CotisationDetail[];
  totaux: {
    chargesPatronales: number;
    chargesSalariales: number;
    tauxPatronal: number;
    tauxSalarial: number;
    totalCharges: number;
    netAvantImpot: number;
    coutTotal: number;
  };
  explications: {
    EBITDA: string;
    netImposable: string;
    differences: string[];
  };
} {
  const cotisations: CotisationDetail[] = [];
  
  // 1. MALADIE-MATERNITÉ-INVALIDITÉ-DÉCÈS
  // Taux réduit si < 2.5 SMIC, sinon taux normal
  const tauxMaladie = salaireBrut < PLAFONDS_2025.SMIC_ANNUEL * 2.5 ? 0.07 : 0.13;
  cotisations.push({
    nom: "Maladie-Maternité-Invalidité-Décès",
    base: salaireBrut,
    tauxPatronal: tauxMaladie,
    tauxSalarial: 0, // Supprimé depuis 2018
    montantPatronal: salaireBrut * tauxMaladie,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: salaireBrut < PLAFONDS_2025.SMIC_ANNUEL * 2.5 
      ? "Taux réduit (7%) car salaire < 2.5 SMIC"
      : "Taux normal (13%) car salaire ≥ 2.5 SMIC"
  });

  // 2. VIEILLESSE DE BASE
  // Partie plafonnée
  const trancheA = TRANCHES.TA(salaireBrut);
  cotisations.push({
    nom: "Vieillesse plafonnée",
    base: trancheA,
    tauxPatronal: 0.0855,
    tauxSalarial: 0.069,
    montantPatronal: trancheA * 0.0855,
    montantSalarial: trancheA * 0.069,
    plafond: `Limité à 1 PASS (${PLAFONDS_2025.PASS_ANNUEL}€)`,
    explication: "Retraite de base Sécurité Sociale - partie plafonnée"
  });

  // Partie déplafonnée
  cotisations.push({
    nom: "Vieillesse déplafonnée",
    base: salaireBrut,
    tauxPatronal: 0.0190,
    tauxSalarial: 0.004,
    montantPatronal: salaireBrut * 0.0190,
    montantSalarial: salaireBrut * 0.004,
    plafond: "Totalité du salaire",
    explication: "Retraite de base Sécurité Sociale - partie déplafonnée"
  });

  // 3. ALLOCATIONS FAMILIALES
  // Taux réduit si < 3.3 SMIC (seuil 2025)
  const tauxAF = salaireBrut < PLAFONDS_2025.SMIC_ANNUEL * 3.3 ? 0.0345 : 0.0545;
  cotisations.push({
    nom: "Allocations familiales",
    base: salaireBrut,
    tauxPatronal: tauxAF,
    tauxSalarial: 0,
    montantPatronal: salaireBrut * tauxAF,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: salaireBrut < PLAFONDS_2025.SMIC_ANNUEL * 3.3
      ? "Taux réduit (3.45%) car salaire < 3.3 SMIC"
      : "Taux normal (5.45%) car salaire ≥ 3.3 SMIC"
  });

  // 4. ACCIDENT DU TRAVAIL (taux moyen bureau)
  cotisations.push({
    nom: "Accident du travail",
    base: salaireBrut,
    tauxPatronal: 0.0084, // Taux moyen pour activité de bureau
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.0084,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "Taux moyen pour activité tertiaire/bureau (varie selon activité)"
  });

  // 5. RETRAITE COMPLÉMENTAIRE AGIRC-ARRCO
  const t1 = TRANCHES.T1(salaireBrut);
  const t2 = TRANCHES.T2(salaireBrut);
  
  // Tranche 1
  if (t1 > 0) {
    cotisations.push({
      nom: "Retraite AGIRC-ARRCO Tranche 1",
      base: t1,
      tauxPatronal: 0.0465,
      tauxSalarial: 0.031,
      montantPatronal: t1 * 0.0465,
      montantSalarial: t1 * 0.031,
      plafond: `Jusqu'à 1 PASS (${PLAFONDS_2025.PASS_ANNUEL}€)`,
      explication: "Retraite complémentaire obligatoire - Tranche 1"
    });
  }

  // Tranche 2
  if (t2 > 0) {
    cotisations.push({
      nom: "Retraite AGIRC-ARRCO Tranche 2",
      base: t2,
      tauxPatronal: 0.1295,
      tauxSalarial: 0.0865,
      montantPatronal: t2 * 0.1295,
      montantSalarial: t2 * 0.0865,
      plafond: `De 1 à 8 PASS (${PLAFONDS_2025.PASS_ANNUEL} à ${PLAFONDS_2025.PASS_ANNUEL * 8}€)`,
      explication: "Retraite complémentaire obligatoire - Tranche 2"
    });
  }

  // 6. CEG (Contribution d'Équilibre Général)
  // Tranche 1
  if (t1 > 0) {
    cotisations.push({
      nom: "CEG Tranche 1",
      base: t1,
      tauxPatronal: 0.0129,
      tauxSalarial: 0.0086,
      montantPatronal: t1 * 0.0129,
      montantSalarial: t1 * 0.0086,
      plafond: `Jusqu'à 1 PASS`,
      explication: "Contribution d'équilibre général AGIRC-ARRCO"
    });
  }

  // Tranche 2
  if (t2 > 0) {
    cotisations.push({
      nom: "CEG Tranche 2",
      base: t2,
      tauxPatronal: 0.0162,
      tauxSalarial: 0.0108,
      montantPatronal: t2 * 0.0162,
      montantSalarial: t2 * 0.0108,
      plafond: `De 1 à 8 PASS`,
      explication: "Contribution d'équilibre général AGIRC-ARRCO"
    });
  }

  // 7. CET (Contribution d'Équilibre Technique) - Si salaire > 1 PASS
  if (salaireBrut > PLAFONDS_2025.PASS_ANNUEL) {
    const baseCET = Math.min(salaireBrut, PLAFONDS_2025.PASS_ANNUEL * 8);
    cotisations.push({
      nom: "CET",
      base: baseCET,
      tauxPatronal: 0.0021,
      tauxSalarial: 0.0014,
      montantPatronal: baseCET * 0.0021,
      montantSalarial: baseCET * 0.0014,
      plafond: `Sur totalité jusqu'à 8 PASS`,
      explication: "Contribution d'équilibre technique (salaire > 1 PASS)"
    });
  }

  // 8. APEC (pour les cadres)
  if (salaireBrut > 0) {
    const baseAPEC = Math.min(salaireBrut, PLAFONDS_2025.PASS_ANNUEL * 4);
    cotisations.push({
      nom: "APEC (Cadres)",
      base: baseAPEC,
      tauxPatronal: 0.00036,
      tauxSalarial: 0.00024,
      montantPatronal: baseAPEC * 0.00036,
      montantSalarial: baseAPEC * 0.00024,
      plafond: `Jusqu'à 4 PASS`,
      explication: "Association pour l'emploi des cadres"
    });
  }

  // 9. PRÉVOYANCE OBLIGATOIRE CADRES
  cotisations.push({
    nom: "Prévoyance cadres",
    base: trancheA,
    tauxPatronal: 0.0076,
    tauxSalarial: 0,
    montantPatronal: trancheA * 0.0076,
    montantSalarial: 0,
    plafond: `Sur Tranche A`,
    explication: "Prévoyance minimale obligatoire cadres (1.50% dont min 0.76% employeur)"
  });

  // 10. CONTRIBUTION AU DIALOGUE SOCIAL
  cotisations.push({
    nom: "Contribution dialogue social",
    base: salaireBrut,
    tauxPatronal: 0.00016,
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.00016,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "Financement des organisations syndicales et patronales"
  });

  // 11. FNAL (Fonds National d'Aide au Logement)
  const tauxFNAL = salaireBrut < PLAFONDS_2025.PASS_ANNUEL ? 0.001 : 0.005;
  cotisations.push({
    nom: "FNAL",
    base: salaireBrut < PLAFONDS_2025.PASS_ANNUEL ? salaireBrut : salaireBrut,
    tauxPatronal: tauxFNAL,
    tauxSalarial: 0,
    montantPatronal: salaireBrut * tauxFNAL,
    montantSalarial: 0,
    plafond: salaireBrut < PLAFONDS_2025.PASS_ANNUEL ? "Plafonné à 1 PASS" : "Totalité",
    explication: "Fonds National d'Aide au Logement"
  });

  // 12. VERSEMENT MOBILITÉ (ex versement transport)
  // Variable selon localisation, on prend 2% pour l'Île-de-France
  cotisations.push({
    nom: "Versement mobilité",
    base: salaireBrut,
    tauxPatronal: 0.02, // 2% en IDF, varie selon localisation
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.02,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "Taux IDF (2%), varie selon localisation entreprise"
  });

  // 13. CONTRIBUTION SOLIDARITÉ AUTONOMIE
  cotisations.push({
    nom: "Solidarité autonomie",
    base: salaireBrut,
    tauxPatronal: 0.003,
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.003,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "Financement de l'autonomie des personnes âgées et handicapées"
  });

  // 14. FORMATION PROFESSIONNELLE
  cotisations.push({
    nom: "Formation professionnelle",
    base: salaireBrut,
    tauxPatronal: 0.0055, // 0.55% pour entreprises < 11 salariés
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.0055,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "0.55% pour entreprises < 11 salariés, 1% au-delà"
  });

  // 15. TAXE D'APPRENTISSAGE
  cotisations.push({
    nom: "Taxe d'apprentissage",
    base: salaireBrut,
    tauxPatronal: 0.0068,
    tauxSalarial: 0,
    montantPatronal: salaireBrut * 0.0068,
    montantSalarial: 0,
    plafond: "Totalité du salaire",
    explication: "0.68% de la masse salariale (0.44% + 0.24% CSA)"
  });

  // 16. AGS (Garantie des salaires) - PAS POUR PRÉSIDENT SASU
  // Le président n'est pas couvert par l'AGS

  // 17. CSG/CRDS (sur 98.25% du salaire brut)
  const baseCSGCRDS = salaireBrut * 0.9825;
  
  // CSG déductible
  cotisations.push({
    nom: "CSG déductible",
    base: baseCSGCRDS,
    tauxPatronal: 0,
    tauxSalarial: 0.068,
    montantPatronal: 0,
    montantSalarial: baseCSGCRDS * 0.068,
    plafond: "98.25% du salaire brut",
    explication: "CSG déductible du revenu imposable"
  });

  // CSG non déductible
  cotisations.push({
    nom: "CSG non déductible",
    base: baseCSGCRDS,
    tauxPatronal: 0,
    tauxSalarial: 0.024,
    montantPatronal: 0,
    montantSalarial: baseCSGCRDS * 0.024,
    plafond: "98.25% du salaire brut",
    explication: "CSG non déductible du revenu imposable"
  });

  // CRDS
  cotisations.push({
    nom: "CRDS",
    base: baseCSGCRDS,
    tauxPatronal: 0,
    tauxSalarial: 0.005,
    montantPatronal: 0,
    montantSalarial: baseCSGCRDS * 0.005,
    plafond: "98.25% du salaire brut",
    explication: "Contribution au remboursement de la dette sociale"
  });

  // CALCUL DES TOTAUX
  const totalChargesPatronales = cotisations.reduce((sum, c) => sum + c.montantPatronal, 0);
  const totalChargesSalariales = cotisations.reduce((sum, c) => sum + c.montantSalarial, 0);
  const coutTotal = salaireBrut + totalChargesPatronales;
  const netAvantImpot = salaireBrut - totalChargesSalariales;

  return {
    cotisations,
    totaux: {
      chargesPatronales: totalChargesPatronales,
      chargesSalariales: totalChargesSalariales,
      tauxPatronal: totalChargesPatronales / salaireBrut,
      tauxSalarial: totalChargesSalariales / salaireBrut,
      totalCharges: totalChargesPatronales + totalChargesSalariales,
      netAvantImpot,
      coutTotal
    },
    explications: {
      EBITDA: "EBITDA = Earnings Before Interest, Taxes, Depreciation & Amortization. " +
              "En français : Résultat avant intérêts, impôts, dépréciation et amortissement. " +
              "C'est le CA HT - charges d'exploitation - charges déductibles AVANT salaires et charges sociales. " +
              "Il représente la capacité de l'entreprise à générer de la trésorerie par son activité opérationnelle.",
      netImposable: "Le net imposable = Net avant impôt - abattement de 10% pour frais professionnels (ou frais réels). " +
                    "C'est la base de calcul de l'impôt sur le revenu.",
      differences: [
        "⚠️ Président SASU = Assimilé salarié MAIS pas de cotisation chômage (Pôle Emploi)",
        "⚠️ Pas d'AGS (garantie des salaires) pour le président",
        "⚠️ Pas de réduction générale (ex-réduction Fillon) pour le président",
        "⚠️ Taux accident du travail varie selon l'activité (0.84% utilisé = taux bureau)",
        "⚠️ Versement mobilité varie selon localisation (2% = taux Île-de-France)"
      ]
    }
  };
}