import os
from dotenv import load_dotenv

# Flask app secrets
SECRET_KEY="dev_secret_key_1234567890!@#$"
JWT_SECRET_KEY="dev_jwt_secret_key_0987654321!@#$"


load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or "dev_secret_key_1234567890!@#$"
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or "dev_jwt_secret_key_0987654321!@#$"
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False