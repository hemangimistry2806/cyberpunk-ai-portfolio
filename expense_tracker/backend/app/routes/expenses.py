from flask import Blueprint, request, jsonify
from backend.app.extensions import db
from backend.app.models.finance import Expense
from backend.app.utils.auth import token_required
from datetime import datetime

expenses_bp = Blueprint('expenses', __name__)

@expenses_bp.route('/', methods=['GET'])
@token_required
def get_expenses(current_user):
    expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc()).all()
    return jsonify([e.to_dict() for e in expenses]), 200

@expenses_bp.route('/', methods=['POST'])
@token_required
def add_expense(current_user):
    data = request.get_json()
    if not data or not data.get('amount') or not data.get('category'):
        return jsonify({"message": "Amount and category are required"}), 400
        
    new_expense = Expense(
        user_id=current_user.id,
        amount=float(data['amount']),
        category=data['category'],
        description=data.get('description', ''),
        date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')) if data.get('date') else datetime.utcnow()
    )
    db.session.add(new_expense)
    db.session.commit()
    return jsonify(new_expense.to_dict()), 201

@expenses_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_expense(current_user, id):
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first()
    if not expense:
        return jsonify({"message": "Expense not found"}), 404
        
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted"}), 200
