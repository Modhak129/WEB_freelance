from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
cors = CORS()

def create_app(config_class=Config):
    """
    Application factory pattern.
    Initializes the Flask app, extensions, and blueprints.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions with the app
    db.init_app(app)
    ma.init_app(app)
    jwt.init_app(app)
    # Enable CORS for the React frontend
# Allow any origin during development
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Import and register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Add a CLI command to create the database tables
    @app.cli.command("init-db")
    def init_db_command():
        """Initializes the database."""
        with app.app_context():
            db.create_all()
        print("Initialized the database.")

    return app