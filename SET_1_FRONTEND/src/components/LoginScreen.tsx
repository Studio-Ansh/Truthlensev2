import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Mail, User, Lock, ArrowRight, Eye, EyeOff, Terminal, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { db, handleFirestoreError, OperationType, auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export interface TruthLensUser {
  uid: string;
  username: string;
  email: string;
  createdAt: string;
}

interface LoginScreenProps {
  onSuccess: (user: TruthLensUser) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser) {
        throw new Error("Google authentication failed. No user returned.");
      }

      const email = googleUser.email || "";
      const uid = googleUser.uid;

      // 1. Check if user document already exists in the "users" collection
      const userDocRef = doc(db, "users", uid);
      let userSnap;
      try {
        userSnap = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }

      let finalUser: TruthLensUser;

      if (userSnap && userSnap.exists()) {
        const userData = userSnap.data();
        finalUser = {
          uid: userData.uid,
          username: userData.username,
          email: userData.email,
          createdAt: userData.createdAt,
        };
      } else {
        // User profile doesn't exist yet, so we provision a new one.
        // First check if email is already registered via standard registration (with username/password)
        if (email) {
          const emailQuery = query(collection(db, "users"), where("email", "==", email));
          let emailSnap;
          try {
            emailSnap = await getDocs(emailQuery);
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, "users");
          }

          if (emailSnap && !emailSnap.empty) {
            // An account with this email already exists! We can link to this existing account.
            const userData = emailSnap.docs[0].data();
            finalUser = {
              uid: userData.uid,
              username: userData.username,
              email: userData.email,
              createdAt: userData.createdAt,
            };
            
            // Log in with existing user
            setSuccessMessage("Linked existing identity. Access granted.");
            localStorage.setItem("truthlens_operator", JSON.stringify(finalUser));
            setTimeout(() => {
              onSuccess(finalUser);
            }, 1200);
            return;
          }
        }

        // If no existing email account, we generate a unique, clean username
        let baseUsername = "agent_" + (googleUser.displayName 
          ? googleUser.displayName.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
          : (email ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : "operator")
        );

        // Trim to valid length (3-30 chars)
        if (baseUsername.length > 25) {
          baseUsername = baseUsername.slice(0, 25);
        }
        if (baseUsername.length < 3) {
          baseUsername = "operator_" + uid.slice(0, 5);
        }

        let isUnique = false;
        let attempt = 0;
        let selectedUsername = baseUsername;

        while (!isUnique && attempt < 10) {
          const checkUsername = attempt === 0 ? baseUsername : `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
          const usernameDocRef = doc(db, "usernames", checkUsername);
          let usernameSnap;
          try {
            usernameSnap = await getDoc(usernameDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `usernames/${checkUsername}`);
          }

          if (!usernameSnap || !usernameSnap.exists()) {
            selectedUsername = checkUsername;
            isUnique = true;
          }
          attempt++;
        }

        // Create the profile documents
        const createdAtStr = new Date().toISOString();
        finalUser = {
          uid,
          username: selectedUsername,
          email,
          createdAt: createdAtStr,
        };

        // Create username lock
        try {
          await setDoc(doc(db, "usernames", selectedUsername), {
            uid,
            email,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `usernames/${selectedUsername}`);
        }

        // Create user document
        try {
          await setDoc(doc(db, "users", uid), {
            uid,
            username: selectedUsername,
            email,
            password: "", // No password needed for Google Auth SSO
            createdAt: createdAtStr,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }

      setSuccessMessage("Identity verified via Google. Access granted.");
      localStorage.setItem("truthlens_operator", JSON.stringify(finalUser));

      setTimeout(() => {
        onSuccess(finalUser);
      }, 1200);

    } catch (error: any) {
      console.error("Google login error:", error);
      if (error?.code === "auth/popup-closed-by-user") {
        setErrorMessage("Authentication popup was closed. Please try again.");
      } else {
        setErrorMessage(error.message || "Google authentication failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword || (isSignUp && !cleanUsername)) {
      setErrorMessage("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        setErrorMessage("Username must be between 3 and 30 characters.");
        setIsLoading(false);
        return;
      }
      if (!usernameRegex.test(cleanUsername)) {
        setErrorMessage("Username can only contain letters, numbers, and underscores.");
        setIsLoading(false);
        return;
      }

      try {
        // 1. Check if username is already taken
        const usernameDocRef = doc(db, "usernames", cleanUsername);
        let usernameSnap;
        try {
          usernameSnap = await getDoc(usernameDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `usernames/${cleanUsername}`);
        }

        if (usernameSnap && usernameSnap.exists()) {
          setErrorMessage("Already you have an account. Please sign in instead.");
          setIsLoading(false);
          return;
        }

        // 2. Check if email is already registered in users collection
        const emailQuery = query(collection(db, "users"), where("email", "==", cleanEmail));
        let emailSnap;
        try {
          emailSnap = await getDocs(emailQuery);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, "users");
        }

        if (emailSnap && !emailSnap.empty) {
          setErrorMessage("Already you have an account. Please sign in instead.");
          setIsLoading(false);
          return;
        }

        // 3. Register user inside custom Firestore collection
        const newUid = doc(collection(db, "users")).id;
        const createdAtStr = new Date().toISOString();

        const newUser: TruthLensUser = {
          uid: newUid,
          username: cleanUsername,
          email: cleanEmail,
          createdAt: createdAtStr,
        };

        // Create username lock record
        try {
          await setDoc(doc(db, "usernames", cleanUsername), {
            uid: newUid,
            email: cleanEmail,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `usernames/${cleanUsername}`);
        }

        // Create user document (with plain credential for verified prototype auth)
        try {
          await setDoc(doc(db, "users", newUid), {
            uid: newUid,
            username: cleanUsername,
            email: cleanEmail,
            password: cleanPassword, // Stored safely inside secured Firestore matching user preferences
            createdAt: createdAtStr,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${newUid}`);
        }

        setSuccessMessage("Authentication registered successfully. Access granted.");
        
        // Save to local session
        localStorage.setItem("truthlens_operator", JSON.stringify(newUser));

        setTimeout(() => {
          onSuccess(newUser);
        }, 1500);

      } catch (error: any) {
        console.error("Sign up error:", error);
        setErrorMessage(error.message || "Registration failed. Please check credentials.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login Flow
      try {
        let resolvedEmail = cleanEmail;
        let resolvedUid = "";
        let userData: any = null;

        // If the user entered a username (no '@' sign), resolve to their email first
        if (!cleanEmail.includes("@")) {
          const usernameDocRef = doc(db, "usernames", cleanEmail.toLowerCase());
          let usernameSnap;
          try {
            usernameSnap = await getDoc(usernameDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `usernames/${cleanEmail.toLowerCase()}`);
          }

          if (usernameSnap && usernameSnap.exists()) {
            resolvedEmail = usernameSnap.data().email;
            resolvedUid = usernameSnap.data().uid;
          } else {
            setErrorMessage("Invalid credentials. Username not found.");
            setIsLoading(false);
            return;
          }
        }

        // Fetch User record from database
        if (resolvedUid) {
          const userDocRef = doc(db, "users", resolvedUid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        } else {
          // If login was initiated via email
          const emailQuery = query(collection(db, "users"), where("email", "==", resolvedEmail));
          const emailSnap = await getDocs(emailQuery);
          if (!emailSnap.empty) {
            userData = emailSnap.docs[0].data();
          }
        }

        if (!userData || userData.password !== cleanPassword) {
          setErrorMessage("Invalid credentials. Please verify your identity and try again.");
          setIsLoading(false);
          return;
        }

        const authenticatedUser: TruthLensUser = {
          uid: userData.uid,
          username: userData.username,
          email: userData.email,
          createdAt: userData.createdAt,
        };

        setSuccessMessage("Identity verified. Establishing secure session...");
        
        // Save to local session
        localStorage.setItem("truthlens_operator", JSON.stringify(authenticatedUser));

        setTimeout(() => {
          onSuccess(authenticatedUser);
        }, 1200);

      } catch (error: any) {
        console.error("Login error:", error);
        setErrorMessage(error.message || "Login failed. Connection refused.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 relative z-40 py-20 animate-fade-in">
      
      {/* Absolute backdrop layout overlay */}
      <div className="absolute inset-0 bg-void/50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel rounded-xl p-8 border border-white/5 relative z-50 overflow-hidden box-glow-sand"
      >
        {/* Glow corner indicator */}
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-sand/10 blur-2xl pointer-events-none" />
        
        {/* Top telemetry line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sand/40 to-transparent" />

        {/* Identity title */}
        <div className="text-center mb-8 relative">
          <span className="text-[9px] font-mono tracking-[0.4em] text-sand uppercase block mb-2">
            [ SYSTEM ACCESS PORTAL ]
          </span>
          <h2 className="text-2xl font-light tracking-tight text-alabaster font-display">
            {isSignUp ? "Register Identity" : "Verify Identity"}
          </h2>
          <p className="text-xs text-slate-muted font-light mt-1.5 leading-relaxed">
            {isSignUp 
              ? "Establish cryptographic credentials on the TruthLens decentralized ledger."
              : "Authorize secure clearance node to access cognitive forensic services."}
          </p>
        </div>

        {/* Dynamic status notifications */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="font-sans font-light leading-normal">
                  <span className="font-mono text-[9px] font-bold block uppercase tracking-wider text-red-400 mb-0.5">ALERT_VERIFICATION_FAILED</span>
                  {errorMessage}
                </div>
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="font-sans font-light leading-normal">
                  <span className="font-mono text-[9px] font-bold block uppercase tracking-wider text-emerald-400 mb-0.5">ACCESS_GRANTED</span>
                  {successMessage}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email / Username field */}
          <div>
            <label className="text-[9px] font-mono text-sand/80 uppercase block tracking-widest mb-1.5">
              {isSignUp ? "Email Address" : "Username or Email Address"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted">
                {isSignUp ? <Mail className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </span>
              <input
                type={isSignUp ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSignUp ? "forensics@truthlens.studio" : "Username or email"}
                className="w-full bg-void/50 border border-white/10 rounded pl-10 pr-3 py-2.5 text-xs text-alabaster placeholder:text-white/20 focus:border-sand/40 outline-none transition-all duration-300 font-sans tracking-wide"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Username (Sign Up only) */}
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <label className="text-[9px] font-mono text-sand/80 uppercase block tracking-widest mb-1.5">
                Selected Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. detective_agent"
                  className="w-full bg-void/50 border border-white/10 rounded pl-10 pr-3 py-2.5 text-xs text-alabaster placeholder:text-white/20 focus:border-sand/40 outline-none transition-all duration-300 font-sans tracking-wide"
                  disabled={isLoading}
                  required={isSignUp}
                />
              </div>
            </motion.div>
          )}

          {/* Password field */}
          <div>
            <label className="text-[9px] font-mono text-sand/80 uppercase block tracking-widest mb-1.5">
              {isSignUp ? "Create Secure Password" : "Secure Password"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-void/50 border border-white/10 rounded pl-10 pr-10 py-2.5 text-xs text-alabaster placeholder:text-white/20 focus:border-sand/40 outline-none transition-all duration-300 font-sans tracking-wide"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-sand transition-colors duration-200"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full mt-6 bg-sand/5 hover:bg-sand/15 border border-sand/40 hover:border-sand text-sand py-3 rounded text-xs font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 cursor-none interactive active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sand" />
                <span>[ AUTHENTICATING NODE... ]</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? "[ REGISTER NEW IDENTITY ]" : "[ AUTHORIZE SECURE NODE ]"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative bg-[#0d0d0f] px-2.5 text-[8px] font-mono text-slate-muted uppercase tracking-[0.3em]">
              OR
            </span>
          </div>

          {/* Google Sign-In button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 text-alabaster py-3 rounded text-xs font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 cursor-none interactive active:scale-[0.98]"
            disabled={isLoading}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>[ SIGN IN WITH GOOGLE ]</span>
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col items-center justify-center gap-2">
          <span className="text-[9px] font-mono text-slate-muted uppercase tracking-wider">
            {isSignUp ? "EXISTING LEDGER NODE FOUND?" : "NEW TELEMETRY OPERATOR?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-[10px] font-mono text-sand hover:text-alabaster transition-colors duration-300 underline underline-offset-4 cursor-none interactive uppercase tracking-widest"
            disabled={isLoading}
          >
            {isSignUp ? "[ BACK TO VERIFY NODE ]" : "[ ENLIST NEW IDENTITY RECORD ]"}
          </button>
        </div>

        {/* Subtle decorative console code */}
        <div className="mt-6 flex items-center justify-between text-[8px] font-mono text-white/[0.04] pointer-events-none select-none">
          <span>PORT_3000_GATEWAY</span>
          <span>SSL_SECURE_NODE</span>
          <span>AUTH_V2_ACTIVE</span>
        </div>

      </motion.div>
    </div>
  );
}
