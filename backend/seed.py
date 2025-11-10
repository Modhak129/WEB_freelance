from app import create_app, db
from app.models import User, Project, Bid, Review
from datetime import datetime

# Create an app context to interact with the database
app = create_app()

def update_user_ranking(user_id):
    """Helper function to recalculate and update a user's ranking."""
    user = User.query.get(user_id)
    if not user or not user.is_freelancer:
        return

    reviews = user.reviews_received.all()
    if not reviews:
        user.ranking_score = 0.0
    else:
        total_rating = sum(r.rating for r in reviews)
        user.ranking_score = round(total_rating / len(reviews), 2)


with app.app_context():
    print("Dropping and recreating all tables...")
    # Drop all tables to start fresh
    db.drop_all()
    # Create tables based on models
    db.create_all()

    # --- Create Users ---
    print("Creating users...")
    
    # Client 1
    u1 = User(
        username='alice_client', 
        email='alice@client.com', 
        is_freelancer=False, 
        bio='I am a project owner looking for top talent.'
    )
    u1.set_password('pass123')
    
    # Client 2
    u2 = User(
        username='bob_manager', 
        email='bob@client.com', 
        is_freelancer=False, 
        bio='Startup manager hiring for multiple roles.'
    )
    u2.set_password('pass123')

    # Client 3
    u_henry = User(
        username='henry_ceo',
        email='henry@ceo.com',
        is_freelancer=False,
        bio='CEO of a new tech startup. Looking for quick, high-quality work.'
    )
    u_henry.set_password('pass123')
    
    # Freelancer 1
    u3 = User(
        username='charlie_dev', 
        email='charlie@dev.com', 
        is_freelancer=True, 
        bio='Senior Python & Flask Developer with 5+ years experience.', 
        skills='Python,Flask,SQLAlchemy,REST API,PostgreSQL'
    )
    u3.set_password('pass123')
    
    # Freelancer 2
    u4 = User(
        username='diana_designer', 
        email='diana@design.com', 
        is_freelancer=True, 
        bio='Creative UI/UX Designer specializing in modern web apps.', 
        skills='React,TailwindCSS,Figma,JavaScript,UI/UX'
    )
    u4.set_password('pass123')

    # Freelancer 3
    u5 = User(
        username='eva_coder', 
        email='eva@dev.com', 
        is_freelancer=True, 
        bio='Full-stack developer, expert in React and Node.js.', 
        skills='React,Node.js,JavaScript,MongoDB'
    )
    u5.set_password('pass123')

    # Freelancer 4
    u_frank = User(
        username='frank_data',
        email='frank@data.com',
        is_freelancer=True,
        bio='Data Scientist with a passion for visualization and machine learning.',
        skills='Python,Pandas,NumPy,Tableau,scikit-learn'
    )
    u_frank.set_password('pass123')
    
    # Freelancer 5
    u_grace = User(
        username='grace_writer',
        email='grace@writer.com',
        is_freelancer=True,
        bio='Professional content writer and editor. Specializing in tech and marketing copy.',
        skills='Copywriting,Editing,SEO,Content Strategy'
    )
    u_grace.set_password('pass123')

    db.session.add_all([u1, u2, u3, u4, u5, u_henry, u_frank, u_grace])
    # We must commit here so the users get their IDs for the foreign keys below
    db.session.commit()
    print("Users created.")

    # --- Create Projects ---
    print("Creating projects...")
    
    # Project 1 (Open) - By Alice
    p1 = Project(
        title='E-commerce Website Backend', 
        description='Need a full backend for my online store. Must use Flask and SQLAlchemy. Responsibilities include API design, database modeling, and user authentication.',
        budget=2500.0, 
        client_id=u1.id, 
        status='open'
    )
                     
    # Project 2 (Open) - By Bob
    p2 = Project(
        title='Mobile App UI/UX Redesign',
        description='Our current app is outdated. Need a complete redesign in Figma and implementation in React. Must be responsive and modern.',
        budget=4000.0, 
        client_id=u2.id, 
        status='open'
    )
                     
    # Project 3 (Completed, to show reviews) - By Alice
    p3 = Project(
        title='Company Blog Setup',
        description='Simple company blog using Flask. This project is finished.',
        budget=500.0, 
        client_id=u1.id, 
        freelancer_id=u3.id, # Assigned to Charlie
        status='completed'
    )

    # Project 4 (In Progress) - By Bob
    p4 = Project(
        title='Data Analysis Dashboard',
        description='Need a data scientist to analyze sales data and build an interactive dashboard in Tableau or PowerBI.',
        budget=3000.0,
        client_id=u2.id,
        freelancer_id=u_frank.id, # Assigned to Frank
        status='in_progress'
    )
    
    # Project 5 (Completed) - By Alice
    p5 = Project(
        title='Website Copywriting',
        description='Need SEO-optimized copy for our new landing page. About 5 pages in total.',
        budget=750.0,
        client_id=u1.id,
        freelancer_id=u_grace.id, # Assigned to Grace
        status='completed'
    )

    # Project 6 (Open) - By Henry
    p6 = Project(
        title='Blog Post Series on AI',
        description='Looking for a writer to create a 5-part blog series on the future of AI in business. Must be well-researched.',
        budget=1000.0,
        client_id=u_henry.id,
        status='open'
    )

    # Project 7 (Cancelled) - By Alice
    p7 = Project(
        title='Old Logo Design (Cancelled)',
        description='We were looking for a logo but decided to go in a different direction. No longer needed.',
        budget=300.0,
        client_id=u1.id,
        status='cancelled'
    )

    db.session.add_all([p1, p2, p3, p4, p5, p6, p7])
    # Commit again to get project IDs
    db.session.commit()
    print("Projects created.")

    # --- Create Bids ---
    print("Creating bids...")
    
    # Bids for P1 (E-commerce Backend)
    b1_1 = Bid(project_id=p1.id, freelancer_id=u3.id, amount=2200.0, proposal='I am a Flask expert and can build this backend efficiently. I have attached my portfolio of similar e-commerce sites.')
    b1_2 = Bid(project_id=p1.id, freelancer_id=u5.id, amount=2400.0, proposal='While my main skill is Node.js, I am also proficient in Python and can deliver this project. My full-stack experience will be valuable.')
                 
    # Bids for P2 (Mobile App Redesign)
    b2_1 = Bid(project_id=p2.id, freelancer_id=u4.id, amount=3800.0, proposal='I have reviewed your current app and have some great ideas for a modern, user-friendly redesign. My quote includes all Figma mockups and the final React implementation.')
    b2_2 = Bid(project_id=p2.id, freelancer_id=u5.id, amount=3500.0, proposal='I am a React developer and can build this UI. I will need you to provide the Figma designs.')

    # Bids for P6 (AI Blog Series)
    b6_1 = Bid(project_id=p6.id, freelancer_id=u_grace.id, amount=950.0, proposal='My specialty is long-form tech content. I can deliver a high-quality, well-researched series for you. See my portfolio for examples.')

    db.session.add_all([b1_1, b1_2, b2_1, b2_2, b6_1])
    
    # --- Create Reviews ---
    print("Creating reviews...")
    
    # Reviews for P3 (Company Blog)
    r3_1 = Review(project_id=p3.id, reviewer_id=u1.id, reviewee_id=u3.id, rating=5, comment='Charlie was fantastic. He delivered the blog on time and the code was very clean and well-documented. Highly recommend!')
    r3_2 = Review(project_id=p3.id, reviewer_id=u3.id, reviewee_id=u1.id, rating=4, comment='Alice was a good client with clear requirements. There were some minor delays in communication, but overall a positive experience.')
                    
    # Reviews for P5 (Website Copywriting)
    r5_1 = Review(project_id=p5.id, reviewer_id=u1.id, reviewee_id=u_grace.id, rating=4, comment='Grace delivered good copy, but it was a day past the deadline. Would probably hire again, but need to be more firm on timelines.')
    r5_2 = Review(project_id=p5.id, reviewer_id=u_grace.id, reviewee_id=u1.id, rating=5, comment='Alice provided an excellent brief and was very clear with her feedback. A pleasure to work with!')
    
    db.session.add_all([r3_1, r3_2, r5_1, r5_2])
    db.session.commit()
    print("Reviews created.")

    # --- Update ranking scores based on new reviews ---
    print("Updating freelancer ranking scores...")
    update_user_ranking(u3.id) # Charlie
    update_user_ranking(u_grace.id) # Grace
    
    # Commit final changes
    db.session.commit()
    
    print("----------------------------------------")
    print("Database has been seeded with test data!")
    print("----------------------------------------")