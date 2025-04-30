const express = require("express");
const http = require("http");
const cors = require("cors");
const WebSocket = require("ws");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

let users = {}; // temporaire en mémoire
let messages = {
  général: [],
  école: [],
  sport: [],
  mèmes: [],
  INSULTE: [],
};

// L'URL de ton webhook Discord
const webhookURL = 'VOTRE_WEBHOOK_DISCORD_URL';

// Auth routes
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

// Message history
app.get("/messages/:category", (req, res) => {
  const category = req.params.category;
  res.json(messages[category] || []);
});

// Création du serveur HTTP + WS
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket
wss.on("connection", (ws, req) => {
  // Récupérer l'IP de l'utilisateur (derrière un proxy ou pas)
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;  // Priorité à l'IP dans le header

  // Nom d'utilisateur envoyé dans le WebSocket
  const username = req.headers['username'] || 'Anonyme'; // Utilisateur par défaut si non défini

  // Envoi du message au Webhook Discord
  sendWebhook(username, userIP);

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (!messages[msg.category]) messages[msg.category] = [];
    messages[msg.category].push({ username: msg.username, message: msg.message });

    // Broadcast à tous
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });
});

// Fonction pour envoyer un message au Webhook Discord avec l'IP v4 et le nom d'utilisateur
function sendWebhook(username, ip) {
  // Nettoyer l'IP si elle vient avec un préfixe (ex: "127.0.0.1, ::ffff:127.0.0.1")
  const cleanIP = ip.split(',')[0].trim();

  const message = {
    content: `Nouvelle connexion :\n**Nom d'utilisateur**: ${username}\n**IP v4**: ${cleanIP}`
  };

  // Envoi via axios
  axios.post(webhookURL, message)
    .then(response => {
      console.log('Message envoyé à Discord');
    })
    .catch(error => {
      console.error('Erreur lors de l\'envoi du message au webhook Discord:', error);
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serveur backend et WebSocket sur le port ${PORT}`);
});
