import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

// Your official Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCt1fpQ4y6cCgoi0lP1IrNxyrC0LGHRZD4",
  authDomain: "troupe-challenges-2627.firebaseapp.com",
  projectId: "troupe-challenges-2627",
  storageBucket: "troupe-challenges-2627.firebasestorage.app",
  messagingSenderId: "910753152555",
  appId: "1:910753152555:web:e3faeae565fa6368d5f46e"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HOST_EMAIL = 'filflichloe@gmail.com';

export default function ScoutGame() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('scout_email') || '');
  const [role, setRole] = useState(() => localStorage.getItem('scout_role') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('scout_player_name') || '');
  
  const [missions, setMissions] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionReward, setNewMissionReward] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemMinBid, setNewItemMinBid] = useState('');
  const [bidInput, setBidInput] = useState({});

  // Real-time listeners for live synchronization across all devices
  useEffect(() => {
    if (!role) return;

    const unsubMissions = onSnapshot(collection(db, 'missions'), (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAuctions = onSnapshot(collection(db, 'auctions'), (snapshot) => {
      setAuctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMissions();
      unsubAuctions();
      unsubSubs();
    };
  }, [role]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!userEmail) return;

    const assignedRole = userEmail.trim().toLowerCase() === HOST_EMAIL.toLowerCase() ? 'host' : 'player';
    setRole(assignedRole);
    
    const currentName = playerName || (assignedRole === 'host' ? 'Host Leader' : 'Scout Patrol');
    
    localStorage.setItem('scout_email', userEmail);
    localStorage.setItem('scout_role', assignedRole);
    localStorage.setItem('scout_player_name', currentName);
    setPlayerName(currentName);
  };

  const handleLogout = () => {
    setRole(null);
    setUserEmail('');
    setPlayerName('');
    localStorage.removeItem('scout_email');
    localStorage.removeItem('scout_role');
    localStorage.removeItem('scout_player_name');
  };

  const addMission = async (e) => {
    e.preventDefault();
    if (!newMissionTitle) return;
    await addDoc(collection(db, 'missions'), {
      title: newMissionTitle,
      reward: Number(newMissionReward) || 10,
      createdAt: Date.now()
    });
    setNewMissionTitle('');
    setNewMissionReward('');
  };

  const deleteMission = async (id) => {
    await deleteDoc(doc(db, 'missions', id));
  };

  const addAuctionItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    await addDoc(collection(db, 'auctions'), {
      item: newItemName,
      minBid: Number(newItemMinBid) || 50,
      currentBid: null,
      bidder: null,
      createdAt: Date.now()
    });
    setNewItemName('');
    setNewItemMinBid('');
  };

  const placeBid = async (auctionId, minBid, currentBid) => {
    const amount = Number(bidInput[auctionId]);
    if (!amount || amount < minBid || (currentBid && amount <= currentBid)) {
      alert('Bid must be higher than current bid or minimum bid!');
      return;
    }
    await updateDoc(doc(db, 'auctions', auctionId), {
      currentBid: amount,
      bidder: playerName || userEmail
    });
    setBidInput({ ...bidInput, [auctionId]: '' });
  };

  const acceptBid = async (auctionId) => {
    await deleteDoc(doc(db, 'auctions', auctionId));
    alert('Bid accepted and item awarded!');
  };

  const completeMission = async (mission) => {
    await addDoc(collection(db, 'submissions'), {
      missionId: mission.id,
      missionTitle: mission.title,
      reward: mission.reward,
      playerName: playerName || userEmail,
      status: 'pending',
      timestamp: Date.now()
    });
    alert('Mission submitted to host for review!');
  };

  const approveSubmission = async (subId) => {
    await deleteDoc(doc(db, 'submissions', subId));
    alert('Mission approved and reward granted!');
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
            
            {/* Pending Player Submissions */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '5px 0 8px 0'}}>Pending Completions ({submissions.length}):</h3>
              {submissions.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No pending submissions.</p> :
                submissions.map(sub => (
                  <div key={sub.id} style={styles.missionItem}>
                    <div>
                      <span style={{fontWeight: 'bold'}}>{sub.playerName}</span>
                      <div style={{fontSize: '12px', color: '#85e3ff'}}>Completed: {sub.missionTitle} (🪙 {sub.reward})</div>
                    </div>
                    <button onClick={() => approveSubmission(sub.id)} style={styles.claimButton}>Approve</button>
                  </div>
                ))
              }
            </div>

            {/* Add Mission Form */}
            <form onSubmit={addMission} style={styles.missionForm}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 5px 0'}}>Add Mission:</h3>
              <input type="text" placeholder="Mission Title" value={newMissionTitle} onChange={e => setNewMissionTitle(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Coin Reward" value={newMissionReward} onChange={e => setNewMissionReward(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>Publish Mission</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Active Missions:</h3>
              {missions.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No active missions.</p> :
                missions.map(m => (
                  <div key={m.id} style={styles.missionItem}>
                    <div><span>{m.title}</span><div style={{color: '#ffd700', fontSize: '12px'}}>🪙 {m.reward}</div></div>
                    <button onClick={() => deleteMission(m.id)} style={styles.deleteButton}>Delete</button>
                  </div>
                ))
              }
            </div>

            {/* Add Auction Item */}
            <form onSubmit={addAuctionItem} style={styles.missionForm}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '15px 0 5px 0'}}>Add Auction Item:</h3>
              <input type="text" placeholder="Item Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} style={styles.input} required />
              <input type="number" placeholder="Minimum Starting Bid" value={newItemMinBid} onChange={e => setNewItemMinBid(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.secondaryButton}>List Auction</button>
            </form>

            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Bids:</h3>
              {auctions.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No active auctions.</p> :
                auctions.map(a => (
                  <div key={a.id} style={styles.missionItem}>
                    <div>
                      <span style={{fontWeight: 'bold'}}>{a.item}</span>
                      <div style={{fontSize: '12px', color: '#ffd700'}}>Min Bid: 🪙 {a.minBid}</div>
                      {a.currentBid ? <div style={{fontSize: '12px', color: '#85e3ff'}}>Bid: 🪙 {a.currentBid} by {a.bidder}</div> : <div style={{fontSize: '11px', color: '#a3c1ad'}}>No bids</div>}
                    </div>
                    <div style={{display: 'flex', gap: '5px', flexDirection: 'column'}}>
                      {a.currentBid && <button onClick={() => acceptBid(a.id)} style={styles.claimButton}>Accept Bid</button>}
                      <button onClick={() => deleteDoc(doc(db, 'auctions', a.id))} style={styles.deleteButton}>Remove</button>
                    </div>
                  </div>
                ))
              }
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>Switch User</button>
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Patrol: {playerName}</div>
            <h2 style={styles.sectionTitle}>Player Dashboard</h2>
            
            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '5px 0 8px 0'}}>Missions:</h3>
              {missions.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No missions available yet.</p> :
                missions.map(m => (
                  <div key={m.id} style={styles.missionItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{m.title}</div>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>Reward: 🪙 {m.reward} coins</div>
                    </div>
                    <button style={styles.claimButton} onClick={() => completeMission(m)}>Complete</button>
                  </div>
                ))
              }
            </div>

            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '10px 0 8px 0'}}>Live Auctions:</h3>
              {auctions.length === 0 ? <p style={{fontSize: '13px', color: '#a3c1ad'}}>No active auctions.</p> :
                auctions.map(a => (
                  <div key={a.id} style={styles.missionItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{a.item}</div>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>Min Bid: 🪙 {a.minBid}</div>
                      <div style={{fontSize: '12px', color: '#85e3ff'}}>Highest Bid: {a.currentBid ? `🪙 ${a.currentBid} (${a.bidder})` : 'None'}</div>
                    </div>
                    <div style={{display: 'flex', gap: '5px', marginTop: '6px', alignItems: 'center'}}>
                      <input 
                        type="number" 
                        placeholder="Bid" 
                        value={bidInput[a.id] || ''} 
                        onChange={e => setBidInput({ ...bidInput, [a.id]: e.target.value })} 
                        style={{width: '70px', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #2e7d51', background: '#123320', color: '#fff'}} 
                      />
                      <button style={styles.claimButton} onClick={() => placeBid(a.id, a.minBid, a.currentBid
