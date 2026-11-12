import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import {
  Shield,
  Trophy,
  Coins,
  Gavel,
  Upload,
  CheckCircle2,
  XCircle,
  Users,
  PlusCircle,
  Clock,
  Package,
  LogOut,
  Camera,
  FileText,
  Film,
  Award,
  AlertCircle,
  Sparkles,
  Lock,
  ExternalLink
} from 'lucide-react';

// ==========================================
// FIREBASE CONFIGURATION (Troupe challenges 2627)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCtIfpQ4y6cCgoi0lPIIrNxyrC0LGHRZD4",
  authDomain: "troupe-challenges-2627.firebaseapp.com",
  projectId: "troupe-challenges-2627",
  storageBucket: "troupe-challenges-2627.firebasestorage.app",
  messagingSenderId: "910753152555",
  appId: "1:910753152555:web:e3faaae565fa6368d5f46e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Verified Host Emails
const HOST_EMAILS = [
  'filflichloe@gmail.com',
  'jeanbouhabib@hotmail.com'
];

// Helper: Compress images so they fit reliably inside Firestore documents (< 450KB)
function compressImageFile(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Helper: Read non-image file as Data URL if small enough (< 650KB)
function readSmallFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 650 * 1024) {
      reject(new Error('FILE_TOO_LARGE'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function ScoutGame() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Player profile from Firestore
  const [playerDoc, setPlayerDoc] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [scoutNameInput, setScoutNameInput] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Game Collections
  const [players, setPlayers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [bids, setBids] = useState([]);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('challenge'); // 'challenge' | 'bidding' | 'leaderboard' | 'inventory' | 'host'

  // Host Creation Form State ('challenge' or 'bid')
  const [createType, setCreateType] = useState('challenge');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemStartBid, setItemStartBid] = useState('0');
  const [itemImagePreview, setItemImagePreview] = useState('');
  const [creatingItem, setCreatingItem] = useState(false);

  // Host Award Coin Modal / Inputs per submission
  const [awardAmounts, setAwardAmounts] = useState({});
  const [processingId, setProcessingId] = useState('');

  // Player Challenge Submission State
  const [subNote, setSubNote] = useState('');
  const [subLink, setSubLink] = useState('');
  const [subFileData, setSubFileData] = useState('');
  const [subFileName, setSubFileName] = useState('');
  const [subFileType, setSubFileType] = useState(''); // 'image' | 'video' | 'file'
  const [submittingProof, setSubmittingProof] = useState(false);
  const [subFeedback, setSubFeedback] = useState('');

  // Player Bidding Inputs
  const [bidAmounts, setBidAmounts] = useState({});
  const [bidFeedback, setBidFeedback] = useState({});

  const isHost = useMemo(() => {
    if (!user?.email) return false;
    return HOST_EMAILS.includes(user.email.toLowerCase().trim());
  }, [user]);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Listen to Current User's Player Record
  useEffect(() => {
    if (!user) {
      setPlayerDoc(null);
      setPlayerLoading(false);
      return;
    }
    setPlayerLoading(true);
    const ref = doc(db, 'players', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPlayerDoc({ id: snap.id, ...snap.data() });
      } else {
        setPlayerDoc(null);
      }
      setPlayerLoading(false);
    }, (err) => {
      console.error('Player doc error:', err);
      setPlayerLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 3. Subscribe to Game Data once authenticated
  useEffect(() => {
    if (!user) return;

    const unsubPlayers = onSnapshot(collection(db, 'players'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPlayers(list);
    });

    const qChallenges = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const unsubChallenges = onSnapshot(qChallenges, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChallenges(list);
    });

    const qSubmissions = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubSubmissions = onSnapshot(qSubmissions, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    });

    const qBids = query(collection(db, 'bids'), orderBy('createdAt', 'desc'));
    const unsubBids = onSnapshot(qBids, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBids(list);
    });

    return () => {
      unsubPlayers();
      unsubChallenges();
      unsubSubmissions();
      unsubBids();
    };
  }, [user]);

  // Sign In Handler
  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError(
          'This website domain is not yet added to Firebase Authorized Domains. Add your site link in Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this site and tap Sign In again.');
      } else {
        setAuthError(err.message || 'Sign-in failed. Please try again.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Player: Submit Request to Play
  const handleRequestToPlay = async (e) => {
    e.preventDefault();
    if (!scoutNameInput.trim() || !user) return;
    setRequestSubmitting(true);
    try {
      await setDoc(doc(db, 'players', user.uid), {
        uid: user.uid,
        name: scoutNameInput.trim(),
        email: user.email.toLowerCase(),
        status: 'pending', // 'pending' | 'approved' | 'denied'
        coins: 0,
        challengesWon: 0,
        inventory: [],
        createdAt: serverTimestamp()
      });
    } catch (err) {
      alert('Error sending request: ' + err.message);
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Host: Approve or Deny Player
  const handlePlayerDecision = async (playerId, decision) => {
    setProcessingId(playerId);
    try {
      await updateDoc(doc(db, 'players', playerId), {
        status: decision
      });
    } catch (err) {
      alert('Failed to update player: ' + err.message);
    } finally {
      setProcessingId('');
    }
  };

  // Host: Handle Image Upload for Challenge or Bid
  const handleHostImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setItemImagePreview(compressed);
    } catch (err) {
      alert('Could not process that image. Please try another photo.');
    }
  };

  // Host: Create Daily Challenge OR Bidding Item
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    setCreatingItem(true);
    try {
      if (createType === 'challenge') {
        await addDoc(collection(db, 'challenges'), {
          title: itemTitle.trim(),
          description: itemDesc.trim(),
          imageUrl: itemImagePreview || '',
          status: 'active', // 'active' | 'completed'
          winnerUid: null,
          winnerName: null,
          awardedCoins: 0,
          createdBy: user.email,
          createdAt: serverTimestamp()
        });
      } else {
        const startPrice = Math.max(0, parseInt(itemStartBid || '0', 10) || 0);
        await addDoc(collection(db, 'bids'), {
          title: itemTitle.trim(),
          description: itemDesc.trim(),
          imageUrl: itemImagePreview || '',
          status: 'open', // 'open' | 'closed'
          currentBid: startPrice,
          highestBidderUid: null,
          highestBidderName: null,
          bidHistory: [],
          createdBy: user.email,
          createdAt: serverTimestamp()
        });
      }
      setItemTitle('');
      setItemDesc('');
      setItemStartBid('0');
      setItemImagePreview('');
      alert(createType === 'challenge' ? 'Daily Challenge published!' : 'Bidding item listed!');
    } catch (err) {
      alert('Error publishing: ' + err.message);
    } finally {
      setCreatingItem(false);
    }
  };

  // Host: Accept (Single Winner) or Deny a Challenge Submission
  const handleSubmissionDecision = async (submission, challenge, decision) => {
    setProcessingId(submission.id);
    try {
      if (decision === 'denied') {
        await updateDoc(doc(db, 'submissions', submission.id), {
          status: 'denied'
        });
      } else if (decision === 'accepted') {
        if (challenge.winnerUid) {
          alert('This challenge already has a winner!');
          return;
        }
        const coinsToGive = Math.max(1, parseInt(awardAmounts[submission.id] || '10', 10) || 10);

        // 1. Mark this submission as winner
        await updateDoc(doc(db, 'submissions', submission.id), {
          status: 'winner',
          coinsAwarded: coinsToGive
        });

        // 2. Mark challenge as completed with single winner
        await updateDoc(doc(db, 'challenges', challenge.id), {
          status: 'completed',
          winnerUid: submission.playerUid,
          winnerName: submission.playerName,
          awardedCoins: coinsToGive
        });

        // 3. Give coins & increment challengesWon on the player
        await updateDoc(doc(db, 'players', submission.playerUid), {
          coins: increment(coinsToGive),
          challengesWon: increment(1)
        });
      }
    } catch (err) {
      alert('Error updating submission: ' + err.message);
    } finally {
      setProcessingId('');
    }
  };

  // Host: Close Bidding & Deduct Coins & Grant Inventory Item
  const handleCloseBid = async (bidItem) => {
    setProcessingId(bidItem.id);
    try {
      if (!bidItem.highestBidderUid) {
        // Closed with no bids
        await updateDoc(doc(db, 'bids', bidItem.id), {
          status: 'closed'
        });
        return;
      }

      const winnerRef = doc(db, 'players', bidItem.highestBidderUid);
      const winnerSnap = await getDoc(winnerRef);
      if (!winnerSnap.exists()) {
        alert('Winning player record not found.');
        return;
      }
      const winnerData = winnerSnap.data();
      const winningAmount = bidItem.currentBid || 0;

      if ((winnerData.coins || 0) < winningAmount) {
        alert(`${bidItem.highestBidderName} no longer has enough coins (${winnerData.coins}) to cover ${winningAmount}.`);
        return;
      }

      // Deduct coins and add item to winner's inventory
      await updateDoc(winnerRef, {
        coins: increment(-winningAmount),
        inventory: arrayUnion({
          bidId: bidItem.id,
          title: bidItem.title,
          description: bidItem.description || '',
          imageUrl: bidItem.imageUrl || '',
          paidCoins: winningAmount,
          wonAt: new Date().toISOString()
        })
      });

      // Mark bid closed
      await updateDoc(doc(db, 'bids', bidItem.id), {
        status: 'closed',
        closedAt: serverTimestamp()
      });
    } catch (err) {
      alert('Error closing bid: ' + err.message);
    } finally {
      setProcessingId('');
    }
  };

  // Player: Select File/Photo/Video for Challenge Submission
  const handlePlayerProofFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubFeedback('');
    setSubFileName(file.name);

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 900, 0.72);
        setSubFileData(compressed);
        setSubFileType('image');
      } catch (err) {
        setSubFeedback('Could not compress image. Try another photo.');
      }
    } else if (file.type.startsWith('video/')) {
      try {
        const dataUrl = await readSmallFileAsDataURL(file);
        setSubFileData(dataUrl);
        setSubFileType('video');
      } catch (err) {
        setSubFileData('');
        setSubFileType('video');
        setSubFeedback(
          'That video file is larger than 650KB. Please paste a video link (Google Drive, iCloud, YouTube unlisted) in the link box below, or upload a short compressed clip/photo!'
        );
      }
    } else {
      try {
        const dataUrl = await readSmallFileAsDataURL(file);
        setSubFileData(dataUrl);
        setSubFileType('file');
      } catch (err) {
        setSubFileData('');
        setSubFileType('file');
        setSubFeedback(
          'That file is larger than 650KB. Please paste a shareable file link in the link box below!'
        );
      }
    }
  };

  // Player: Submit Challenge Proof
  const handleSubmitChallengeProof = async (e, challenge) => {
    e.preventDefault();
    if (!playerDoc || !challenge) return;
    if (!subFileData && !subLink.trim() && !subNote.trim()) {
      setSubFeedback('Please upload a photo/file, paste a video/file link, or write your proof.');
      return;
    }
    setSubmittingProof(true);
    setSubFeedback('');
    try {
      await addDoc(collection(db, 'submissions'), {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        playerUid: user.uid,
        playerName: playerDoc.name,
        playerEmail: playerDoc.email,
        note: subNote.trim(),
        externalLink: subLink.trim(),
        fileData: subFileData || '',
        fileName: subFileName || '',
        fileType: subFileType || (subLink ? 'link' : 'note'),
        status: 'pending', // 'pending' | 'winner' | 'denied'
        coinsAwarded: 0,
        createdAt: serverTimestamp()
      });
      setSubNote('');
      setSubLink('');
      setSubFileData('');
      setSubFileName('');
      setSubFileType('');
      setSubFeedback('Proof submitted! Waiting for the Host to review.');
    } catch (err) {
      setSubFeedback('Upload error: ' + err.message);
    } finally {
      setSubmittingProof(false);
    }
  };

  // Calculate coins already committed on other open bids where this player is currently winning
  const committedCoinsOnOtherBids = (excludeBidId) => {
    if (!user) return 0;
    return bids
      .filter((b) => b.status === 'open' && b.id !== excludeBidId && b.highestBidderUid === user.uid)
      .reduce((sum, b) => sum + (b.currentBid || 0), 0);
  };

  // Player: Place or Raise a Bid
  const handlePlaceBid = async (bidItem) => {
    if (!playerDoc || !user) return;
    const rawVal = bidAmounts[bidItem.id];
    const amount = parseInt(rawVal, 10);
    const current = bidItem.currentBid || 0;

    if (isNaN(amount) || amount <= current) {
      setBidFeedback((prev) => ({
        ...prev,
        [bidItem.id]: `Your bid must be higher than ${current} coins.`
      }));
      return;
    }

    const reservedElsewhere = committedCoinsOnOtherBids(bidItem.id);
    const availableCoins = (playerDoc.coins || 0) - reservedElsewhere;

    if (amount > availableCoins) {
      setBidFeedback((prev) => ({
        ...prev,
        [bidItem.id]: `Not enough available coins! You have ${playerDoc.coins || 0} coins (${availableCoins} available after other active bids).`
      }));
      return;
    }

    setProcessingId(bidItem.id);
    setBidFeedback((prev) => ({ ...prev, [bidItem.id]: '' }));
    try {
      await updateDoc(doc(db, 'bids', bidItem.id), {
        currentBid: amount,
        highestBidderUid: user.uid,
        highestBidderName: playerDoc.name,
        bidHistory: arrayUnion({
          uid: user.uid,
          name: playerDoc.name,
          amount,
          at: new Date().toISOString()
        })
      });
      setBidAmounts((prev) => ({ ...prev, [bidItem.id]: '' }));
      setBidFeedback((prev) => ({
        ...prev,
        [bidItem.id]: `You are now the highest bidder at ${amount} coins!`
      }));
    } catch (err) {
      setBidFeedback((prev) => ({
        ...prev,
        [bidItem.id]: 'Bid failed: ' + err.message
      }));
    } finally {
      setProcessingId('');
    }
  };

  // ==========================================
  // RENDER: LOADING SCREEN
  // ==========================================
  if (authLoading || (user && playerLoading && !isHost)) {
    return (
      <div className="min-h-screen bg-[#06160f] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-200 font-medium">Loading Troupe Challenges...</p>
      </div>
    );
  }

  // ==========================================
  // RENDER: SIGN IN SCREEN
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#06160f] via-[#0b261a] to-[#06160f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d2b1e] border border-emerald-700/50 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-600/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-9 h-9 text-emerald-300" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Troupe Challenges
          </h1>
          <p className="text-emerald-200/80 text-sm mb-7 leading-relaxed">
            Daily scout missions, coin rewards, and live troop auctions. Sign in with your Google account to enter.
          </p>

          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-left flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-emerald-50 text-[#06160f] font-bold text-base shadow-lg transition flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="mt-6 pt-5 border-t border-emerald-800/60 flex justify-center gap-2 text-xs text-emerald-300/70">
            <Lock className="w-3.5 h-3.5 text-orange-400" />
            <span>Verified email required for players & hosts</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: PLAYER REQUEST / APPROVAL GATE (Non-Hosts)
  // ==========================================
  if (!isHost && (!playerDoc || playerDoc.status !== 'approved')) {
    return (
      <div className="min-h-screen bg-[#06160f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d2b1e] border border-emerald-700/50 rounded-2xl p-7 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>

          {!playerDoc && (
            <form onSubmit={handleRequestToPlay}>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Request to Join Game</h2>
              <p className="text-sm text-emerald-200/80 mb-5">
                Enter your Scout name below. Your verified email (<strong className="text-white">{user.email}</strong>) will be sent to the Host for approval.
              </p>

              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
                Your Scout Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Karim - Patrouille Lynx"
                value={scoutNameInput}
                onChange={(e) => setScoutNameInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#06160f] border border-emerald-600/60 text-white placeholder-emerald-500/60 focus:outline-none focus:border-yellow-400 mb-5"
              />

              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {requestSubmitting ? 'Sending Request...' : 'Send Request to Host'}
              </button>
            </form>
          )}

          {playerDoc?.status === 'pending' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-yellow-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host Approval</h2>
              <p className="text-sm text-emerald-200/80 mb-4">
                Request sent as <strong className="text-yellow-300">{playerDoc.name}</strong>. As soon as the Host accepts your request, this page will automatically unlock!
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950 border border-emerald-700 text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                Live status active — no need to refresh
              </div>
            </div>
          )}

          {playerDoc?.status === 'denied' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Request Declined</h2>
              <p className="text-sm text-emerald-200/80">
                The Host did not approve this request. Contact your scout leader if you think this was a mistake.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN GAME INTERFACE (Approved Players & Hosts)
  // ==========================================
  const latestChallenge = challenges[0] || null;
  const pastChallenges = challenges.slice(1);
  const pendingPlayers = players.filter((p) => p.status === 'pending');
  const approvedPlayers = players
    .filter((p) => p.status === 'approved')
    .sort((a, b) => (b.coins || 0) - (a.coins || 0));

  const openBids = bids.filter((b) => b.status === 'open');
  const closedBids = bids.filter((b) => b.status === 'closed');

  const mySubmissions = submissions.filter((s) => s.playerUid === user.uid);
  const myInventory = playerDoc?.inventory || [];

  return (
    <div className="min-h-screen bg-[#06160f] text-white pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#092117]/95 backdrop-blur border-b border-emerald-800/70">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">
                  Troupe Challenges
                </h1>
                {isHost && (
                  <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-md bg-orange-500 text-white">
                    Host
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80">
                {isHost ? user.email : playerDoc?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isHost && playerDoc && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0d2f20] border border-yellow-400/40">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-extrabold text-yellow-300 text-sm">
                  {playerDoc.coins || 0}
                </span>
                <span className="text-xs text-emerald-200/70">coins</span>
              </div>
            )}

            {isHost && pendingPlayers.length > 0 && (
              <button
                onClick={() => setActiveTab('host')}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                {pendingPlayers.length} Pending
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 hover:text-white transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1.5 overflow-x-auto pb-2.5">
          <button
            onClick={() => setActiveTab('challenge')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'challenge'
                ? 'bg-white text-[#06160f]'
                : 'bg-[#0d2b1e] text-emerald-200 hover:bg-emerald-900/70'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-500" />
            Daily Challenge
          </button>

          <button
            onClick={() => setActiveTab('bidding')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'bidding'
                ? 'bg-white text-[#06160f]'
                : 'bg-[#0d2b1e] text-emerald-200 hover:bg-emerald-900/70'
            }`}
          >
            <Gavel className="w-4 h-4 text-orange-500" />
            Live Bidding ({openBids.length})
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-white text-[#06160f]'
                : 'bg-[#0d2b1e] text-emerald-200 hover:bg-emerald-900/70'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            Players & Coins ({approvedPlayers.length})
          </button>

          {!isHost && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white text-[#06160f]'
                  : 'bg-[#0d2b1e] text-emerald-200 hover:bg-emerald-900/70'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-400" />
              My Inventory ({myInventory.length})
            </button>
          )}

          {isHost && (
            <button
              onClick={() => setActiveTab('host')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'host'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Host Control Panel
              {pendingPlayers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-xs">
                  {pendingPlayers.length}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* ==========================================
            TAB 1: DAILY CHALLENGE
            ========================================== */}
        {activeTab === 'challenge' && (
          <div className="space-y-6">
            {!latestChallenge ? (
              <div className="bg-[#0d2b1e] border border-emerald-800 rounded-2xl p-10 text-center">
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3 opacity-80" />
                <h2 className="text-xl font-bold text-white mb-1">No Daily Challenge Yet</h2>
                <p className="text-sm text-emerald-200/70">
                  {isHost
                    ? 'Go to the Host Control Panel to post today’s challenge!'
                    : 'Check back soon—the Host has not posted today’s challenge yet.'}
                </p>
              </div>
            ) : (
              <div className="bg-[#0d2b1e] border border-emerald-700/60 rounded-2xl overflow-hidden shadow-xl">
                {latestChallenge.imageUrl && (
                  <img
                    src={latestChallenge.imageUrl}
                    alt={latestChallenge.title}
                    className="w-full max-h-96 object-cover bg-black/40"
                  />
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Today's Challenge
                    </span>
                    {latestChallenge.status === 'completed' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Winner: {latestChallenge.winnerName} (+{latestChallenge.awardedCoins} coins)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Open for Submissions
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                    {latestChallenge.title}
                  </h2>
                  <p className="text-emerald-100/90 whitespace-pre-line leading-relaxed text-base">
                    {latestChallenge.description}
                  </p>

                  {/* Player Submission Box */}
                  {!isHost && (
                    <div className="mt-7 pt-6 border-t border-emerald-800/80">
                      {latestChallenge.status === 'completed' ? (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-400/30 text-yellow-200 text-sm">
                          {latestChallenge.winnerUid === user.uid ? (
                            <div className="flex items-center gap-2 font-bold text-yellow-300">
                              <Sparkles className="w-5 h-5" />
                              Congratulations! You won this challenge and earned {latestChallenge.awardedCoins} coins!
                            </div>
                          ) : (
                            <span>
                              This challenge has been won by <strong>{latestChallenge.winnerName}</strong> (+{latestChallenge.awardedCoins} coins). Get ready for the next challenge!
                            </span>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={(e) => handleSubmitChallengeProof(e, latestChallenge)} className="space-y-4">
                          <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <Upload className="w-5 h-5 text-orange-400" />
                            Complete Challenge — Upload Proof
                          </h3>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#06160f] border-2 border-dashed border-emerald-600/60 hover:border-orange-400 cursor-pointer transition text-center">
                              <Camera className="w-6 h-6 text-emerald-300 mb-1" />
                              <span className="text-sm font-semibold text-white">
                                {subFileName ? subFileName : 'Upload Photo, Video, or File'}
                              </span>
                              <span className="text-xs text-emerald-400/70 mt-0.5">
                                Tap to choose from device
                              </span>
                              <input
                                type="file"
                                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                                onChange={handlePlayerProofFile}
                                className="hidden"
                              />
                            </label>

                            <div className="space-y-2.5">
                              <input
                                type="url"
                                placeholder="Or paste video / Drive / iCloud link..."
                                value={subLink}
                                onChange={(e) => setSubLink(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06160f] border border-emerald-700 text-sm text-white placeholder-emerald-500/60 focus:outline-none focus:border-blue-400"
                              />
                              <input
                                type="text"
                                placeholder="Add a short note or answer..."
                                value={subNote}
                                onChange={(e) => setSubNote(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06160f] border border-emerald-700 text-sm text-white placeholder-emerald-500/60 focus:outline-none focus:border-blue-400"
                              />
                            </div>
                          </div>

                          {subFileData && subFileType === 'image' && (
                            <img
                              src={subFileData}
                              alt="Preview"
                              className="h-32 rounded-xl border border-emerald-700 object-cover"
                            />
                          )}

                          {subFeedback && (
                            <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs">
                              {subFeedback}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={submittingProof}
                            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {submittingProof ? 'Uploading...' : 'Submit Challenge Entry'}
                          </button>
                        </form>
                      )}

                      {/* Player's own submissions for this challenge */}
                      {mySubmissions.filter((s) => s.challengeId === latestChallenge.id).length > 0 && (
                        <div className="mt-5 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                            Your Submissions
                          </p>
                          {mySubmissions
                            .filter((s) => s.challengeId === latestChallenge.id)
                            .map((s) => (
                              <div
                                key={s.id}
                                className="p-3 rounded-xl bg-[#06160f] border border-emerald-800 flex items-center justify-between text-xs"
                              >
                                <span className="text-emerald-100 truncate max-w-xs">
                                  {s.fileName || s.note || s.externalLink || 'Submitted entry'}
                                </span>
                                {s.status === 'winner' && (
                                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-bold">
                                    Winner! +{s.coinsAwarded} coins
                                  </span>
                                )}
                                {s.status === 'pending' && (
                                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                                    Pending Host Review
                                  </span>
                                )}
                                {s.status === 'denied' && (
                                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 font-semibold">
                                    Not Accepted
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Past Challenges Archive */}
            {pastChallenges.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300/80">
                  Previous Challenges
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {pastChallenges.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-[#0d2b1e]/80 border border-emerald-800/70 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-white">{ch.title}</h4>
                        {ch.winnerName ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-semibold shrink-0">
                            Won by {ch.winnerName} (+{ch.awardedCoins})
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
                            Open
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-200/75 line-clamp-2">{ch.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 2: LIVE BIDDING
            ========================================== */}
        {activeTab === 'bidding' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Live Troop Auction</h2>
                <p className="text-sm text-emerald-200/75">
                  Bid your coins on exclusive items. Keep raising your bid until the Host closes the auction!
                </p>
              </div>
              {!isHost && playerDoc && (
                <div className="px-4 py-2 rounded-xl bg-[#0d2b1e] border border-yellow-400/40 text-xs">
                  Available to bid:{' '}
                  <strong className="text-yellow-300 text-sm">
                    {(playerDoc.coins || 0) - committedCoinsOnOtherBids(null)} coins
                  </strong>
                </div>
              )}
            </div>

            {openBids.length === 0 ? (
              <div className="bg-[#0d2b1e] border border-emerald-800 rounded-2xl p-10 text-center">
                <Gavel className="w-12 h-12 text-orange-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold text-white">No Active Auctions Right Now</h3>
                <p className="text-sm text-emerald-200/70">
                  When the Host puts an item up for bidding, it will appear here live.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {openBids.map((item) => {
                  const isLeading = user && item.highestBidderUid === user.uid;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#0d2b1e] border border-emerald-700/60 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-52 object-cover bg-black/40"
                          />
                        )}
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30">
                              Live Bid
                            </span>
                            {isLeading && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                                You are highest bidder!
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-extrabold text-white mb-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-emerald-200/80 mb-4">{item.description}</p>
                          )}

                          <div className="p-3.5 rounded-xl bg-[#06160f] border border-emerald-800 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-emerald-400 block">Current Highest Bid</span>
                              <span className="text-2xl font-extrabold text-yellow-300 flex items-center gap-1.5">
                                <Coins className="w-5 h-5 text-yellow-400" />
                                {item.currentBid || 0}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-emerald-400 block">Leader</span>
                              <span className="text-sm font-bold text-white">
                                {item.highestBidderName || 'No bids yet'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        {!isHost ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={(item.currentBid || 0) + 1}
                                placeholder={`Min ${(item.currentBid || 0) + 1} coins`}
                                value={bidAmounts[item.id] || ''}
                                onChange={(e) =>
                                  setBidAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#06160f] border border-emerald-600 text-white text-sm focus:outline-none focus:border-yellow-400"
                              />
                              <button
                                onClick={() => handlePlaceBid(item)}
                                disabled={processingId === item.id}
                                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition cursor-pointer disabled:opacity-50"
                              >
                                {isLeading ? 'Raise Bid' : 'Place Bid'}
                              </button>
                            </div>
                            {bidFeedback[item.id] && (
                              <p className="text-xs text-yellow-300">{bidFeedback[item.id]}</p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCloseBid(item)}
                            disabled={processingId === item.id}
                            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition cursor-pointer disabled:opacity-50"
                          >
                            {processingId === item.id
                              ? 'Closing...'
                              : item.highestBidderName
                              ? `Close Bidding & Award to ${item.highestBidderName} (${item.currentBid} coins)`
                              : 'Close Bidding (No Bids)'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Closed Auctions */}
            {closedBids.length > 0 && (
              <div className="pt-4 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300/80">
                  Completed Auctions
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {closedBids.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0d2b1e]/70 border border-emerald-800/60 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-red-400 uppercase">Closed</span>
                        <span className="text-xs font-bold text-yellow-300">
                          {item.currentBid} coins
                        </span>
                      </div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-emerald-200/80 mt-1">
                        Won by: <strong>{item.highestBidderName || 'Nobody'}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 3: PLAYERS & COINS LEADERBOARD
            ========================================== */}
        {activeTab === 'leaderboard' && (
          <div className="bg-[#0d2b1e] border border-emerald-700/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-emerald-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white">Troop Standings</h2>
                <p className="text-xs text-emerald-200/75">
                  Live coins and challenges won by every player
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
                {approvedPlayers.length} Players
              </span>
            </div>

            {approvedPlayers.length === 0 ? (
              <div className="p-8 text-center text-sm text-emerald-200/70">
                No approved players yet.
              </div>
            ) : (
              <div className="divide-y divide-emerald-800/60">
                {approvedPlayers.map((p, index) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-emerald-900/20"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm ${
                          index === 0
                            ? 'bg-yellow-400 text-[#06160f]'
                            : index === 1
                            ? 'bg-slate-200 text-[#06160f]'
                            : index === 2
                            ? 'bg-orange-400 text-[#06160f]'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {p.name}{' '}
                          {user?.uid === p.uid && (
                            <span className="text-xs text-blue-300 font-normal">(You)</span>
                          )}
                        </p>
                        {isHost && <p className="text-xs text-emerald-400/75">{p.email}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-emerald-300/80 block">Challenges Won</span>
                        <span className="font-bold text-blue-300 flex items-center justify-end gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          {p.challengesWon || 0}
                        </span>
                      </div>
                      <div className="text-right min-w-[75px]">
                        <span className="text-xs text-emerald-300/80 block">Coins</span>
                        <span className="font-extrabold text-yellow-300 flex items-center justify-end gap-1">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          {p.coins || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 4: PLAYER INVENTORY
            ========================================== */}
        {activeTab === 'inventory' && !isHost && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">My Won Items</h2>
            {myInventory.length === 0 ? (
              <div className="bg-[#0d2b1e] border border-emerald-800 rounded-2xl p-10 text-center">
                <Package className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold text-white">Your Inventory is Empty</h3>
                <p className="text-sm text-emerald-200/70">
                  Win an item in the Live Bidding tab and it will appear here automatically!
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {myInventory.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0d2b1e] border border-yellow-400/40 rounded-2xl overflow-hidden shadow-lg"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <span className="text-xs font-bold text-yellow-300">
                        Won for {item.paidCoins} coins
                      </span>
                      <h3 className="font-extrabold text-lg text-white mt-0.5">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-emerald-200/80 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 5: HOST CONTROL PANEL
            ========================================== */}
        {activeTab === 'host' && isHost && (
          <div className="space-y-8">
            {/* 1. Pending Join Requests */}
            <section className="bg-[#0d2b1e] border border-orange-500/40 rounded-2xl p-5 shadow-xl">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-400" />
                Player Join Requests ({pendingPlayers.length})
              </h2>

              {pendingPlayers.length === 0 ? (
                <p className="text-sm text-emerald-200/70">No pending requests right now.</p>
              ) : (
                <div className="space-y-2.5">
                  {pendingPlayers.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl bg-[#06160f] border border-emerald-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-white">{req.name}</p>
                        <p className="text-xs text-blue-300">{req.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlayerDecision(req.id, 'approved')}
                          disabled={processingId === req.id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => handlePlayerDecision(req.id, 'denied')}
                          disabled={processingId === req.id}
                          className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" /> Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Create New Daily Challenge OR Bidding Item */}
            <section className="bg-[#0d2b1e] border border-emerald-700/60 rounded-2xl p-5 shadow-xl">
              <h2 className="text-lg font-extrabold text-white mb-4">Post to the Game</h2>

              {/* Toggle between Challenge and Bid */}
              <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-xl bg-[#06160f] border border-emerald-800 mb-5">
                <button
                  type="button"
                  onClick={() => setCreateType('challenge')}
                  className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    createType === 'challenge'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  Add Daily Challenge
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType('bid')}
                  className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    createType === 'bid'
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  Add Bidding Item
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-300 mb-1.5">
                    {createType === 'challenge' ? 'Challenge Title' : 'Item Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      createType === 'challenge'
                        ? 'e.g., Day 1: Build a Tripod Shelter'
                        : 'e.g., Secret Clues Envelope / Extra Ration'
                    }
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#06160f] border border-emerald-700 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-300 mb-1.5">
                    {createType === 'challenge' ? 'Challenge Paragraph / Instructions' : 'Item Description'}
                  </label>
                  <textarea
                    rows={4}
                    required={createType === 'challenge'}
                    placeholder={
                      createType === 'challenge'
                        ? 'Write the full challenge rules and what players need to submit...'
                        : 'Describe what this item gives the winner...'
                    }
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#06160f] border border-emerald-700 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {createType === 'bid' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-300 mb-1.5">
                      Starting Minimum Bid (Coins)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemStartBid}
                      onChange={(e) => setItemStartBid(e.target.value)}
                      className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-[#06160f] border border-emerald-700 text-white text-sm focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-300 mb-1.5">
                    Upload Picture (Optional)
                  </label>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#06160f] border border-emerald-700 hover:border-yellow-400 text-sm text-emerald-200 cursor-pointer">
                    <Camera className="w-4 h-4 text-yellow-400" />
                    <span>{itemImagePreview ? 'Change Picture' : 'Choose Picture'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHostImageSelect}
                      className="hidden"
                    />
                  </label>
                  {itemImagePreview && (
                    <img
                      src={itemImagePreview}
                      alt="Preview"
                      className="mt-3 h-36 rounded-xl border border-emerald-700 object-cover"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={creatingItem}
                  className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition cursor-pointer disabled:opacity-50 ${
                    createType === 'challenge'
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-orange-500 hover:bg-orange-400'
                  }`}
                >
                  {creatingItem
                    ? 'Publishing...'
                    : createType === 'challenge'
                    ? 'Publish Daily Challenge'
                    : 'Start Bidding Item'}
                </button>
              </form>
            </section>

            {/* 3. Review Challenge Submissions & Pick Single Winner */}
            <section className="bg-[#0d2b1e] border border-emerald-700/60 rounded-2xl p-5 shadow-xl">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-400" />
                Challenge Submissions (Pick 1 Winner per Challenge)
              </h2>

              {submissions.length === 0 ? (
                <p className="text-sm text-emerald-200/70">No player submissions yet.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => {
                    const parentChallenge = challenges.find((c) => c.id === sub.challengeId);
                    const alreadyHasWinner = Boolean(parentChallenge?.winnerUid);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-[#06160f] border border-emerald-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs text-blue-300 font-semibold block">
                              Challenge: {sub.challengeTitle}
                            </span>
                            <h4 className="font-bold text-white text-base">{sub.playerName}</h4>
                          </div>

                          {sub.status === 'winner' && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold">
                              Winner (+{sub.coinsAwarded} coins)
                            </span>
                          )}
                          {sub.status === 'denied' && (
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold">
                              Denied
                            </span>
                          )}
                          {sub.status === 'pending' && alreadyHasWinner && (
                            <span className="px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs">
                              Challenge already won by {parentChallenge?.winnerName}
                            </span>
                          )}
                        </div>

                        {sub.note && <p className="text-sm text-emerald-100">{sub.note}</p>}

                        {sub.externalLink && (
                          <a
                            href={sub.externalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-300 underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open Submitted Link
                          </a>
                        )}

                        {sub.fileData && sub.fileType === 'image' && (
                          <img
                            src={sub.fileData}
                            alt="Submission proof"
                            className="max-h-64 rounded-xl border border-emerald-700 object-contain bg-black/40"
                          />
                        )}

                        {sub.fileData && sub.fileType === 'video' && (
                          <video
                            src={sub.fileData}
                            controls
                            className="max-h-64 rounded-xl border border-emerald-700"
                          />
                        )}

                        {sub.fileData && sub.fileType === 'file' && (
                          <a
                            href={sub.fileData}
                            download={sub.fileName || 'submission-file'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 text-xs text-white"
                          >
                            <FileText className="w-4 h-4" /> Download {sub.fileName || 'File'}
                          </a>
                        )}

                        {sub.status === 'pending' && !alreadyHasWinner && parentChallenge && (
                          <div className="pt-2 flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-4 h-4 text-yellow-400" />
                              <input
                                type="number"
                                min="1"
                                placeholder="Coins (e.g. 20)"
                                value={awardAmounts[sub.id] ?? '20'}
                                onChange={(e) =>
                                  setAwardAmounts((prev) => ({
                                    ...prev,
                                    [sub.id]: e.target.value
                                  }))
                                }
                                className="w-28 px-3 py-1.5 rounded-lg bg-[#0d2b1e] border border-yellow-400/50 text-white text-xs"
                              />
                            </div>

                            <button
                              onClick={() =>
                                handleSubmissionDecision(sub, parentChallenge, 'accepted')
                              }
                              disabled={processingId === sub.id}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Accept as Winner & Give Coins
                            </button>

                            <button
                              onClick={() =>
                                handleSubmissionDecision(sub, parentChallenge, 'denied')
                              }
                              disabled={processingId === sub.id}
                              className="px-4 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Deny
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
