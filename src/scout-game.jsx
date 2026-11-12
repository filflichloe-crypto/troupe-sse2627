import React, { useState } from 'react';

const HOST_EMAIL = 'filflichloe@gmail.com';

export default function ScoutGame() {
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState(null); // 'host' or 'player'
  const [playerName, setPlayerName] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!userEmail) return;

    if (userEmail.trim().toLowerCase() === HOST_EMAIL.toLowerCase()) {
      setRole('host');
    } else {
      setRole('player');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconBox}>⚜️</div>
        <h1 style={styles.title}>Troupe Challenges</h1>
        <p style={styles.subtitle}>Daily scout missions, coin rewards, and live troop auctions.</p>

        {!role ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Enter your email to join..."
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Your Name / Patrol Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button}>
              Enter Game
            </button>
          </form>
        ) : role === 'host' ? (
          <div>
            <div style={styles.badgeHost}>Host Mode: {userEmail}</div>
            <h2 style={styles.sectionTitle}>Host Dashboard</h2>
            <p style={styles.text}>Welcome back, leader! You can manage troop missions and auctions here.</p>
            {/* Host Controls Go Here */}
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Player Mode: {playerName} ({userEmail})</div>
            <h2 style={styles.sectionTitle}>Patrol Dashboard</h2>
            <p style={styles.text}>Ready for today's scout missions and challenges?</p>
            {/* Player Dashboard Goes Here */}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#143825',
    display: 'flex',
    alignItem: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: '20px',
  },
  card: {
    background: '#1e4d32',
    border: '2px solid #2e7d51',
    borderRadius: '16px',
    padding: '30px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  iconBox: {
    fontSize: '40px',
    marginBottom: '10px',
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#a3c1ad',
    fontSize: '14px',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #2e7d51',
    background: '#123320',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
  },
  button: {
    background: '#ffffff',
    color: '#143825',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '20px',
    marginBottom: '10px',
  },
  text: {
    color: '#c2d6cb',
    fontSize: '14px',
  },
  badgeHost: {
    background: '#b23b3b',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'inline-block',
  },
  badgePlayer: {
    background: '#2b7ab2',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'inline-block',
  },
};
