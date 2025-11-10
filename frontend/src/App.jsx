import React, { 
  useState, 
  useEffect, 
  createContext, 
  useContext 
} from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  Navigate,
  Outlet
} from 'react-router-dom';

// --- Axios Configuration ---
// Set the base URL for all API requests
axios.defaults.baseURL = 'http://127.0.0.1:5000/api';

// --- Authentication Context ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On initial load, set token from localStorage
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Attempt to fetch user profile to validate token
      axios.get('/user/profile')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token is invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { access_token, user } = response.data;

      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return true;
    } catch (error) {
      console.error("Login failed:", error.response?.data?.msg || error.message);
      return false;
    }
  };

  const register = async (username, email, password, is_freelancer) => {
    try {
      await axios.post('/auth/register', { username, email, password, is_freelancer });
      return true;
    } catch (error) {
      console.error("Registration failed:", error.response?.data?.msg || error.message);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const authContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  // Show a loading spinner or screen while validating auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
const useAuth = () => {
  return useContext(AuthContext);
};

// --- Protected Route Component ---
// Wraps routes that require authentication
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // Redirect to the login page
    return <Navigate to="/login" replace />;
  }

  // Render the child route component
  return <Outlet />;
};

// --- Component: NavBar ---
const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-indigo-600">
            FreelanceHub
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/projects" className="text-gray-600 hover:text-indigo-600">
              Browse Projects
            </Link>
            {isAuthenticated ? (
              <>
                {user && !user.is_freelancer && (
                  <Link to="/post-project" className="btn btn-primary">
                    Post Project
                  </Link>
                )}
                <Link to={`/profile/${user.id}`} className="text-gray-600 hover:text-indigo-600">
                  Profile
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-indigo-600">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- Page: HomePage ---
const HomePage = () => {
  return (
    <div className="container py-16 text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
        Find Your Next Big Opportunity
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        The platform that connects talented freelancers with innovative clients.
      </p>
      <div className="space-x-4">
        <Link to="/projects" className="btn btn-primary btn-lg px-8 py-3 text-lg">
          Browse Projects
        </Link>
        <Link to="/post-project" className="btn btn-secondary btn-lg px-8 py-3 text-lg">
          Post a Job
        </Link>
      </div>
    </div>
  );
};

// --- Page: LoginPage ---
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/projects');
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center mt-16">
      <div className="card w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Page: RegisterPage ---
const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const success = await register(username, email, password, isFreelancer);
    if (success) {
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError('Registration failed. Email or username may already exist.');
    }
  };

  return (
    <div className="flex justify-center items-center mt-16">
      <div className="card w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              id="isFreelancer"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              checked={isFreelancer}
              onChange={(e) => setIsFreelancer(e.target.checked)}
            />
            <label htmlFor="isFreelancer" className="ml-2 block text-sm text-gray-900">
              I am a freelancer
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Page: ProjectListPage ---
const ProjectListPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/projects');
        setProjects(response.data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div className="container py-8">Loading projects...</div>;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Open Projects</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <p>No open projects found.</p>
        ) : (
          projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
};

// --- Sub-component: ProjectCard ---
const ProjectCard = ({ project }) => {
  return (
    <div className="card h-full flex flex-col">
      <div className="p-6 grow">
        <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
        <p className="text-gray-600 text-sm mb-4">
          Posted by {project.client.username}
        </p>
        <p className="text-gray-800 font-bold text-lg mb-4">
          Budget: ${project.budget.toLocaleString()}
        </p>
        <p className="text-gray-700 text-sm mb-4">
          {project.description.substring(0, 100)}...
        </p>
      </div>
      <div className="p-6 bg-gray-50">
        <Link 
          to={`/project/${project.id}`} 
          className="btn btn-primary w-full text-center"
        >
          View Details & Bid
        </Link>
      </div>
    </div>
  );
};

// --- Page: ProjectDetailPage ---
const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/project/${id}`);
      setProject(response.data);
    } catch (err) {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/project/${id}/bid`, {
        amount: parseFloat(bidAmount),
        proposal: bidProposal
      });
      // Reset form and refetch project to show new bid
      setBidAmount('');
      setBidProposal('');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to place bid.");
    }
  };

  const handleAcceptBid = async (bidId) => {
    try {
      await axios.post(`/project/${id}/accept_bid`, { bid_id: bidId });
      fetchProject(); // Refetch to show updated status
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to accept bid.");
    }
  };

  if (loading) return <div className="container py-8">Loading project details...</div>;
  if (error) return <div className="container py-8 text-red-500">{error}</div>;
  if (!project) return null;

  const userHasBid = project.bids.some(bid => bid.freelancer.id === user?.id);
  const isClient = user?.id === project.client.id;
  const isFreelancer = user?.is_freelancer;

  return (
    <div className="container py-8">
      <div className="card p-8">
        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-4 ${
          project.status === 'open' ? 'bg-green-100 text-green-800' :
          project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <p className="text-gray-600 text-sm mb-4">
          Client: {project.client.username}
        </p>
        <p className="text-2xl font-bold text-gray-900 mb-6">
          Budget: ${project.budget.toLocaleString()}
        </p>
        <div className="prose max-w-none">
          <p>{project.description}</p>
        </div>
      </div>

      {/* --- Bids Section --- */}
      <div className="card p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Bids ({project.bids.length})</h2>
        <div className="space-y-4">
          {project.bids.length === 0 ? (
            <p>No bids placed yet.</p>
          ) : (
            project.bids.map(bid => (
              <div key={bid.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold">
                      {bid.freelancer.username}
                    </p>
                    <p className="text-xl font-bold text-indigo-600">
                      ${bid.amount.toLocaleString()}
                    </p>
                  </div>
                  {isClient && project.status === 'open' && (
                    <button 
                      onClick={() => handleAcceptBid(bid.id)}
                      className="btn btn-primary"
                    >
                      Accept Bid
                    </button>
                  )}
                </div>
                <p className="mt-4 text-gray-700">{bid.proposal}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Place Bid Form --- */}
      {isAuthenticated && isFreelancer && project.status === 'open' && !userHasBid && (
        <div className="card p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">Place Your Bid</h2>
          <form onSubmit={handleBidSubmit} className="space-y-4">
            <div>
              <label className="form-label">Your Bid Amount ($)</label>
              <input
                type="number"
                className="form-input"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
                min="1"
              />
            </div>
            <div>
              <label className="form-label">Proposal</label>
              <textarea
                className="form-input"
                rows="5"
                value={bidProposal}
                onChange={(e) => setBidProposal(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Bid
            </button>
          </form>
        </div>
      )}
      {isAuthenticated && isFreelancer && userHasBid && (
        <p className="text-center mt-8 text-lg font-semibold text-gray-700">
          You have already placed a bid on this project.
        </p>
      )}
    </div>
  );
};

// --- Page: PostProjectPage ---
const PostProjectPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('/projects', {
        title,
        description,
        budget: parseFloat(budget)
      });
      setSuccess('Project posted successfully! Redirecting...');
      setTimeout(() => navigate(`/project/${response.data.id}`), 2000);
    } catch (err) {
      setError('Failed to post project. Please try again.');
    }
  };

  return (
    <div className="container py-8">
      <div className="card max-w-3xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Post a New Project</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="form-label">Project Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="6"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          <div>
            <label className="form-label">Budget ($)</label>
            <input
              type="number"
              className="form-input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              min="1"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Post Project
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Page: UserProfilePage ---
const UserProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');

  const isCurrentUser = currentUser?.id === parseInt(id);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/user/${id}`);
      setProfile(response.data);
      setEditBio(response.data.bio || '');
      setEditSkills(response.data.skills || '');
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/user/profile', {
        bio: editBio,
        skills: editSkills
      });
      setIsEditing(false);
      fetchProfile(); // Refetch to show updated data
    } catch (err) {
      setError('Failed to update profile.');
    }
  };

  if (loading) return <div className="container py-8">Loading profile...</div>;
  if (error) return <div className="container py-8 text-red-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="container py-8">
      <div className="card p-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            <p className="text-lg text-indigo-600">
              {profile.is_freelancer ? 'Freelancer' : 'Client'}
            </p>
            {profile.is_freelancer && (
              <p className="text-2xl font-bold mt-2">
                Rating: {profile.ranking_score.toFixed(1)} / 5.0
              </p>
            )}
          </div>
          {isCurrentUser && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
            >
              Edit Profile
            </button>
          )}
        </div>

        <hr className="my-6" />

        {/* Profile Details */}
        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Bio</h3>
              <p className="text-gray-700">{profile.bio || 'No bio provided.'}</p>
            </div>
            {profile.is_freelancer && (
              <div>
                <h3 className="text-xl font-semibold">Skills</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(profile.skills ? profile.skills.split(',') : []).map((skill, i) => (
                    <span key={i} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {skill.trim()}
                    </span>
                  ))}
                  {!profile.skills && <p className="text-gray-700">No skills listed.</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Edit Profile Form
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="form-label">Bio</label>
              <textarea 
                className="form-input" 
                rows="4"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>
            {profile.is_freelancer && (
              <div>
                <label className="form-label">Skills (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                />
              </div>
            )}
            <div className="flex space-x-4">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews Section */}
      <div className="card p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>
        <div className="space-y-4">
          {profile.reviews_received.length === 0 ? (
            <p>No reviews received yet.</p>
          ) : (
            profile.reviews_received.map(review => (
              <div key={review.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{review.reviewer.username}</span>
                  <span className="text-lg font-bold text-yellow-500">
                    {review.rating} / 5 ★
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <NavBar />
          <main className="grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/project/:id" element={<ProjectDetailPage />} />
              <Route path="/profile/:id" element={<UserProfilePage />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/post-project" element={<PostProjectPage />} />
                {/* Add other protected routes here, e.g., /dashboard, /settings */}
              </Route>

              {/* 404 Not Found */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="bg-gray-800 text-gray-300 py-6 mt-16">
            <div className="container text-center">
              <p>&copy; 2025 FreelanceHub. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// --- Mount the App ---

// We export App for testing purposes, but the main render is above.
export default App;