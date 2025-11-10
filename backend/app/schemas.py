from app import ma
from app.models import User, Project, Bid, Review
from marshmallow import fields

# --- Nested Schemas ---
# Used to show minimal user info inside other objects
class UserPublicSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        fields = ('id', 'username', 'is_freelancer', 'ranking_score')

# --- Main Schemas ---

class ReviewSchema(ma.SQLAlchemyAutoSchema):
    reviewer = fields.Nested(UserPublicSchema)
    reviewee = fields.Nested(UserPublicSchema)
    
    class Meta:
        model = Review
        include_fk = True
        load_instance = True

class BidSchema(ma.SQLAlchemyAutoSchema):
    freelancer = fields.Nested(UserPublicSchema)

    class Meta:
        model = Bid
        include_fk = True
        load_instance = True

class ProjectSchema(ma.SQLAlchemyAutoSchema):
    client = fields.Nested(UserPublicSchema)
    freelancer = fields.Nested(UserPublicSchema)
    bids = fields.Nested(BidSchema, many=True)
    reviews = fields.Nested(ReviewSchema, many=True)

    class Meta:
        model = Project
        include_fk = True
        load_instance = True

class UserSchema(ma.SQLAlchemyAutoSchema):
    # Reviews *received* by this user
    reviews_received = fields.Nested(ReviewSchema, many=True)
    
    class Meta:
        model = User
        load_instance = True
        # Exclude password_hash from all dumps
        exclude = ('password_hash',)
    
    # Use 'password' field for loading, but it maps to 'password_hash' model attribute
    password = fields.String(load_only=True, required=True)