from flask import Blueprint, jsonify
from sqlalchemy import func
from backend.app.extensions import db
from backend.app.models.finance import Expense, Income
from backend.app.utils.auth import token_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    total_income = db.session.query(func.sum(Income.amount)).filter_by(user_id=current_user.id).scalar() or 0
    total_expenses = db.session.query(func.sum(Expense.amount)).filter_by(user_id=current_user.id).scalar() or 0
    
    # Category-wise breakdown
    category_data = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter_by(user_id=current_user.id).group_by(Expense.category).all()
    
    categories = [{"category": c, "amount": a} for c, a in category_data]
    
    return jsonify({
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "categories": categories
    }), 200
