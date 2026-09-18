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
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.error('MongoDB connection error:', err));


const Election = require('./models/Election');

// --- API ROUTES ---

// 1. Create a new election
app.post('/api/elections', async (req, res) => {
  try {
    const existingElection = await Election.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Case-insensitive exact match
    });

    if (existingElection) {
      return res.status(400).json({ message: "An election with this exact name already exists!" });
    }
    // First, mark all past elections as inactive so only one runs at a time
    await Election.updateMany({}, { isActive: false });

    // Create the new election
    const newElection = new Election({
      name: req.body.name,
      maxSelections: req.body.maxSelections,
      candidates: req.body.candidates,
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
app.get('/api/elections/active', async (req, res) => {
  try {
    const activeElection = await Election.findOne({ isActive: true });
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
app.post('/api/elections/end', async (req, res) => {
  try {
    const activeElection = await Election.findOne({ isActive: true });
    
    if (!activeElection) {
      return res.status(400).json({ message: "No active election to end." });
    }

    activeElection.isActive = false;
    await activeElection.save();

    //Return the ended election so the frontend knows its ID
    res.status(200).json({ message: "Election ended successfully!", election: activeElection });
  } catch (error) {
    console.error("Error ending election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 4. Get all past (inactive) elections
app.get('/api/elections/past', async (req, res) => {
  try {
    // .find({ isActive: false }) grabs ended elections
    // .sort({ createdAt: -1 }) ensures the newest ones appear at the top
    const pastElections = await Election.find({ isActive: false }).sort({ createdAt: -1 });
    res.status(200).json(pastElections);
  } catch (error) {
    console.error("Error fetching past elections:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 5. Delete a past election
app.delete('/api/elections/:id', async (req, res) => {
  try {
    const deletedElection = await Election.findByIdAndDelete(req.params.id);
    if (!deletedElection) {
      return res.status(404).json({ message: "Election not found" });
    }
    res.status(200).json({ message: "Election deleted successfully" });
  } catch (error) {
    console.error("Error deleting election:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 6. Get a specific election by ID
app.get('/api/elections/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
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
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",  // This is where our Vite React app will live
        methods: ["GET", "POST"]
    }
});



// 3. The Socket Connection Hub
io.on('connection', (socket) => {
  console.log('A device connected! ID:', socket.id);

  // --- RELAY 1: Phone unlocks Tablet ---
  socket.on('admin_unlock_tablet', () => {
    console.log('Relaying: Unlock Tablet');
    // Broadcast tells the tablet to unlock
    socket.broadcast.emit('unlock_tablet'); 
  });

  // --- RELAY 2: Phone discards vote (Locks Tablet) ---
  socket.on('admin_discard_vote', () => {
    console.log('Relaying: Discard Vote / Lock Tablet');
    socket.broadcast.emit('lock_tablet');
  });

  // --- RELAY 3: Tablet submits a vote ---
  socket.on('cast_vote', async (selections) => {
    console.log('Vote received for candidates:', selections);
    
    try {
      // 1. Find the currently active election in the database
      const activeElection = await Election.findOne({ isActive: true });
      
      if (activeElection) {
        // 2. Increment the total vote counter
        activeElection.totalVotesCast += 1;
        
        // 3. Loop through the submitted IDs and add 1 vote to each chosen candidate
        selections.forEach(candidateId => {
          // Mongoose allows us to search inside the candidates array by ID
          const candidate = activeElection.candidates.id(candidateId);
          if (candidate) {
            candidate.votes += 1;
          }
        });

        // 4. Save the updated counts back to MongoDB
        await activeElection.save();
        console.log('Vote successfully saved to database!');
      }
    } catch (error) {
      console.error('Error saving vote to database:', error);
    }

    // 5. Tell the phone that the voter is finished
    socket.broadcast.emit('voter_finished');
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

