const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Import the new User model
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config(); 
const mongoose = require('mongoose');

const app = express();

// Standard Express Middlewares
app.use(cors({
    origin: ["http://localhost:5173", "https://school-evm.netlify.app"],
    credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.error('MongoDB connection error:', err));


// The Security Bouncer
const authMiddleware = (req, res, next) => {
  // Grab the token from the request header
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  try {
    // Verify the token using your secret key
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.adminId = decoded.id; // Attach the admin's ID to the request
    next(); // Let them pass
  } catch (err) {
    res.status(400).json({ message: "Invalid token." });
  }
};


const Election = require('./models/Election');

// --- API ROUTES ---

// 1. Create a new election
app.post('/api/elections', authMiddleware, async (req, res) => {
  try {
    // Added adminId here so two DIFFERENT schools can both have an election named "Student Council 2026"
    const existingElection = await Election.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      adminId: req.adminId 
    });

    if (existingElection) {
      return res.status(400).json({ message: "You already have an election with this exact name!" });
    }
    // Only deactivate THIS admin's past elections
    await Election.updateMany({ adminId: req.adminId }, { isActive: false });

    // Create the new election
    const newElection = new Election({
      name: req.body.name,
      maxSelections: req.body.maxSelections,
      candidates: req.body.candidates,
      adminId: req.adminId, // Associate the election with the logged-in admin
      isActive: true
    });

    const savedElection = await newElection.save();
    res.status(201).json(savedElection);
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. Get the currently active election
// Added authMiddleware and adminId filter
app.get('/api/elections/active', authMiddleware, async (req, res) => {
  try {
    const activeElection = await Election.findOne({ isActive: true, adminId: req.adminId });
    if (!activeElection) {
      return res.status(404).json({ message: "No active election found" });
    }
    res.status(200).json(activeElection);
  } catch (error) {
    console.error("Error fetching active election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. End the currently active election
app.post('/api/elections/end', authMiddleware, async (req, res) => {
  try {
    const activeElection = await Election.findOne({ isActive: true, adminId: req.adminId });
    
    if (!activeElection) {
      return res.status(400).json({ message: "No active election to end." });
    }

    activeElection.isActive = false;
    await activeElection.save();

    res.status(200).json({ message: "Election ended successfully!", election: activeElection });
  } catch (error) {
    console.error("Error ending election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 4. Get all past (inactive) elections
app.get('/api/elections/past', authMiddleware, async (req, res) => {
  try {
    const pastElections = await Election.find({ isActive: false, adminId: req.adminId }).sort({ createdAt: -1 });
    res.status(200).json(pastElections);
  } catch (error) {
    console.error("Error fetching past elections:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 5. Delete a past election
// Added authMiddleware and switched to findOneAndDelete to enforce ownership
app.delete('/api/elections/:id', authMiddleware, async (req, res) => {
  try {
    const deletedElection = await Election.findOneAndDelete({ _id: req.params.id, adminId: req.adminId });
    if (!deletedElection) {
      return res.status(404).json({ message: "Election not found or you don't have permission to delete it" });
    }
    res.status(200).json({ message: "Election deleted successfully" });
  } catch (error) {
    console.error("Error deleting election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 6. Get a specific election by ID
// Added authMiddleware and ownership check
app.get('/api/elections/:id', authMiddleware, async (req, res) => {
  try {
    const election = await Election.findOne({ _id: req.params.id, adminId: req.adminId });
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }
    res.status(200).json(election);
  } catch (error) {
    console.error("Error fetching election details:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- AUTHENTICATION ROUTES ---

// Register a new Admin
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Login Admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate the security token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.status(200).json({ token, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 1. Wrap Express inside a standard HTTP server
const server = http.createServer(app);

// 2. Attach Socket.io to that HTTP server
const io = require("socket.io")(server, {
    cors: {
        origin: ["http://localhost:5173", "https://school-evm.netlify.app"],
        methods: ["GET", "POST"]
    }
});



// 3. The Socket Connection Hub
// We will update this in Phase 2 so WebSockets are isolated per Admin
// 3. The Socket Connection Hub (Fully Isolated)
io.on('connection', (socket) => {
  console.log('A device connected! ID:', socket.id);

  // 1. Put the socket into a private room based on the Admin's ID
  socket.on('join_admin_room', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.join(decoded.id); // Join a private room
      socket.adminId = decoded.id; // Save the ID to the socket for later
      console.log(`Socket joined private room: ${decoded.id}`);
    } catch (err) {
      console.log('Socket provided invalid token');
    }
  });

  // 2. Unlock ONLY the tablets in this Admin's specific room
  socket.on('admin_unlock_tablet', () => {
    if (socket.adminId) {
      socket.to(socket.adminId).emit('unlock_tablet'); 
    }
  });

  // 3. Lock ONLY the tablets in this Admin's specific room
  socket.on('admin_discard_vote', () => {
    if (socket.adminId) {
      socket.to(socket.adminId).emit('lock_tablet');
    }
  });

  // 4. Save the vote to THIS specific Admin's database entry
  socket.on('cast_vote', async (selections) => {
    if (!socket.adminId) return; // Ignore if they aren't in a room

    try {
      // Find the active election that belongs to THIS specific Admin
      const activeElection = await Election.findOne({ isActive: true, adminId: socket.adminId });
      
      if (activeElection) {
        activeElection.totalVotesCast += 1;
        selections.forEach(candidateId => {
          const candidate = activeElection.candidates.id(candidateId);
          if (candidate) candidate.votes += 1;
        });

        await activeElection.save();
        console.log('Vote successfully saved to isolated database!');
      }
    } catch (error) {
      console.error('Error saving vote:', error);
    }

    // Tell ONLY the phones in this Admin's room that the voter finished
    socket.to(socket.adminId).emit('voter_finished');
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('EVM Brain Server is running!');
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});