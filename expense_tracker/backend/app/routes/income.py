from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.finance import Income
from backend.app.utils.auth import token_required
from datetime import datetime

income_bp = Blueprint('income', __name__)

@income_bp.route('/', methods=['GET'])
@token_required
def get_income(current_user):
    incomes = Income.query.filter_by(user_id=current_user.id).order_by(Income.date.desc()).all()
    return jsonify([i.to_dict() for i in incomes]), 200

@income_bp.route('/', methods=['POST'])
@token_required
def add_income(current_user):
    data = request.get_json()
    if not data or not data.get('amount') or not data.get('source'):
        return jsonify({"message": "Amount and source are required"}), 400
        
    new_income = Income(
        user_id=current_user.id,
        amount=float(data['amount']),
        source=data['source'],
        date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')) if data.get('date') else datetime.utcnow()
    )
    db.session.add(new_income)
    db.session.commit()
    return jsonify(new_income.to_dict()), 201

@income_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_income(current_user, id):
    income = Income.query.filter_by(id=id, user_id=current_user.id).first()
    if not income:
        return jsonify({"message": "Income record not found"}), 404
        
    db.session.delete(income)
    db.session.commit()
    return jsonify({"message": "Income record deleted"}), 200
