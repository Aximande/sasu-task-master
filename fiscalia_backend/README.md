# FiscalIA Pro - Backend API

Assistant fiscal intelligent spécialisé pour les entrepreneurs français avec SASU.

## 🚀 Architecture

```
fiscalia_backend/
├── app/
│   ├── api/          # Endpoints API (routes)
│   ├── core/         # Configuration et utilitaires core
│   ├── db/           # Configuration base de données
│   ├── models/       # Modèles SQLAlchemy
│   ├── services/     # Logique métier
│   └── utils/        # Fonctions utilitaires
├── tests/            # Tests unitaires et d'intégration
├── alembic/          # Migrations base de données
└── requirements.txt  # Dépendances Python
```

## 🛠️ Stack Technique

- **Framework**: FastAPI
- **Base de données**: PostgreSQL
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Tests**: pytest
- **Migrations**: Alembic

## 📦 Installation

```bash
# Activer l'environnement virtuel
source ../venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur de développement
uvicorn app.main:app --reload
```

## 🏃‍♂️ Développement

```bash
# Tests
pytest

# Migrations
alembic upgrade head

# Documentation API
http://localhost:8000/docs
``` 