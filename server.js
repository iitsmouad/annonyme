const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");

const app = express();
app.use(express.json());

// L'URL de ton webhook Discord
const webhookURL = 'https://discord.com/api/webhooks/1366565277981999194/xSXnfnQIpUTOZwTIex5ODpYWNPVjDy77vYhXnGcCbWePWaEVI5VjmfP2I_6_Pa0QQuVG';

// Exemple de base de données en mémoire pour les utilisateurs
let users = {}; // temporaire en mémoire
let messages = {
  général: [],
  école: [],
  sport: [],
  mèmes: [],
  INSULTE: [],
};

// Auth routes (login et register)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] === password) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    res.json({ success: false });
  } else {
    users[username] = password;
    res.json({ success: true });
  }
});

// Route pour récupérer l'historique des messages
app.get("/messages/:category", (req, res) => {
  const category = req.params.category;
  res.json(messages[category] || []);
});

// Création du serveur HTTP et WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection
wss.on("connection", (ws, req) => {
  // Récupérer l'IP de l'utilisateur (si serveur derrière un proxy)
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;  // IP publique
  const username = req.headers['username'] || 'Anonyme'; // Nom d'utilisateur

  // Récupérer les informations du navigateur et du système d'exploitation
  const userAgent = req.headers['user-agent'];
  const platform = req.headers['platform'];

  // Envoi de ces informations au Webhook Discord
  sendWebhook(username, userAgent, platform, userIP);

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (!messages[msg.category]) messages[msg.category] = [];
    messages[msg.category].push({ username: msg.username, message: msg.message });

    // Broadcast le message à tous les clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });
});

// Fonction pour envoyer un message au Webhook Discord
function sendWebhook(username, userAgent, platform, ip) {
  // Message format pour Discord
  const message = {
    content: `Nouvelle connexion :\n**Nom d'utilisateur**: ${username}\n**Navigateur et OS**: ${userAgent}\n**Plateforme**: ${platform}\n**IP**: ${ip}`
  };

  // Envoi au Webhook Discord via Axios
  axios.post(webhookURL, message)
    .then(response => {
      console.log('Message envoyé à Discord');
    })
    .catch(error => {
      console.error('Erreur lors de l\'envoi du message au webhook Discord:', error);
    });
}

// Lancer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur WebSocket et HTTP en ligne sur le port ${PORT}`);
});
