"""
Database seed script for initial data and testing.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from datetime import datetime, date
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.company import Company
from app.core.security import get_password_hash


def create_test_users(db: Session) -> dict:
    """Create test users."""
    users = {}
    
    # Admin user
    admin = User(
        email="admin@fiscalia.pro",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin FiscalIA",
        is_active=True,
        is_superuser=True,
        is_verified=True,
        subscription_plan="enterprise"
    )
    db.add(admin)
    users['admin'] = admin
    
    # Test user 1 - Entrepreneur
    user1 = User(
        email="jean.dupont@example.com",
        hashed_password=get_password_hash("test123"),
        full_name="Jean Dupont",
        phone="+33612345678",
        is_active=True,
        is_verified=True,
        subscription_plan="pro"
    )
    db.add(user1)
    users['user1'] = user1
    
    # Test user 2 - Freelance
    user2 = User(
        email="marie.martin@example.com",
        hashed_password=get_password_hash("test123"),
        full_name="Marie Martin",
        phone="+33687654321",
        is_active=True,
        is_verified=True,
        subscription_plan="starter"
    )
    db.add(user2)
    users['user2'] = user2
    
    db.commit()
    return users


def create_test_companies(db: Session, users: dict) -> dict:
    """Create test companies."""
    companies = {}
    
    # Company for user1
    company1 = Company(
        user_id=users['user1'].id,
        name="Tech Solutions SASU",
        siren="123456789",
        siret="12345678900001",
        ape_code="6201Z",
        creation_date=date(2022, 1, 15),
        
        address_street="123 Rue de la République",
        address_postal_code="75001",
        address_city="Paris",
        
        vat_number="FR12123456789",
        vat_regime="réel simplifié",
        is_vat_registered=True,
        corporate_tax_regime="IS",
        
        president_first_name="Jean",
        president_last_name="Dupont",
        president_birth_date=date(1985, 3, 20),
        president_remuneration_type="mixed",
        
        share_capital=1000.0,
        number_of_shares=100,
        
        is_active=True
    )
    db.add(company1)
    companies['company1'] = company1
    
    # Company for user2
    company2 = Company(
        user_id=users['user2'].id,
        name="Design Studio SASU",
        siren="987654321",
        siret="98765432100001",
        ape_code="7410Z",
        creation_date=date(2023, 6, 1),
        
        address_street="456 Avenue des Champs",
        address_postal_code="69000",
        address_city="Lyon",
        
        vat_number="FR98987654321",
        vat_regime="franchise",
        is_vat_registered=False,
        corporate_tax_regime="IS",
        
        president_first_name="Marie",
        president_last_name="Martin",
        president_birth_date=date(1990, 7, 12),
        president_remuneration_type="salary",
        
        share_capital=500.0,
        number_of_shares=50,
        
        is_active=True
    )
    db.add(company2)
    companies['company2'] = company2
    
    # Dormant company for user1
    company3 = Company(
        user_id=users['user1'].id,
        name="Old Venture SASU",
        siren="555555555",
        siret="55555555500001",
        ape_code="4690Z",
        creation_date=date(2020, 1, 1),
        
        address_street="789 Boulevard Saint-Michel",
        address_postal_code="33000",
        address_city="Bordeaux",
        
        corporate_tax_regime="IS",
        president_first_name="Jean",
        president_last_name="Dupont",
        
        share_capital=1.0,
        number_of_shares=1,
        
        is_active=False,
        is_dormant=True
    )
    db.add(company3)
    companies['company3'] = company3
    
    db.commit()
    return companies


def seed_database():
    """Seed the database with initial data."""
    print("🌱 Starting database seed...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("⚠️  Database already contains data. Skipping seed.")
            return
        
        # Create test users
        print("Creating test users...")
        users = create_test_users(db)
        print(f"✅ Created {len(users)} test users")
        
        # Create test companies
        print("Creating test companies...")
        companies = create_test_companies(db, users)
        print(f"✅ Created {len(companies)} test companies")
        
        # Print credentials
        print("\n" + "="*50)
        print("🔐 Test Credentials:")
        print("="*50)
        print("\nAdmin:")
        print("  Email: admin@fiscalia.pro")
        print("  Password: admin123")
        print("\nEntrepreneur (Jean Dupont):")
        print("  Email: jean.dupont@example.com")
        print("  Password: test123")
        print("\nFreelance (Marie Martin):")
        print("  Email: marie.martin@example.com")
        print("  Password: test123")
        print("="*50)
        
        print("\n✨ Database seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()