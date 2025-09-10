# 🚀 Démarrage Rapide - FiscalIA Pro

## ✅ **État Actuel** 
Système entièrement configuré et fonctionnel avec 313 transactions Qonto réelles !

## 🎯 **Pour Utiliser Immédiatement**

### 1. Vérifier que tout fonctionne
```bash
# Backend
curl http://localhost:8000/api/v1/health/

# Frontend  
curl -I http://localhost:3000

# Stagewise
curl -I http://localhost:3100
```

### 2. Accéder à l'application
- **URL recommandée** : http://localhost:3100/dashboard (avec Stagewise)
- **URL alternative** : http://localhost:3000/dashboard (React direct)

### 3. En cas d'erreur

#### Backend ne répond pas
```bash
cd fiscalia_backend
source ../venv/bin/activate
GOOGLE_SERVICE_ACCOUNT_KEY="/Users/alexandrelavalleeperso/Desktop/code/sasu-task-master/fiscalia_backend/credentials/google-service-account.json" \
QONTO_SHEETS_ID="10u_3D39lHyeHAOkujcR5KEnxfermJhYw9BrQ6DEG3c8" \
uvicorn app.main:app --reload --port 8000
```

#### Frontend ne répond pas
```bash
cd fiscalia_frontend
npm start
```

#### Stagewise ne fonctionne pas
```bash
cd fiscalia_frontend
pkill -f stagewise
stagewise -p 3100 -a 3000
```

## 🏦 **Données Qonto**

- ✅ **313 transactions** depuis décembre 2024
- ✅ **Google Sheets** comme source de vérité
- ✅ **Synchronisation** quotidienne automatique (21h-5h)
- ✅ **Dernière transaction** : STAGEWISE - 20€ (09/09/2025)

## 🇫🇷 **Configuration Fiscale**

- ✅ **Date actuelle** : 10 septembre 2025 (heure de Paris)
- ✅ **Année fiscale** : 2025
- ✅ **Trimestre** : T3 2025
- ✅ **Catégorisation** : Automatique selon règles françaises

## 🛠️ **Fonctionnalités Disponibles**

### Dashboard
- KPI en temps réel (revenus, dépenses, cash flow)
- Graphiques interactifs
- Analyse par catégorie

### Transactions
- Liste complète avec filtres
- Détails par transaction
- Catégorisation automatique

### Analyse Fiscale
- Calculs T3 2025
- Déductions fiscales
- TVA déductible
- Optimisation suggestions

### Prédictions
- Burn rate
- Projections 3 mois
- Recommandations d'économies

---

## 🎉 **Prêt à Développer !**

Ton système FiscalIA Pro est maintenant opérationnel avec :
- ✅ Vraies données Qonto (313 transactions)
- ✅ Interface moderne et responsive
- ✅ Outils IA intégrés (Stagewise)
- ✅ Timezone Paris configurée
- ✅ Tous les services synchronisés

**Va sur http://localhost:3100/dashboard et commence à développer ! 🚀**
