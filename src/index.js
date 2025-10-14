const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./route/authroute');
const testRoutes = require('./route/testroute');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/agendaApp')
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error(' Erreur MongoDB :', err));

app.use('/api/auth', authRoutes);
app.use('/api', testRoutes);

app.listen(PORT, () => console.log(`🚀 Serveur en ligne : http://localhost:${PORT}`));

