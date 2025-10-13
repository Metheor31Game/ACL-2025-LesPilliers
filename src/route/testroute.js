const express = require('express');
const router = express.Router();
const Personne = require('../model/personne');

// Route GET /test-bdd
router.get('/test-bdd', async (req, res) => {
	try {
		const personnes = await Personne.find();
		res.json(personnes);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
