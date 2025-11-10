from flask import Blueprint, request, jsonify
from app import db
from app.models import User, Project, Bid, Review
from app.schemas import UserSchema, ProjectSchema, BidSchema, ReviewSchema
from werkzeug.security import generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import or_

# Initialize Schemas
user_schema = UserSchema()
users_schema = UserSchema(many=True)
project_schema = ProjectSchema()
projects_schema = ProjectSchema(many=True)
bid_schema = BidSchema()
bids_schema = BidSchema(many=True)
review_schema = ReviewSchema()

# Create Blueprint
api_bp = Blueprint('api', __name__)

# --- Helper Functions ---
def get_user_from_jwt():
    """Helper to get the User object from the JWT token."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)

def update_user_ranking(user_id):
    """Recalculates and updates a user's average ranking score."""
    user = User.query.get(user_id)
    if not user:
        return

    reviews = user.reviews_received.all()
    if not reviews:
        user.ranking_score = 0.0
    else:
        total_rating = sum(r.rating for r in reviews)
        user.ranking_score = round(total_rating / len(reviews), 2)
    
    db.session.commit()

# --- Authentication Routes ---

@api_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first() or \
       User.query.filter_by(username=data['username']).first():
        return jsonify({"msg": "Email or username already exists"}), 400

    new_user = User(
        username=data['username'],
        email=data['email'],
        is_freelancer=data.get('is_freelancer', False)
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return user_schema.dump(new_user), 201

@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()

    if user and user.check_password(data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token, user=user_schema.dump(user)), 200
    
    return jsonify({"msg": "Bad username or password"}), 401

# --- User Routes ---

@api_bp.route('/user/<int:id>', methods=['GET'])
def get_user_profile(id):
    user = User.query.get_or_404(id)
    return user_schema.dump(user), 200

@api_bp.route('/user/profile', methods=['GET', 'PUT'])  # <-- Added 'GET'
@jwt_required()
def my_profile():  # <-- Renamed the function
    # get_user_from_jwt() is our helper to get the logged-in user
    user = get_user_from_jwt() 

    if request.method == 'GET':
        # This is the new logic your frontend needs
        return user_schema.dump(user), 200

    if request.method == 'PUT':
        # This is the original update logic
        data = request.get_json()
        user.bio = data.get('bio', user.bio)
        user.skills = data.get('skills', user.skills)

        db.session.commit()
        return user_schema.dump(user), 200

# --- Project Routes ---

@api_bp.route('/projects', methods=['GET'])
def get_projects():
    skill_query = request.args.get('skill')
    
    query = Project.query.filter_by(status='open')
    
    if skill_query:
        # This is a simple 'like' search. A real app might use a tags table.
        query = query.filter(Project.description.like(f"%{skill_query}%"))
        
    projects = query.order_by(Project.created_at.desc()).all()
    return projects_schema.dump(projects), 200

@api_bp.route('/projects', methods=['POST'])
@jwt_required()
def create_project():
    user = get_user_from_jwt()
    data = request.get_json()
    
    new_project = Project(
        title=data['title'],
        description=data['description'],
        budget=data['budget'],
        client_id=user.id
    )
    
    db.session.add(new_project)
    db.session.commit()
    return project_schema.dump(new_project), 201

@api_bp.route('/project/<int:id>', methods=['GET'])
def get_project(id):
    project = Project.query.get_or_404(id)
    return project_schema.dump(project), 200

@api_bp.route('/project/<int:id>', methods=['PUT'])
@jwt_required()
def update_project(id):
    project = Project.query.get_or_404(id)
    user = get_user_from_jwt()
    
    if project.client_id != user.id:
        return jsonify({"msg": "Not authorized"}), 403
        
    data = request.get_json()
    project.title = data.get('title', project.title)
    project.description = data.get('description', project.description)
    project.budget = data.get('budget', project.budget)
    project.status = data.get('status', project.status)
    
    db.session.commit()
    return project_schema.dump(project), 200

@api_bp.route('/project/<int:id>/accept_bid', methods=['POST'])
@jwt_required()
def accept_bid(id):
    project = Project.query.get_or_404(id)
    user = get_user_from_jwt()
    
    if project.client_id != user.id:
        return jsonify({"msg": "Not authorized"}), 403
        
    if project.status != 'open':
        return jsonify({"msg": "Project is not open for bidding"}), 400
        
    data = request.get_json()
    bid_id = data.get('bid_id')
    bid = Bid.query.get_or_404(bid_id)
    
    if bid.project_id != project.id:
        return jsonify({"msg": "Bid does not belong to this project"}), 400
        
    project.freelancer_id = bid.freelancer_id
    project.status = 'in_progress'
    
    db.session.commit()
    return project_schema.dump(project), 200

# --- Bid Routes ---

@api_bp.route('/project/<int:id>/bid', methods=['POST'])
@jwt_required()
def place_bid(id):
    user = get_user_from_jwt()
    project = Project.query.get_or_404(id)
    
    if not user.is_freelancer:
        return jsonify({"msg": "Only freelancers can bid"}), 403
        
    if project.status != 'open':
        return jsonify({"msg": "Project is not open for bidding"}), 400
        
    # Check if this freelancer has already bid
    existing_bid = Bid.query.filter_by(project_id=id, freelancer_id=user.id).first()
    if existing_bid:
        return jsonify({"msg": "You have already placed a bid on this project"}), 400

    data = request.get_json()
    new_bid = Bid(
        amount=data['amount'],
        proposal=data['proposal'],
        project_id=id,
        freelancer_id=user.id
    )
    
    db.session.add(new_bid)
    db.session.commit()
    return bid_schema.dump(new_bid), 201

# --- Review Routes ---

@api_bp.route('/project/<int:id>/review', methods=['POST'])
@jwt_required()
def post_review(id):
    project = Project.query.get_or_404(id)
    user = get_user_from_jwt()
    data = request.get_json()
    
    if project.status != 'completed':
        return jsonify({"msg": "Project must be completed to leave a review"}), 400
    
    reviewee_id = None
    if user.id == project.client_id:
        reviewee_id = project.freelancer_id
    elif user.id == project.freelancer_id:
        reviewee_id = project.client_id
    else:
        return jsonify({"msg": "You are not part of this project"}), 403
        
    if not reviewee_id:
        return jsonify({"msg": "Cannot review this project (no freelancer assigned)"}), 400

    # Check if a review already exists
    existing_review = Review.query.filter_by(project_id=id, reviewer_id=user.id).first()
    if existing_review:
        return jsonify({"msg": "You have already reviewed this project"}), 400

    new_review = Review(
        rating=data['rating'],
        comment=data.get('comment'),
        project_id=id,
        reviewer_id=user.id,
        reviewee_id=reviewee_id
    )
    
    db.session.add(new_review)
    db.session.commit()
    
    # Update the reviewee's ranking score
    update_user_ranking(reviewee_id)
    
    return review_schema.dump(new_review), 201