import React, { useState } from 'react';

const HOST_EMAIL = 'filflichloe@gmail.com';

export default function ScoutGame() {
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  
  // Host state
  const [missions, setMissions] = useState([
    { id: 1, title: 'Night Navigation Checkpoint', reward: 50 },
    { id: 2, title: 'Knot-Tying Speed Challenge', reward: 30 }
  ]);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionReward, setNewMissionReward] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!userEmail) return;

    if (userEmail.trim().toLowerCase() === HOST_EMAIL.toLowerCase()) {
      setRole('host');
    } else {
      setRole('player');
    }
  };

  const addMission = (e) => {
    e.preventDefault();
    if (!newMissionTitle) return;
    setMissions([...missions, { id: Date.now(), title: newMissionTitle, reward: Number(newMissionReward) || 10 }]);
    setNewMissionTitle('');
    setNewMissionReward('');
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
              placeholder="Enter email (Host uses filflichloe@gmail.com)..."
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Your Patrol / Player Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button}>Enter Game</button>
          </form>
        ) : role === 'host' ? (
          <div>
            <div style={styles.badgeHost}>Host Mode: {userEmail}</div>
            <h2 style={styles.sectionTitle}>Host Dashboard</h2>
            <p style={styles.text}>Manage patrol missions and live activities below:</p>
            
            <form onSubmit={addMission} style={styles.missionForm}>
              <input
                type="text"
                placeholder="New Mission Title"
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="number"
                placeholder="Coin Reward"
                value={newMissionReward}
                onChange={(e) => setNewMissionReward(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={styles.secondaryButton}>Add Mission</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '16px', margin: '15px 0 8px 0'}}>Active Missions:</h3>
              {missions.map(m => (
                <div key={m.id} style={styles.missionItem}>
                  <span>{m.title}</span>
                  <span style={{color: '#ffd700', fontWeight: 'bold'}}>🪙 {m.reward}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setRole(null)} style={styles.logoutButton}>Switch User</button>
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Patrol: {playerName}</div>
            <h2 style={styles.sectionTitle}>Player Dashboard</h2>
            <p style={styles.text}>Active missions assigned by your troop leader:</p>
            
            <div style={styles.listContainer}>
              {missions.map(m => (
                <div key={m.id} style={styles.missionItem}>
                  <div>
                    <div style={{fontWeight: 'bold'}}>{m.title}</div>
                    <div style={{fontSize: '12px', color: '#a3c1ad'}}>Reward: 🪙 {m.reward} coins</div>
                  </div>
                  <button style={styles.claimButton} onClick={() => alert(`Mission submitted for verification!`)}>Complete</button>
                </div>
              ))}
            </div>

            <button onClick={() => setRole(null)} style={styles.logoutButton}>Switch User</button>
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
    alignItems: 'center',
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
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  iconBox: { fontSize: '40px', marginBottom: '10px' },
  title: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' },
  subtitle: { color: '#a3c1ad', fontSize: '14px', marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  missionForm: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #2e7d51', background: '#123320', color: '#fff', fontSize: '15px', outline: 'none' },
  button: { background: '#ffffff', color: '#143825', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  secondaryButton: { background: '#2e7d51', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  logoutButton: { background: 'transparent', color: '#a3c1ad', border: '1px solid #2e7d51', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px', fontSize: '13px' },
  sectionTitle: { color: '#fff', fontSize: '20px', marginBottom: '8px' },
  text: { color: '#c2d6cb', fontSize: '14px', marginBottom: '15px' },
  badgeHost: { background: '#b23b3b', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  badgePlayer: { background: '#2b7ab2', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  listContainer: { textAlign: 'left', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' },
  missionItem: { background: '#143825', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '14px', border: '1px solid #2e7d51' },
  claimButton: { background: '#ffffff', color: '#143825', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }
};
