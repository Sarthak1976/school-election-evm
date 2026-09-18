const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  votes: { type: Number, default: 0 } // Tracks how many votes this specific person got
});

const electionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxSelections: { type: Number, required: true, default: 1 },
  candidates: [candidateSchema],
  isActive: { type: Boolean, default: true },
  totalVotesCast: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Election', electionSchema);