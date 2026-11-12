import React, { useState, useEffect } from 'react';

const HOST_EMAIL = 'filflichloe@gmail.com';

export default function ScoutGame() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('scout_email') || '');
  const [role, setRole] = useState(() => localStorage.getItem('scout_role') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('scout_player_name') || '');
  
  // Missions state
  const [missions, setMissions] = useState(() => {
    const saved = localStorage.getItem('scout_missions');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Night Navigation Checkpoint', reward: 50 }
    ];
  });

  // Auctions / Bids state
  const [auctions, setAuctions] = useState(() => {
    const saved = localStorage.getItem('scout_auctions');
    return saved ? JSON.parse(saved) : [
      { id: 1, item: 'Golden Compass Badge', minBid: 100, currentBid: null, bidder: null }
    ];
  });

  // Players roster state
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('scout_players');
    return saved ? JSON.parse(saved) : [];
  });

  // Host form inputs
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionReward, setNewMissionReward] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemMinBid, setNewItemMinBid] = useState('');

  useEffect(() => { localStorage.setItem('scout_missions', JSON.stringify(missions)); }, [missions]);
  useEffect(() => { localStorage.setItem('scout_auctions', JSON.stringify(auctions)); }, [auctions]);
  useEffect(() => { localStorage.setItem('scout_players', JSON.stringify(players)); }, [players]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!userEmail) return;

    const assignedRole = userEmail.trim().toLowerCase() === HOST_EMAIL.toLowerCase() ? 'host' : 'player';
    setRole(assignedRole);
    
    localStorage.setItem('scout_email', userEmail);
    localStorage.setItem('scout_role', assignedRole);
    localStorage.setItem('scout_player_name', playerName || 'Scout Patrol');

    if (assignedRole === 'player' && playerName) {
      const exists = players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (!exists) {
        setPlayers([...players, { id: Date.now(), name: playerName, email: userEmail, coins: 150 }]); // Start players with 150 coins for bidding
      }
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUserEmail('');
    setPlayerName('');
    localStorage.removeItem('scout_email');
    localStorage.removeItem('scout_role');
    localStorage.removeItem('scout_player_name');
  };

  const addMission = (e) => {
    e.preventDefault();
    if (!newMissionTitle) return;
    setMissions([...missions, { id: Date.now(), title: newMissionTitle, reward: Number(newMissionReward) || 10 }]);
    setNewMissionTitle('');
    setNewMissionReward('');
  };

  const addAuctionItem = (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setAuctions([...auctions, { id: Date.now(), item: newItemName, minBid: Number(newItemMinBid) || 50, currentBid: null, bidder: null }]);
    setNewItemName('');
    setNewItemMinBid('');
  };

  const placeBid = (auctionId, bidAmount) => {
    setAuctions(auctions.map(a => {
      if (a.id === auctionId) {
        if (bidAmount < a.minBid || (a.currentBid && bidAmount <= a.currentBid)) {
          alert('Bid must be higher than current bid or minimum bid!');
          return a;
        }
        return { ...a, currentBid: bidAmount, bidder: playerName || userEmail };
      }
      return a;
    }));
  };

  const acceptBid = (auctionId) => {
    setAuctions(auctions.filter(a => a.id !== auctionId));
    alert('Bid accepted and item awarded!');
  };

  const deleteMission = (id) => setMissions(missions.filter(m => m.id !== id));
  const deleteAuction = (id) => setAuctions(auctions.filter(a => a.id !== id));

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
            
            {/* Connected Players */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '5px 0 8px 0'}}>Players ({players.length}):</h3>
              {players.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No players joined yet.</p> :
                players.map(p => (
                  <div key={p.id} style={styles.missionItem}>
                    <span>{p.name}</span>
                    <span style={{color: '#ffd700'}}>🪙 {p.coins} coins</span>
                  </div>
                ))
              }
            </div>

            {/* Add Mission Form */}
            <form onSubmit={addMission} style={styles.missionForm}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 5px 0'}}>Add Mission:</h3>
              <input type="text" placeholder="Mission Title" value={newMissionTitle} onChange={e => setNewMissionTitle(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Coin Reward" value={newMissionReward} onChange={e => setNewMissionReward(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>Add Mission</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Active Missions:</h3>
              {missions.map(m => (
                <div key={m.id} style={styles.missionItem}>
                  <div><span>{m.title}</span><div style={{color: '#ffd700', fontSize: '12px'}}>🪙 {m.reward}</div></div>
                  <button onClick={() => deleteMission(m.id)} style={styles.deleteButton}>Delete</button>
                </div>
              ))}
            </div>

            {/* Add Auction Item Form */}
            <form onSubmit={addAuctionItem} style={styles.missionForm}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '15px 0 5px 0'}}>Add Auction Item / Bid:</h3>
              <input type="text" placeholder="Item Name (e.g. Special Badge)" value={newItemName} onChange={e => setNewItemName(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Minimum Starting Bid" value={newItemMinBid} onChange={e => setNewItemMinBid(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>List Item for Auction</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Bids & Auctions:</h3>
              {auctions.map(a => (
                <div key={a.id} style={styles.missionItem}>
                  <div>
                    <span style={{fontWeight: 'bold'}}>{a.item}</span>
                    <div style={{fontSize: '12px', color: '#ffd700'}}>Min Bid: 🪙 {a.minBid}</div>
                    {a.currentBid ? (
                      <div style={{fontSize: '12px', color: '#85e3ff'}}>Current Bid: 🪙 {a.currentBid} by {a.bidder}</div>
                    ) : (
                      <div style={{fontSize: '11px', color: '#a3c1ad'}}>No bids yet</div>
                    )}
                  </div>
                  <div style={{display: 'flex', gap: '5px', flexDirection: 'column'}}>
                    {a.currentBid && <button onClick={() => acceptBid(a.id)} style={styles.claimButton}>Accept Bid</button>}
                    <button onClick={() => deleteAuction(a.id)} style={styles.deleteButton}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>Switch User</button>
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Patrol: {playerName}</div>
            <h2 style={styles.sectionTitle}>Player Dashboard</h2>
            
            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '5px 0 8px 0'}}>Missions:</h3>
              {missions.map(m => (
                <div key={m.id} style={styles.missionItem}>
                  <div>
                    <div style={{fontWeight: 'bold'}}>{m.title}</div>
                    <div style={{fontSize: '12px', color: '#a3c1ad'}}>Reward: 🪙 {m.reward} coins</div>
                  </div>
                  <button style={styles.claimButton} onClick={() => alert(`Mission submitted to host!`)}>Complete</button>
                </div>
              ))}
            </div>

            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Auctions & Bidding:</h3>
              {auctions.map(a => {
                const [bidInput, setBidInput] = useState('');
                return (
                  <div key={a.id} style={styles.missionItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{a.item}</div>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>Min Bid: 🪙 {a.minBid}</div>
                      <div style={{fontSize: '12px', color: '#85e3ff'}}>Highest Bid: {a.currentBid ? `🪙 ${a.currentBid} (${a.bidder})` : 'None'}</div>
                    </div>
                    <div style={{display: 'flex', gap: '5px', marginTop: '6px'}}>
                      <input 
                        type="number" 
                        placeholder="Bid amount" 
                        value={bidInput} 
                        onChange={e => setBidInput(e.target.value)} 
                        style={{width: '80px', padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #2e7d51', background: '#123320', color: '#fff'}} 
                      />
                      <button style={styles.claimButton} onClick={() => { placeBid(a.id, Number(bidInput)); setBidInput(''); }}>Place Bid</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>Switch User</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#143825', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' },
  card: { background: '#1e4d32', border: '2px solid #2e7d51', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '480px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
  iconBox: { fontSize: '40px', marginBottom: '10px' },
  title: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' },
  subtitle: { color: '#a3c1ad', fontSize: '14px', marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  missionForm: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px', textAlign: 'left' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #2e7d51', background: '#123320', color: '#fff', fontSize: '15px', outline: 'none' },
  button: { background: '#ffffff', color: '#143825', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  secondaryButton: { background: '#2e7d51', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  logoutButton: { background: 'transparent', color: '#a3c1ad', border: '1px solid #2e7d51', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px', fontSize: '13px' },
  sectionTitle: { color: '#fff', fontSize: '20px', marginBottom: '8px' },
  badgeHost: { background: '#b23b3b', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  badgePlayer: { background: '#2b7ab2', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  listContainer: { textAlign: 'left', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#123320', padding: '12px', borderRadius: '8px', border: '1px solid #2e7d51' },
  missionItem: { background: '#143825', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '14px', border: '1px solid #2e7d51' },
  claimButton: { background: '#ffffff', color: '#143825', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  deleteButton: { background: '#b23b3b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }
};
