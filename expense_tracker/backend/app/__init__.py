import os
from flask import Flask
from backend.config.config import config
from backend.app.extensions import db, bcrypt, cors

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    from backend.app.routes.auth import auth_bp
    from backend.app.routes.expenses import expenses_bp
    from backend.app.routes.income import income_bp
    from backend.app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(income_bp, url_prefix='/api/income')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    with app.app_context():
        db.create_all()

    return app
