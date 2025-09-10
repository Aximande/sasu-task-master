# Guide de Démarrage - FiscalIA Pro

Assistant fiscal intelligent spécialisé pour les entrepreneurs français avec SASU.

## 🚀 Architecture Complète

```
sasu-task-master/
├── fiscalia_backend/     # API FastAPI (Port 8000)
├── fiscalia_frontend/    # Interface React (Port 3000)
├── venv/                # Environnement Python
└── PRD.md              # Spécifications du produit
```

## 📋 Prérequis

- Python 3.9+
- Node.js 16+
- npm ou yarn
- Stagewise (pour le développement frontend)

## 🛠️ Installation et Démarrage

### 1. Backend FastAPI

```bash
# Aller dans le répertoire backend
cd fiscalia_backend

# Activer l'environnement virtuel
source ../venv/bin/activate

# Installer les dépendances (si pas déjà fait)
pip install -r requirements.txt

# Lancer le serveur backend
uvicorn app.main:app --reload
```

**✅ Backend disponible sur :** http://localhost:8000
**📚 Documentation API :** http://localhost:8000/api/v1/docs

### 2. Frontend React

```bash
# Aller dans le répertoire frontend
cd fiscalia_frontend

# Installer les dépendances (si pas déjà fait)
npm install

# Lancer l'application React
npm start
```

**✅ Frontend disponible sur :** http://localhost:3000

### 3. Stagewise (Développement Avancé)

```bash
# Installer Stagewise globalement (si pas déjà fait)
npm install -g stagewise

# Dans le répertoire frontend, lancer Stagewise
cd fiscalia_frontend
stagewise -p 3100 -a 3000
```

**✅ Stagewise disponible sur :** http://localhost:3100
*Stagewise enveloppe votre application React avec des outils de développement IA*

## 🔗 Endpoints Principaux

### Backend API (FastAPI)

- **Health Check :** `GET /api/v1/health/`
- **Documentation :** `GET /api/v1/docs`
- **Authentification :** `POST /api/v1/auth/login`
- **Utilisateurs :** `GET /api/v1/users/`
- **Entreprises :** `GET /api/v1/companies/`
- **Documents :** `POST /api/v1/documents/upload`
- **Calculs fiscaux :** `POST /api/v1/tax/calculate`

### Frontend (React)

- **Login :** http://localhost:3000/login
- **Dashboard :** http://localhost:3000/dashboard
- **Inscription :** http://localhost:3000/register

## 🎯 Flux de Développement Recommandé

### Avec Stagewise (Recommandé)

1. **Démarrer le backend** : `uvicorn app.main:app --reload`
2. **Démarrer React** : `npm start` 
3. **Lancer Stagewise** : `stagewise -p 3100 -a 3000`
4. **Développer sur** : http://localhost:3100

### Sans Stagewise (Standard)

1. **Démarrer le backend** : `uvicorn app.main:app --reload`
2. **Démarrer React** : `npm start`
3. **Développer sur** : http://localhost:3000

## ⚙️ Configuration

### Variables d'Environnement Backend

Créer un fichier `.env` dans `fiscalia_backend/` :

```bash
# Base de données
DATABASE_URL="postgresql://user:password@localhost/fiscalia_db"

# Security
SECRET_KEY="your-secret-key-here"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# API Keys
OPENAI_API_KEY="your-openai-key"
QONTO_API_KEY="your-qonto-key"

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS_FILE="credentials/google-service-account.json"
```

### Configuration Frontend

La configuration API est dans `src/config/api.config.ts` :

```typescript
export const API_BASE_URL = 'http://localhost:8000/api/v1';
```

## 🧪 Tests

### Backend

```bash
cd fiscalia_backend
source ../venv/bin/activate
pytest
```

### Frontend

```bash
cd fiscalia_frontend
npm test
```

## 📦 Stack Technique

### Backend
- **Framework :** FastAPI
- **Base de données :** PostgreSQL
- **ORM :** SQLAlchemy
- **Validation :** Pydantic
- **Tests :** pytest
- **Migrations :** Alembic

### Frontend
- **Framework :** React 19
- **UI :** Material-UI (MUI)
- **État :** Zustand
- **Requêtes :** TanStack Query
- **Routing :** React Router
- **Forms :** React Hook Form
- **Charts :** Recharts

## 🚦 Vérification du Statut

```bash
# Vérifier tous les services
echo "Backend:" && curl -s http://localhost:8000/api/v1/health/ | jq
echo "Frontend:" && curl -s -I http://localhost:3000 | head -1
echo "Stagewise:" && curl -s -I http://localhost:3100 | head -1
```

## 🔧 Dépannage

### Backend ne démarre pas
- Vérifier que l'environnement virtuel est activé
- Vérifier les dépendances : `pip install -r requirements.txt`
- Vérifier les logs dans le terminal

### Frontend ne démarre pas
- Vérifier les dépendances : `npm install`
- Vérifier la version de Node.js : `node --version`
- Effacer le cache : `npm start -- --reset-cache`

### Stagewise ne fonctionne pas
- Vérifier l'installation : `stagewise --version`
- Redémarrer React avant Stagewise
- Vérifier les ports disponibles

## 📝 Prochaines Étapes

1. **Configuration de la base de données PostgreSQL**
2. **Mise en place des migrations Alembic**
3. **Intégration des API externes (Qonto, URSSAF)**
4. **Tests d'intégration complets**
5. **Déploiement en production**

---

**✨ Votre environnement de développement FiscalIA Pro est maintenant prêt !**

Pour toute question ou problème, consultez les logs des services respectifs ou la documentation API à l'adresse : http://localhost:8000/api/v1/docs
