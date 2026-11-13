import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCt1fpQ4y6cCgoi0lP1IrNxyrC0LGHRZD4",
  authDomain: "troupe-challenges-2627.firebaseapp.com",
  projectId: "troupe-challenges-2627",
  storageBucket: "troupe-challenges-2627.firebasestorage.app",
  messagingSenderId: "910753152555",
  appId: "1:910753152555:web:e3faeae565fa6368d5f46e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HOST_EMAILS = ['filflichloe@gmail.com', 'jeanbouhabib@hotmail.com'];

export default function ScoutGame() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('scout_email') || '');
  const [role, setRole] = useState(() => localStorage.getItem('scout_role') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('scout_player_name') || '');
  
  const [missions, setMissions] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [history, setHistory] = useState([]); 

  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionReward, setNewMissionReward] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemMinBid, setNewItemMinBid] = useState('');
  const [bidInput, setBidInput] = useState({});

  useEffect(() => {
    if (!role) return;

    const unsubMissions = onSnapshot(collection(db, 'missions'), (snap) => setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAuctions = onSnapshot(collection(db, 'auctions'), (snap) => setAuctions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubHistory = onSnapshot(collection(db, 'history'), (snap) => {
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(hist.sort((a, b) => b.timestamp - a.timestamp)); 
    });

    return () => { unsubMissions(); unsubAuctions(); unsubPlayers(); unsubSubs(); unsubHistory(); };
  }, [role]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userEmail) return;

    const normalizedInput = userEmail.trim().toLowerCase();
    const isHost = HOST_EMAILS.some(email => email.toLowerCase() === normalizedInput);
    const assignedRole = isHost ? 'host' : 'player';
    
    setRole(assignedRole);
    const currentName = playerName || (isHost ? 'Host Leader' : 'Scout Patrol');
    
    localStorage.setItem('scout_email', normalizedInput);
    localStorage.setItem('scout_role', assignedRole);
    localStorage.setItem('scout_player_name', currentName);
    setUserEmail(normalizedInput);
    setPlayerName(currentName);

    // Add player to database instantly so they appear on the host leaderboard
    if (assignedRole === 'player') {
      const q = query(collection(db, 'players'), where("email", "==", normalizedInput));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'players'), { name: currentName, email: normalizedInput, coins: 0 });
      }
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUserEmail('');
    setPlayerName('');
    localStorage.clear();
  };

  const removePlayer = async (playerId) => {
    if (window.confirm("Are you sure you want to remove this player?")) {
      await deleteDoc(doc(db, 'players', playerId));
    }
  };

  const approveSubmission = async (sub) => {
    const p = players.find(player => player.email === sub.playerEmail);
    if (p) {
      await updateDoc(doc(db, 'players', p.id), { coins: (p.coins || 0) + sub.reward });
      await addDoc(collection(db, 'history'), { 
        message: `🏅 ${sub.playerName} completed "${sub.missionTitle}" and earned ${sub.reward} coins!`, 
        timestamp: Date.now() 
      });
    }
    await deleteDoc(doc(db, 'submissions', sub.id));
  };

  const closeBidAndAward = async (auction) => {
    if (!auction.currentBid || !auction.bidder) {
      alert("No one has bid on this yet!");
      return;
    }
    await addDoc(collection(db, 'history'), { 
      message: `🎉 ${auction.bidder} won the auction for "${auction.item}" with a bid of ${auction.currentBid} coins!`, 
      timestamp: Date.now() 
    });
    await deleteDoc(doc(db, 'auctions', auction.id));
  };

  const addMission = async (e) => {
    e.preventDefault();
    if (!newMissionTitle) return;
    await addDoc(collection(db, 'missions'), { title: newMissionTitle, reward: Number(newMissionReward) || 10 });
    setNewMissionTitle('');
    setNewMissionReward('');
  };

  const addAuctionItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    await addDoc(collection(db, 'auctions'), { item: newItemName, minBid: Number(newItemMinBid) || 50, currentBid: null, bidder: null });
    setNewItemName('');
    setNewItemMinBid('');
  };

  const completeMission = async (mission) => {
    await addDoc(collection(db, 'submissions'), {
      missionId: mission.id, missionTitle: mission.title, reward: mission.reward,
      playerName: playerName || userEmail, playerEmail: userEmail,
    });
    alert('Mission sent to host for approval!');
  };

  const placeBid = async (auctionId, minBid, currentBid) => {
    const amount = Number(bidInput[auctionId]);
    if (!amount || amount < minBid || (currentBid && amount <= currentBid)) {
      alert('Bid must be higher than the current bid!');
      return;
    }
    await updateDoc(doc(db, 'auctions', auctionId), { currentBid: amount, bidder: playerName || userEmail });
    setBidInput({ ...bidInput, [auctionId]: '' });
  };

  const currentPlayer = players.find(p => p.email === userEmail);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconBox}>⚜️</div>
        <h1 style={styles.title}>Troupe Challenges</h1>

        {!role ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <input type="email" placeholder="Enter your email..." value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={styles.input} required />
            <input type="text" placeholder="Your Patrol / Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.button}>Enter Game</button>
          </form>
        ) : role === 'host' ? (
          <div>
            <div style={styles.badgeHost}>Host Mode: {userEmail}</div>

            {/* Troop Leaderboard (Host View) */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '5px 0 8px 0'}}>Players & Coins ({players.length}):</h3>
              {players.length === 0 ? <p style={styles.emptyText}>No players joined yet.</p> :
                players.map(p => (
                  <div key={p.id} style={styles.missionItem}>
                    <div>
                      <span>{p.name}</span>
                      <span style={{color: '#ffd700', fontWeight: 'bold', marginLeft: '10px'}}>🪙 {p.coins || 0}</span>
                    </div>
                    <button onClick={() => removePlayer(p.id)} style={styles.deleteButton}>Remove</button>
                  </div>
                ))
              }
            </div>

            {/* Submissions to Review */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#85e3ff', fontSize: '15px', margin: '5px 0 8px 0'}}>Mission Submissions ({submissions.length}):</h3>
              {submissions.length === 0 ? <p style={styles.emptyText}>No pending missions.</p> :
                submissions.map(sub => (
                  <div key={sub.id} style={styles.missionItem}>
                    <div>
                      <span style={{fontWeight: 'bold'}}>{sub.playerName}</span>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>{sub.missionTitle}</div>
                    </div>
                    <div style={{display: 'flex', gap: '5px'}}>
                      <button onClick={() => approveSubmission(sub)} style={styles.claimButton}>Accept (🪙 {sub.reward})</button>
                      <button onClick={() => deleteDoc(doc(db, 'submissions', sub.id))} style={styles.deleteButton}>Reject</button>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Post Mission */}
            <form onSubmit={addMission} style={styles.missionForm}>
              <input type="text" placeholder="Mission Title" value={newMissionTitle} onChange={e => setNewMissionTitle(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Coin Reward" value={newMissionReward} onChange={e => setNewMissionReward(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>Publish Mission</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Active Missions:</h3>
              {missions.map(m => (
                <div key={m.id} style={styles.missionItem}>
                  <div><span>{m.title}</span><div style={{color: '#ffd700', fontSize: '12px'}}>🪙 {m.reward}</div></div>
                  <button onClick={() => deleteDoc(doc(db, 'missions', m.id))} style={styles.deleteButton}>Remove</button>
                </div>
              ))}
            </div>

            {/* Post Auction */}
            <form onSubmit={addAuctionItem} style={styles.missionForm}>
              <input type="text" placeholder="Auction Item" value={newItemName} onChange={e => setNewItemName(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Min Bid" value={newItemMinBid} onChange={e => setNewItemMinBid(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>Post Auction</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Auctions:</h3>
              {auctions.map(a => (
                <div key={a.id} style={styles.missionItem}>
                  <div>
                    <span style={{fontWeight: 'bold'}}>{a.item}</span>
                    <div style={{fontSize: '12px', color: '#85e3ff'}}>{a.currentBid ? `Top Bid: 🪙 ${a.currentBid} (${a.bidder})` : `Min Bid: 🪙 ${a.minBid}`}</div>
                  </div>
                  <button onClick={() => closeBidAndAward(a)} style={styles.claimButton}>Close Bid</button>
                </div>
              ))}
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Patrol: {playerName} | 🪙 {currentPlayer?.coins || 0} Coins</div>
            
            {/* Live Leaderboard */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '5px 0 8px 0'}}>Troop Leaderboard:</h3>
              {players.length === 0 ? <p style={styles.emptyText}>You are the first player!</p> :
                players.sort((a,b) => (b.coins||0) - (a.coins||0)).map(p => (
                  <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#c2d6cb', padding: '4px 0'}}>
                    <span>{p.name}</span><span style={{color: '#ffd700', fontWeight: 'bold'}}>🪙 {p.coins || 0}</span>
                  </div>
                ))
              }
            </div>

            {/* Recent Activity */}
            {history.length > 0 && (
              <div style={styles.listContainer}>
                <h3 style={{color: '#85e3ff', fontSize: '15px', margin: '5px 0 8px 0'}}>Recent Wins:</h3>
                {history.slice(0, 3).map(h => (
                  <div key={h.id} style={{fontSize: '12px', color: '#fff', padding: '4px 0', borderBottom: '1px solid #2e7d51'}}>{h.message}</div>
                ))}
              </div>
            )}

            {/* Missions */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Active Missions:</h3>
              {missions.length === 0 ? <p style={styles.emptyText}>No active missions.</p> :
                missions.map(m => (
                  <div key={m.id} style={styles.missionItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{m.title}</div>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>Reward: 🪙 {m.reward}</div>
                    </div>
                    <button style={styles.claimButton} onClick={() => completeMission(m)}>Complete</button>
                  </div>
                ))
              }
            </div>

            {/* Auctions */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Auctions:</h3>
              {auctions.length === 0 ? <p style={styles.emptyText}>No active auctions.</p> :
                auctions.map(a => (
                  <div key={a.id} style={styles.missionItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{a.item}</div>
                      <div style={{fontSize: '12px', color: '#85e3ff'}}>Top Bid: {a.currentBid ? `🪙 ${a.currentBid} (${a.bidder})` : 'None'}</div>
                    </div>
                    <div style={{display: 'flex', gap
