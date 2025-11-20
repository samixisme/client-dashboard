import React, { useState, useEffect } from 'react';
import { GoogleIcon } from '../components/icons/GoogleIcon';
import { GlobalLogoIcon } from '../components/icons/GlobalLogoIcon';
import { auth, db } from '../utils/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendSignInLinkToEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ShimmerButton from '../components/ShimmerButton';

interface LoginPageProps {
  onLogin: (status: string) => void;
}

const getErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential': return 'Incorrect email or password. Please try again.';
    case 'auth/wrong-password': return 'The password you entered is incorrect.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/operation-not-allowed': return 'This sign-in method is not enabled.';
    case 'auth/weak-password': return 'The password is too weak.';
    default: return 'An unexpected error occurred. Please try again later.';
  }
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'signin' | 'signup' | 'reset' | 'reset_sent' | 'phone_verify' | 'email_link_sent'>('signin');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'link'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ((view === 'signin' || view === 'signup') && authMethod === 'phone' && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible', 'callback': () => {} });
      (window as any).recaptchaVerifier.render();
    }
  }, [view, authMethod]);

  const checkUserStatus = async (user: any, additionalData?: { firstName?: string; lastName?: string; email?: string }) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) return userDoc.data().status;
    const newUserProfile: any = { status: 'pending', createdAt: new Date() };
    if (user.email) newUserProfile.email = user.email;
    if (user.phoneNumber) newUserProfile.phoneNumber = user.phoneNumber;
    if (additionalData?.firstName) newUserProfile.firstName = additionalData.firstName;
    if (additionalData?.lastName) newUserProfile.lastName = additionalData.lastName;
    if (additionalData?.email) newUserProfile.email = additionalData.email;
    try { await setDoc(userDocRef, newUserProfile); } catch (e) { console.error("Failed to write user doc:", e); }
    return 'pending';
  };

  const handleEmailSignIn = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(async ({ user }) => onLogin(await checkUserStatus(user)))
      .catch((err) => setError(getErrorMessage(err.code)));
  };
  
  const handlePhoneRequest = () => {
    if (!phoneNumber || !isPossiblePhoneNumber(phoneNumber)) { setError("Please enter a valid phone number."); return; }
    const appVerifier = (window as any).recaptchaVerifier;
    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      .then((result) => { setConfirmationResult(result); setView('phone_verify'); })
      .catch(() => setError("Failed to send code. Check the number and try again."));
  };

  const handleSendSignInLink = async () => {
    setError(null);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty || querySnapshot.docs[0].data().status !== 'accepted') {
        setError("No approved account found for this email. Magic link is for existing, accepted users only.");
        return;
      }
      const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setView('email_link_sent');
    } catch (err) {
      setError("Could not send magic link. Please try again.");
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === 'email') {
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      createUserWithEmailAndPassword(auth, email, password)
        .then(async ({ user }) => {
          await setDoc(doc(db, "users", user.uid), { email: user.email, firstName, lastName, status: 'pending', createdAt: new Date() });
          onLogin('pending');
        })
        .catch((err) => setError(getErrorMessage(err.code)));
    } else {
        handlePhoneRequest();
    }
  };

  const handleGoogleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider())
      .then(async ({ user }) => onLogin(await checkUserStatus(user)))
      .catch((err) => setError(getErrorMessage(err.code)));
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    confirmationResult.confirm(otp)
      .then(async ({ user }) => onLogin(await checkUserStatus(user, { firstName, lastName })))
      .catch(() => setError("Invalid code. Please try again."));
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPasswordResetEmail(auth, email)
      .then(() => setView('reset_sent'))
      .catch((err) => setError(getErrorMessage(err.code)));
  };

  const handleSignInFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (authMethod === 'email') handleEmailSignIn();
    else if (authMethod === 'phone') handlePhoneRequest();
    else handleSendSignInLink();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md p-10 space-y-8 bg-glass rounded-2xl shadow-lg border border-border-color">
        <div className="flex flex-col items-center">
          <GlobalLogoIcon className="h-12 w-auto text-primary" />
          <h2 className="mt-4 text-3xl font-bold text-center text-text-primary">
            {view === 'signin' && 'Sign in to your account'}
            {view === 'signup' && 'Create an account'}
            {view === 'reset' && 'Reset your password'}
            {view === 'reset_sent' && 'Check your email'}
            {view === 'phone_verify' && 'Enter verification code'}
            {view === 'email_link_sent' && 'Check your email'}
          </h2>
          <p className="mt-2 text-sm text-center text-text-secondary">
            {view === 'signin' && 'Welcome back.'}
            {view === 'signup' && 'Join us to get started.'}
            {view === 'reset' && 'Enter your email for a password reset link.'}
            {view === 'reset_sent' && `We've sent a link to ${email}.`}
            {view === 'phone_verify' && `We've sent a code to ${phoneNumber}.`}
            {view === 'email_link_sent' && `We've sent a magic link to ${email}. Click it to sign in.`}
          </p>
        </div>

        {error && <p className="text-red-500 text-center text-sm my-4">{error}</p>}
        
        {view === 'signin' && (
          <>
            <ShimmerButton onClick={handleGoogleSignIn} type="button" variant="secondary">
              <GoogleIcon className="w-5 h-5 mr-2" /> Sign in with Google
            </ShimmerButton>
            <div className="flex items-center justify-center"><div className="flex-grow border-t border-border-color"></div><span className="flex-shrink mx-4 text-sm text-text-secondary">Or</span><div className="flex-grow border-t border-border-color"></div></div>
            <div className="mb-4 flex border-b border-border-color">
              <button onClick={() => setAuthMethod('email')} className={`flex-1 py-2 text-sm font-medium ${authMethod === 'email' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Email</button>
              <button onClick={() => setAuthMethod('phone')} className={`flex-1 py-2 text-sm font-medium ${authMethod === 'phone' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Phone</button>
              <button onClick={() => setAuthMethod('link')} className={`flex-1 py-2 text-sm font-medium ${authMethod === 'link' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Magic Link</button>
            </div>
            <form className="space-y-6" onSubmit={handleSignInFormSubmit}>
              {authMethod === 'email' ? (
                <div className="space-y-4">
                  <input type="email" autoComplete="email" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input type="password" autoComplete="current-password" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              ) : authMethod === 'phone' ? (
                <PhoneInput placeholder="Phone number" value={phoneNumber} onChange={setPhoneNumber} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary sm:text-sm" />
              ) : (
                <input type="email" autoComplete="email" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
              { authMethod === 'email' && 
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center"><input id="remember-me" type="checkbox" className="h-4 w-4 text-primary bg-glass-light border-border-color rounded" /><label htmlFor="remember-me" className="ml-2 block text-text-secondary">Remember me</label></div>
                    <a href="#" onClick={(e) => { e.preventDefault(); setView('reset'); }} className="font-medium text-primary hover:text-primary-hover">Forgot password?</a>
                </div>
              }
              <ShimmerButton type="submit">
                {authMethod === 'email' ? 'Sign in' : (authMethod === 'phone' ? 'Send Code' : 'Send Magic Link')}
              </ShimmerButton>
            </form>
            <div className="text-center text-sm"><p className="text-text-secondary">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('signup'); setAuthMethod('email'); }} className="font-medium text-primary hover:text-primary-hover">Sign up</a></p></div>
          </>
        )}
        
        {view === 'signup' && (
          <>
            <div className="mb-4 flex border-b border-border-color">
              <button onClick={() => setAuthMethod('email')} className={`flex-1 py-2 text-sm font-medium ${authMethod === 'email' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Sign up with Email</button>
              <button onClick={() => setAuthMethod('phone')} className={`flex-1 py-2 text-sm font-medium ${authMethod === 'phone' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Sign up with Phone</button>
            </div>
            <form className="space-y-6" onSubmit={handleSignUpSubmit}>
              {authMethod === 'email' ? (
                  <div className="space-y-4">
                      <input type="text" autoComplete="given-name" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      <input type="text" autoComplete="family-name" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      <input type="email" autoComplete="email" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <input type="password" autoComplete="new-password" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <input type="password" autoComplete="new-password" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
              ) : (
                  <div className="space-y-4">
                      <input type="text" autoComplete="given-name" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      <input type="text" autoComplete="family-name" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      <PhoneInput placeholder="Phone number" value={phoneNumber} onChange={setPhoneNumber} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary sm:text-sm" />
                  </div>
              )}
              <ShimmerButton type="submit">
                  {authMethod === 'email' ? 'Sign up' : 'Send Code'}
              </ShimmerButton>
              <div className="text-center text-sm"><p className="text-text-secondary">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); }} className="font-medium text-primary hover:text-primary-hover">Sign in</a></p></div>
            </form>
          </>
        )}

        {view === 'phone_verify' && ( <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}> <input type="text" autoComplete="one-time-code" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} /> <div className="text-sm"><a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); setAuthMethod('phone'); }} className="font-medium text-primary hover:text-primary-hover">Change phone number</a></div> <ShimmerButton type="submit">Verify and Sign In</ShimmerButton> </form> )}
        {view === 'reset' && ( <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}> <input type="email" autoComplete="email" required className="w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} /> <div className="text-sm"><a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); }} className="font-medium text-primary hover:text-primary-hover">Back to Sign in</a></div> <ShimmerButton type="submit">Send Reset Link</ShimmerButton> </form> )}
        {view === 'reset_sent' && <div className="text-center"><button onClick={() => setView('signin')} className="font-medium text-primary hover:text-primary-hover text-sm">Back to Sign in</button></div>}

      </div>
    </div>
  );
};

export default LoginPage;
