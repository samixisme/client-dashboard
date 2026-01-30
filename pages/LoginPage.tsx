import React, { useState, useEffect, useRef } from 'react';
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
  sendSignInLinkToEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ShimmerButton from '../components/ShimmerButton';
import { gsap } from "gsap";
import TabSwitcher from '../components/TabSwitcher';

interface LoginPageProps {
  onLogin: (status: string) => void;
}

interface WindowWithRecaptcha extends Window {
  recaptchaVerifier?: RecaptchaVerifier;
}

interface UserProfile {
  email: string;
  phoneNumber: string;
  status: string;
  role: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  name: string;
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
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const formContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" });
    }
  }, [view]);
  
  useEffect(() => {
    if (formContentRef.current) {
      gsap.fromTo(formContentRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" });
    }
  }, [authMethod]);

  useEffect(() => {
    if ((view === 'signin' || view === 'signup') && authMethod === 'phone' && !(window as WindowWithRecaptcha).recaptchaVerifier) {
      (window as WindowWithRecaptcha).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible', 'callback': () => {} });
      (window as WindowWithRecaptcha).recaptchaVerifier.render();
    }
  }, [view, authMethod]);

  useEffect(() => {
    setOtp(otpValues.join(''));
  }, [otpValues]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const checkUserStatus = async (user: FirebaseUser, additionalData?: { firstName?: string; lastName?: string; email?: string }) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data().status;
    }

    // New document creation logic
    const newUserProfile: UserProfile = {
      email: user.email || additionalData?.email || '',
      phoneNumber: user.phoneNumber || '',
      status: 'pending',
      role: 'client', // Add default role here
      createdAt: new Date(),
      firstName: '',
      lastName: '',
      name: '',
    };

    let fName = additionalData?.firstName || '';
    let lName = additionalData?.lastName || '';

    // If no name from form, try to get from Google displayName
    if ((!fName || !lName) && user.displayName) {
      const nameParts = user.displayName.split(' ');
      fName = nameParts[0] || '';
      lName = nameParts.slice(1).join(' ') || '';
    }
    
    newUserProfile.firstName = fName;
    newUserProfile.lastName = lName;
    newUserProfile.name = `${fName} ${lName}`.trim();

    if (!newUserProfile.name) {
      newUserProfile.name = newUserProfile.email || newUserProfile.phoneNumber || 'Unnamed User';
    }

    try {
      await setDoc(userDocRef, newUserProfile);
    } catch (e) {
      console.error("Failed to write user doc:", e);
    }
    return 'pending';
  };

  const handleEmailSignIn = async () => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      signInWithEmailAndPassword(auth, email, password)
        .then(async ({ user }) => onLogin(await checkUserStatus(user)))
        .catch((err) => setError(getErrorMessage(err.code)));
    } catch (error) {
      console.error("Error setting persistence", error);
    }
  };
  
  const handlePhoneRequest = (isResend = false) => {
    if (!phoneNumber || !isPossiblePhoneNumber(phoneNumber)) { setError("Please enter a valid phone number."); return; }
    const appVerifier = (window as WindowWithRecaptcha).recaptchaVerifier;
    
    // Phone auth persistence handled by firebase automatically but we can set it before
    setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
        .then(() => {
            return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        })
        .then((result) => {
            setConfirmationResult(result);
            setView('phone_verify');
            setResendTimer(60);
            if (isResend) {
            setError(null); 
            }
        })
        .catch(() => {
            setError("Failed to send code. Check the number and try again.");
            if (isResend) {
            setResendTimer(10); 
            }
        });
  };

  const handleResendCode = () => {
    if (resendTimer > 0) return;
    handlePhoneRequest(true);
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
      
      // For email link sign-in, persistence is usually set when completing the sign-in, 
      // but we can set the preference here for consistency if the flow supports it later.
      // The actual sign-in happens when they click the link, often in a new tab/window.
      window.localStorage.setItem('emailForSignIn', email);
      
      const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      setView('email_link_sent');
    } catch (err) {
      setError("Could not send magic link. Please try again.");
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === 'email') {
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      
      setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      .then(() => {
        return createUserWithEmailAndPassword(auth, email, password);
      })
        .then(async ({ user }) => {
          await setDoc(doc(db, "users", user.uid), { email: user.email, firstName, lastName, name: `${firstName} ${lastName}`, status: 'pending', role: 'client', createdAt: new Date() });
          onLogin('pending');
        })
        .catch((err) => setError(getErrorMessage(err.code)));
    } else {
        handlePhoneRequest();
    }
  };

  const handleGoogleSignIn = () => {
    setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    .then(() => {
        return signInWithPopup(auth, new GoogleAuthProvider());
    })
      .then(async ({ user }) => onLogin(await checkUserStatus(user, { firstName, lastName })))
      .catch((err) => setError(getErrorMessage(err.code)));
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    confirmationResult.confirm(otp)
      .then(async ({ user }) => onLogin(await checkUserStatus(user, { firstName, lastName })))
      .catch(() => setError("Invalid code. Please try again."));
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.substring(value.length - 1);
    setOtpValues(newOtpValues);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => isNaN(Number(char)))) return;
    
    const newOtpValues = [...otpValues];
    pastedData.forEach((char, i) => {
        if (i < 6) newOtpValues[i] = char;
    });
    setOtpValues(newOtpValues);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
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

  const handleTabChange = (newMethod: 'email' | 'phone' | 'link') => {
    if (newMethod === authMethod) return;
    if (formContentRef.current) {
        gsap.to(formContentRef.current, {
            opacity: 0,
            scale: 0.95,
            duration: 0.15,
            onComplete: () => {
                setAuthMethod(newMethod);
            }
        });
    } else {
        setAuthMethod(newMethod);
    }
  };
  
  const inputClasses = "h-[48px] w-full px-3 py-3 border border-border-color bg-glass-light rounded-lg sm:text-sm";

  const signInOptions = [
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'link', label: 'Magic Link' }
  ];

  const signUpOptions = [
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' }
  ];

  return (
    <div className="flex items-center justify-center h-screen bg-background py-10 px-4 overflow-hidden">
      <div id="recaptcha-container"></div>
      <div ref={formRef} className="w-full max-w-md max-h-[750px] h-auto flex flex-col bg-glass rounded-2xl shadow-lg border border-border-color overflow-hidden">
        <div className="p-10 pb-2 flex-shrink-0 flex flex-col items-center">
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

        {error && <p className="text-red-500 text-center text-sm px-10 mb-2">{error}</p>}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="pl-10 pr-8 pt-2 pb-10">
                {view === 'signin' && (
                <div className="space-y-8">
                    <ShimmerButton onClick={handleGoogleSignIn} type="button" variant="secondary">
                    <GoogleIcon className="w-5 h-5 mr-2" /> Sign in with Google
                    </ShimmerButton>
                    <div className="flex items-center justify-center"><div className="flex-grow border-t border-border-color"></div><span className="flex-shrink mx-4 text-sm text-text-secondary">Or</span><div className="flex-grow border-t border-border-color"></div></div>
                    <TabSwitcher options={signInOptions} activeOption={authMethod} onOptionClick={handleTabChange} />
                    <form className="space-y-6" onSubmit={handleSignInFormSubmit}>
                    <div ref={formContentRef}>
                        {authMethod === 'email' ? (
                        <div className="space-y-4">
                            <input type="email" autoComplete="email" required className={inputClasses} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <input type="password" autoComplete="current-password" required className={inputClasses} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        ) : authMethod === 'phone' ? (
                        <PhoneInput placeholder="Phone number" value={phoneNumber} onChange={setPhoneNumber} className="h-[48px] w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary sm:text-sm" />
                        ) : (
                        <input type="email" autoComplete="email" required className={inputClasses} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                        )}
                    </div>
                    { authMethod === 'email' && 
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-border-color bg-glass-light'}`}>
                                    {rememberMe && <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <label className="ml-2 block text-text-secondary cursor-pointer select-none">Remember me</label>
                            </div>
                            <a href="#" onClick={(e) => { e.preventDefault(); setView('reset'); }} className="font-medium text-primary hover:text-primary-hover">Forgot password?</a>
                        </div>
                    }
                    <ShimmerButton type="submit">
                        {authMethod === 'email' ? 'Sign in' : (authMethod === 'phone' ? 'Send Code' : 'Send Magic Link')}
                    </ShimmerButton>
                    </form>
                    <div className="text-center text-sm"><p className="text-text-secondary">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('signup'); setAuthMethod('email'); }} className="font-medium text-primary hover:text-primary-hover">Sign up</a></p></div>
                </div>
                )}
                
                {view === 'signup' && (
                <div className="space-y-8">
                    <ShimmerButton onClick={handleGoogleSignIn} type="button" variant="secondary">
                    <GoogleIcon className="w-5 h-5 mr-2" /> Sign up with Google
                    </ShimmerButton>
                    <div className="flex items-center justify-center"><div className="flex-grow border-t border-border-color"></div><span className="flex-shrink mx-4 text-sm text-text-secondary">Or</span><div className="flex-grow border-t border-border-color"></div></div>
                    <TabSwitcher options={signUpOptions} activeOption={authMethod} onOptionClick={handleTabChange} />
                    <form className="space-y-6" onSubmit={handleSignUpSubmit}>
                    <div ref={formContentRef}>
                        {authMethod === 'email' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary uppercase">Name</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" autoComplete="given-name" required className={inputClasses} placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                        <input type="text" autoComplete="family-name" required className={inputClasses} placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary uppercase">Email</label>
                                    <input type="email" autoComplete="email" required className={inputClasses} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary uppercase">Password</label>
                                    <div className="space-y-2">
                                        <input type="password" autoComplete="new-password" required className={inputClasses} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        <input type="password" autoComplete="new-password" required className={inputClasses} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary uppercase">Name</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" autoComplete="given-name" required className={inputClasses} placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                        <input type="text" autoComplete="family-name" required className={inputClasses} placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary uppercase">Phone Number</label>
                                    <PhoneInput placeholder="Phone number" value={phoneNumber} onChange={setPhoneNumber} className="h-[48px] w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary sm:text-sm" />
                                </div>
                            </div>
                        )}
                    </div>
                    <ShimmerButton type="submit">
                        {authMethod === 'email' ? 'Sign up' : 'Send Code'}
                    </ShimmerButton>
                    <div className="text-center text-sm"><p className="text-text-secondary">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); }} className="font-medium text-primary hover:text-primary-hover">Sign in</a></p></div>
                    </form>
                </div>
                )}

                {view === 'phone_verify' && (
                <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
                    <div className="flex justify-center gap-2">
                    {otpValues.map((digit, index) => (
                        <input
                        key={index}
                        ref={(el) => { if (el) inputRefs.current[index] = el; }}
                        type="text"
                        maxLength={1}
                        className="w-12 h-12 text-center text-xl font-bold border border-border-color bg-glass-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handlePaste}
                        />
                    ))}
                    </div>
                    <div className="text-sm text-center">
                    <p className="text-text-secondary mb-2">Didn't receive the code?</p>
                    <div className="flex justify-center items-center gap-4">
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resendTimer > 0}
                            className="font-medium text-primary hover:text-primary-hover disabled:text-text-secondary disabled:cursor-not-allowed"
                        >
                            Resend Code {resendTimer > 0 && `(${resendTimer}s)`}
                        </button>
                        <span className="text-border-color">|</span>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setView('signin'); setAuthMethod('phone'); }}
                            className="font-medium text-primary hover:text-primary-hover"
                        >
                            Change Number
                        </button>
                    </div>
                    </div>
                    <ShimmerButton type="submit">Verify</ShimmerButton>
                </form>
                )}
                {view === 'reset' && ( <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}> <input type="email" autoComplete="email" required className={inputClasses} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} /> <div className="text-sm"><a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); }} className="font-medium text-primary hover:text-primary-hover">Back to Sign in</a></div> <ShimmerButton type="submit">Send Reset Link</ShimmerButton> </form> )}
                {view === 'reset_sent' && <div className="text-center"><button onClick={() => setView('signin')} className="font-medium text-primary hover:text-primary-hover text-sm">Back to Sign in</button></div>}
            </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
