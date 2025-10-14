const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/agendaApp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(' Connecté à MongoDB');
  } catch (err) {
    console.error('Erreur de connexion à MongoDB :', err);
  }
}

module.exports = connectDB;