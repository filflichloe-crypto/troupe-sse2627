import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';

// Connects to your specific Firebase project
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

// Added jeanbouhabib@hotmail.com to the list of approved host emails
const HOST_EMAILS = ['filflichloe@gmail.com', 'jeanbouhabib@hotmail.com'];

export default function ScoutGame() {
  // Keeps you logged in when you reload
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('scout_email') || '');
  const [role, setRole] = useState(() => localStorage.getItem('scout_role') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('scout_player_name') || '');
  
  const [missions, setMissions] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionReward, setNewMissionReward] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemMinBid, setNewItemMinBid] = useState('');
  const [bidInput, setBidInput] = useState({});

  // Real-time synchronization for all devices
  useEffect(() => {
    if (!role) return;

    const unsubMissions = onSnapshot(collection(db, 'missions'), (snapshot) => 
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    const unsubAuctions = onSnapshot(collection(db, 'auctions'), (snapshot) => 
      setAuctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => 
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => 
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    return () => { unsubMissions(); unsubAuctions(); unsubPlayers(); unsubSubs(); };
  }, [role]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userEmail) return;

    // Checks if the entered email is inside the HOST_EMAILS list
    const normalizedInput = userEmail.trim().toLowerCase();
    const isHost = HOST_EMAILS.some(email => email.toLowerCase() === normalizedInput);
    
    const assignedRole = isHost ? 'host' : 'player';
    setRole(assignedRole);
    const currentName = playerName || (assignedRole === 'host' ? 'Host Leader' : 'Scout Patrol');
    
    localStorage.setItem('scout_email', userEmail);
    localStorage.setItem('scout_role', assignedRole);
    localStorage.setItem('scout_player_name', currentName);
    setPlayerName(currentName);

    // Register new players to the database so host can see their coins
    if (assignedRole === 'player') {
      const q = query(collection(db, 'players'), where("email", "==", userEmail));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'players'), { name: currentName, email: userEmail, coins: 0 });
      }
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUserEmail('');
    setPlayerName('');
    localStorage.clear();
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

  const placeBid = async (auctionId, minBid, currentBid) => {
    const amount = Number(bidInput[auctionId]);
    if (!amount || amount < minBid || (currentBid && amount <= currentBid)) {
      alert('Bid must be higher than current bid or minimum bid!');
      return;
    }
    await updateDoc(doc(db, 'auctions', auctionId), { currentBid: amount, bidder: playerName || userEmail });
    setBidInput({ ...bidInput, [auctionId]: '' });
  };

  const completeMission = async (mission) => {
    await addDoc(collection(db, 'submissions'), {
      missionId: mission.id,
      missionTitle: mission.title,
      reward: mission.reward,
      playerName: playerName || userEmail,
      playerEmail: userEmail,
    });
    alert('Mission sent to host for approval!');
  };

  // Host approves mission and player gets coins
  const approveSubmission = async (sub) => {
    const p = players.find(player => player.email === sub.playerEmail);
    if (p) {
      await updateDoc(doc(db, 'players', p.id), { coins: (p.coins || 0) + sub.reward });
    }
    await deleteDoc(doc(db, 'submissions', sub.id));
    alert(`Approved! 🪙 ${sub.reward} coins awarded to ${sub.playerName}.`);
  };

  const rejectSubmission = async (subId) => {
    await deleteDoc(doc(db, 'submissions', subId));
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconBox}>⚜️</div>
        <h1 style={styles.title}>Troupe Challenges</h1>

        {!role ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <input type="email" placeholder="Enter your email to join..." value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={styles.input} required />
            <input type="text" placeholder="Your Patrol / Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.button}>Enter Game</button>
          </form>
        ) : role === 'host' ? (
          <div>
            <div style={styles.badgeHost}>Host Mode: {userEmail}</div>
            
            {/* Player Roster & Coins */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#ffd700', fontSize: '15px', margin: '5px 0 8px 0'}}>Scout Patrols ({players.length}):</h3>
              {players.length === 0 ? <p style={styles.emptyText}>No players joined yet.</p> :
                players.map(p => (
                  <div key={p.id} style={styles.missionItem}>
                    <span style={{fontWeight: 'bold'}}>{p.name}</span>
                    <span style={{color: '#ffd700', fontWeight: 'bold'}}>🪙 {p.coins || 0}</span>
                  </div>
                ))
              }
            </div>

            {/* Pending Approvals */}
            <div style={styles.listContainer}>
              <h3 style={{color: '#85e3ff', fontSize: '15px', margin: '5px 0 8px 0'}}>Needs Approval ({submissions.length}):</h3>
              {submissions.length === 0 ? <p style={styles.emptyText}>No pending missions.</p> :
                submissions.map(sub => (
                  <div key={sub.id} style={styles.missionItem}>
                    <div>
                      <span style={{fontWeight: 'bold'}}>{sub.playerName}</span>
                      <div style={{fontSize: '12px', color: '#a3c1ad'}}>Completed: {sub.missionTitle} (🪙 {sub.reward})</div>
                    </div>
                    <div style={{display: 'flex', gap: '5px'}}>
                      <button onClick={() => approveSubmission(sub)} style={styles.claimButton}>Accept</button>
                      <button onClick={() => rejectSubmission(sub.id)} style={styles.deleteButton}>Reject</button>
                    </div>
                  </div>
                ))
              }
            </div>

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
                  <button onClick={() => deleteDoc(doc(db, 'missions', m.id))} style={styles.deleteButton}>Delete</button>
                </div>
              ))}
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>Switch User</button>
          </div>
        ) : (
          <div>
            <div style={styles.badgePlayer}>Patrol: {playerName}</div>
            
            <div style={styles.listContainer}>
              <h3 style={{color: '#fff', fontSize: '15px', margin: '5px 0 8px 0'}}>Missions:</h3>
              {missions.length === 0 ? <p style={styles.emptyText}>No missions available.</p> :
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
  title: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  missionForm: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px', textAlign: 'left' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #2e7d51', background: '#123320', color: '#fff', fontSize: '15px', outline: 'none' },
  button: { background: '#ffffff', color: '#143825', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  secondaryButton: { background: '#2e7d51', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  logoutButton: { background: 'transparent', color: '#a3c1ad', border: '1px solid #2e7d51', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px', fontSize: '13px' },
  badgeHost: { background: '#b23b3b', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  badgePlayer: { background: '#2b7ab2', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  listContainer: { textAlign: 'left', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#123320', padding: '12px', borderRadius: '8px', border: '1px solid #2e7d51' },
  missionItem: { background: '#143825', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '14px', border: '1px solid #2e7d51' },
  claimButton: { background: '#ffffff', color: '#143825', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  deleteButton: { background: '#b23b3b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  emptyText: { fontSize: '13px', color: '#a3c1ad' }
};
