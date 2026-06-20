import React, { useState, useEffect } from 'react';
import { db, getUserDataByPhone } from '../../firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';

interface DepositProps {
  user: any;
  onUpdateUser: (updated: any) => void;
  onClose: () => void;
  onOpenHistory: () => void;
}

export default function Deposit({ user, onUpdateUser, onClose, onOpenHistory }: DepositProps) {
  const [step, setStep] = useState<'select_amount' | 'payment_gateway'>('select_amount');
  const [selectedMethod, setSelectedMethod] = useState<'BKASH' | 'NAGAD' | 'UPAY' | 'CELLFIN'>('BKASH');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<'EN' | 'বাং'>('বাং');
  const [timeLeft, setTimeLeft] = useState(90); // 1.5 minutes = 90 seconds

  const personalNumber = '01333468617';

  // Countdown timer effect
  useEffect(() => {
    if (step === 'payment_gateway') {
      setTimeLeft(90);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Handle timer expiration
  useEffect(() => {
    if (step === 'payment_gateway' && timeLeft === 0) {
      if (lang === 'বাং') {
        alert('⏰ ১.৫ (দেড়) মিনিটের সময় অতিক্রম হয়েছে! নতুন করে পেমেন্ট করার জন্য এগিয়ে যান এবং সময়সীমার মধ্যে TrxID ট্র্যাকার সাবমিট করুন।');
      } else {
        alert('⏰ 1.5 minutes time limit exceeded! Please try again and complete submission within the time limit.');
      }
      setStep('select_amount');
    }
  }, [timeLeft, step, lang]);

  const handleRefreshBalance = async () => {
    if (!user || !user.phone) return;
    setRefreshing(true);
    try {
      const freshData = await getUserDataByPhone(user.phone);
      if (freshData) {
        onUpdateUser(freshData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  const validateTrxId = (method: 'BKASH' | 'NAGAD' | 'UPAY' | 'CELLFIN', value: string) => {
    const cleanVal = value.trim().toUpperCase();
    if (method === 'BKASH') {
      return /^[A-Z0-9]{9,10}$/.test(cleanVal);
    } else if (method === 'NAGAD') {
      return /^NG[A-Z0-9]{8}$/.test(cleanVal);
    } else if (method === 'UPAY') {
      return /^UP[A-Z0-9]{8}$/.test(cleanVal);
    } else if (method === 'CELLFIN') {
      return /^SF[A-Z0-9]{8}$/.test(cleanVal);
    }
    return false;
  };

  const getExpectedFormatHelp = (method: 'BKASH' | 'NAGAD' | 'UPAY' | 'CELLFIN') => {
    if (lang === 'বাং') {
      switch (method) {
        case 'BKASH':
          return 'বিকাশ ট্রানজেকশন আইডি অবশ্যই ৯ বা ১০ অক্ষরের Alphanumeric হতে হবে। (যেমন: D9A7D3F2K বা DK4M8P1Q7R)';
        case 'NAGAD':
          return 'নগদ ট্রানজেকশন আইডি অবশ্যই ১০ অক্ষরের হতে হবে এবং এটি "NG" দিয়ে শুরু হতে হবে। (যেমন: NG5X2C8V1B)';
        case 'UPAY':
          return 'ইউপে ট্রানজেকশন আইডি অবশ্যই ১০ অক্ষরের হতে হবে এবং এটি "UP" দিয়ে শুরু হতে হবে। (যেমন: UP3K8R2M5N)';
        case 'CELLFIN':
          return 'সেলফিন ট্রানজেকশন আইডি অবশ্যই ১০ অক্ষরের হতে হবে এবং এটি "SF" দিয়ে শুরু হতে হবে। (যেমন: SF8P4D2K9X)';
      }
    } else {
      switch (method) {
        case 'BKASH':
          return 'bKash Transaction ID must be 9 or 10 alphanumeric characters. (e.g., D9A7D3F2K or DK4M8P1Q7R)';
        case 'NAGAD':
          return 'Nagad Transaction ID must be 10 characters and start with "NG". (e.g., NG5X2C8V1B)';
        case 'UPAY':
          return 'Upay Transaction ID must be 10 characters and start with "UP". (e.g., UP3K8R2M5N)';
        case 'CELLFIN':
          return 'Cellfin Transaction ID must be 10 characters and start with "SF". (e.g., SF8P4D2K9X)';
      }
    }
  };

  const executeDeposit = async () => {
    if (!selectedAmount) {
      alert("Please select a deposit amount first!");
      return;
    }
    
    const cleanId = txId.trim().toUpperCase();
    if (!cleanId) {
      if (lang === 'বাং') {
        alert("অনুগ্রহ করে আপনার ক্যাশআউটের TrxID নাম্বারটি ইনপুট ফিল্ডে লিখুন!");
      } else {
        alert("Please enter your cashout TrxID in the input field!");
      }
      return;
    }

    // Format validation
    if (!validateTrxId(selectedMethod, cleanId)) {
      alert(getExpectedFormatHelp(selectedMethod));
      return;
    }

    setLoading(true);

    try {
      // 1. Check for duplicate TxID across ALL users' depositLogs
      const usersRef = collection(db, 'users');
      const allUsersSnap = await getDocs(usersRef);
      let duplicateFound = false;

      allUsersSnap.forEach((uDoc) => {
        const uData = uDoc.data();
        if (uData.depositLogs && Array.isArray(uData.depositLogs)) {
          const found = uData.depositLogs.some(
            (log: any) => log.txid && log.txid.trim().toUpperCase() === cleanId
          );
          if (found) {
            duplicateFound = true;
          }
        }
      });

      if (duplicateFound) {
        if (lang === 'বাং') {
          alert('🚫 এই ট্রানজেকশন আইডিটি ইতিমধ্যে একবার ব্যবহার করা হয়েছে! একই ট্র্যাকার আইডি দিয়ে দুইবার পেমেন্ট করা সম্ভব নয়।');
        } else {
          alert('🚫 This Transaction ID has already been used! You cannot submit the same transaction ID twice.');
        }
        setLoading(false);
        return;
      }

      // 2. Process deposit
      const userRef = doc(db, 'users', user.phone);
      const paymentAmount = Number(selectedAmount);
      const newBalance = (user.balance || 0) + paymentAmount;
      
      const depositLog = {
        amount: paymentAmount,
        method: selectedMethod === 'BKASH' ? 'বিকাশ' : selectedMethod === 'NAGAD' ? 'নগদ' : selectedMethod === 'UPAY' ? 'ইউপে' : 'সেলফিন',
        txid: cleanId,
        status: 'সফল',
        date: new Date().toLocaleDateString('bn-BD'),
        time: new Date().toLocaleTimeString('bn-BD')
      };
      
      const existingLogs = user.depositLogs || [];
      const updatedLogs = [depositLog, ...existingLogs];

      // Delay for realistic verification feeling
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await updateDoc(userRef, { 
        balance: newBalance,
        depositLogs: updatedLogs
      });

      onUpdateUser({ 
        ...user, 
        balance: newBalance,
        depositLogs: updatedLogs
      });

      if (lang === 'বাং') {
        alert(`🎉 সফল ডিপোজিট!\nটাকা সফলভাবে পেমেন্ট করা হয়েছে।\nমেথড: ${selectedMethod === 'BKASH' ? 'বিকাশ' : selectedMethod === 'NAGAD' ? 'নগদ' : selectedMethod === 'UPAY' ? 'ইউপে' : 'সেলফিন'}\nপরিমাণ: ৳${paymentAmount}\nট্রানজেকশন আইডি: ${cleanId}`);
      } else {
        alert(`🎉 Deposit Successful!\nPayment processed successfully.\nMethod: ${selectedMethod}\nAmount: ৳${paymentAmount}\nTransaction ID: ${cleanId}`);
      }
      
      setTxId('');
      setSelectedAmount(null);
      setStep('select_amount');
      onClose(); // Auto navigate back on success
    } catch (err: any) {
      console.error(err);
      if (lang === 'বাং') {
        alert('ডিপোজিট প্রসেসিং করার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন!');
      } else {
        alert('Something went wrong processing your deposit. Please try again!');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMethodDetails = () => {
    switch (selectedMethod) {
      case 'BKASH':
        return {
          name: 'bKash',
          bnName: 'বিকাশ',
          logo: 'https://i.postimg.cc/854NKY48/images-(16).jpg',
          color: '#e2136e',
          accentBg: '#fdf0f7'
        };
      case 'NAGAD':
        return {
          name: 'Nagad',
          bnName: 'নগদ',
          logo: 'https://i.postimg.cc/VkvrjqYL/images-(16).jpg',
          color: '#ef4444',
          accentBg: '#fff0e6'
        };
      case 'UPAY':
        return {
          name: 'Upay',
          bnName: 'ইউপে',
          logo: 'https://i.postimg.cc/mDYtbVSm/unnamed.png',
          color: '#005bc4',
          accentBg: '#eff6ff'
        };
      case 'CELLFIN':
        return {
          name: 'Cellfin',
          bnName: 'সেলফিন',
          logo: 'https://i.postimg.cc/sxKxWXqR/images-(17).jpg',
          color: '#00875a',
          accentBg: '#f0fdf4'
        };
    }
  };

  const methodDetails = getMethodDetails();

  const handleWalletCopy = () => {
    navigator.clipboard.writeText(personalNumber).then(() => {
      if (lang === 'বাং') {
        alert("নম্বরটি কপি করা হয়েছে: " + personalNumber);
      } else {
        alert("Number copied: " + personalNumber);
      }
    }).catch(err => {
      console.error(err);
    });
  };

  if (step === 'payment_gateway') {
    return (
      <div className="flex justify-center items-start min-h-screen w-full bg-[#f3f4f6] text-slate-800 font-sans">
        <style>{`
          .gateway-container {
              width: 100%;
              max-width: 450px;
              background-color: #ffffff;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              position: relative;
              padding-bottom: 30px;
          }

          /* Top Green Bar */
          .top-green-bar {
              background-color: #005c3a;
              color: #ffffff;
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
          }

          .header-left-text {
              line-height: 1.4;
          }

          .bdt-amount {
              font-size: 18px;
              font-weight: 700;
          }

          .warning-subtext {
              font-size: 13px;
              font-weight: 500;
          }

          .header-right-side {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 6px;
          }

          .pay-service-tag {
              background-color: #ffffff;
              color: #005c3a;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 1px;
              border: 1px solid #ffffff;
          }

          .pay-service-tag span {
              color: #ffffff;
              background-color: #005c3a;
              padding: 0px 4px;
              margin-right: 2px;
              border-radius: 2px;
          }

          /* Language Switcher */
          .lang-switch {
              display: flex;
              background-color: #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
              padding: 2px;
              width: fit-content;
          }

          .lang-btn {
              font-size: 10px;
              padding: 2px 6px;
              border: none;
              cursor: pointer;
              font-weight: 600;
              background: transparent;
              color: #4b5563;
              outline: none;
          }

          .lang-btn.active {
              background-color: #ffffff;
              color: #000000;
              border-radius: 3px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          /* Main Content Body */
          .gateway-body {
              padding: 20px 16px;
              text-align: left;
          }

          /* Red Alert Text */
          .red-alert-text {
              color: #e11d48;
              font-size: 14px;
              font-weight: 600;
              line-height: 1.5;
              margin-bottom: 20px;
          }

          /* Deposit Banner Button */
          .nagad-deposit-banner {
              background-color: ${methodDetails.color};
              color: #ffffff;
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 14px;
              border-radius: 8px;
              margin-bottom: 20px;
          }

          .nagad-logo-wrap {
              width: 44px;
              height: 44px;
              background-color: #ffffff;
              border-radius: 50%;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              border: 1.5px solid #ffffff;
          }

          .nagad-logo-wrap img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }

          .banner-title {
              font-size: 16px;
              font-weight: 600;
              letter-spacing: 0.3px;
          }

          /* Wallet Number Section */
          .wallet-section {
              margin-bottom: 24px;
          }

          .section-label {
              font-size: 15px;
              font-weight: 700;
              color: #111111;
              margin-bottom: 6px;
          }

          .section-label span {
              color: #ef4444;
          }

          .info-subtext {
              font-size: 13.5px;
              color: #374151;
              font-weight: 500;
              margin-bottom: 10px;
          }

          /* Copy Box */
          .copy-box-field {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #f3f4f6;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px 14px;
          }

          .number-display {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              letter-spacing: 0.5px;
          }

          .copy-action-btn {
              cursor: pointer;
              display: flex;
              align-items: center;
              background: none;
              border: none;
              outline: none;
          }

          .copy-action-btn svg {
              width: 22px;
              height: 22px;
              fill: #059669;
          }

          /* Input Section Area */
          .input-section {
              margin-bottom: 24px;
          }

          .trx-input-field {
              width: 100%;
              border: 2px solid ${methodDetails.color}; /* Color matches brand */
              border-radius: 6px;
              padding: 14px;
              font-size: 15px;
              color: #374151;
              outline: none;
              background-color: #ffffff;
          }

          .trx-input-field::placeholder {
              color: #9ca3af;
              font-weight: 400;
          }

          /* Confirm Button */
          .submit-btn-wrap {
              display: flex;
              justify-content: center;
              margin-bottom: 24px;
          }

          .confirm-button {
              background-color: #ffffff;
              color: #000000;
              border: 1.5px solid #000000;
              border-radius: 8px;
              padding: 10px 45px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
              transition: all 0.2s;
              outline: none;
          }

          .confirm-button:active {
              background-color: #f9fafb;
              transform: scale(0.98);
          }

          /* Bottom Warning Notes */
          .bottom-warning-notes {
              border-top: 1px dashed #e5e7eb;
              padding-top: 14px;
          }

          .warning-heading {
              font-size: 14px;
              font-weight: 700;
              color: #111111;
              margin-bottom: 4px;
          }

          .warning-bold-red {
              color: #ef4444;
              font-size: 12px;
              font-weight: 700;
              line-height: 1.5;
              margin-bottom: 6px;
          }

          .warning-normal-gray {
              color: #6b7280;
              font-size: 11.5px;
              font-weight: 500;
              line-height: 1.6;
          }
        `}</style>

        <div className="gateway-container">
          {/* Top Green Bar */}
          <div className="top-green-bar">
            <div className="header-left-text">
              <div className="bdt-amount">BDT {selectedAmount}</div>
              <div className="warning-subtext">
                {lang === 'বাং' ? 'কম বা বেশি ক্যাশআউট করবেন না' : 'Do not cash out more or less'}
              </div>
            </div>
            <div className="header-right-side">
              <div className="pay-service-tag"><span>PAY</span>SERVICE</div>
              <div className="lang-switch">
                <button 
                  className={`lang-btn ${lang === 'EN' ? 'active' : ''}`}
                  onClick={() => setLang('EN')}
                >
                  EN
                </button>
                <button 
                  className={`lang-btn ${lang === 'বাং' ? 'active' : ''}`}
                  onClick={() => setLang('বাং')}
                >
                  বাং
                </button>
              </div>
            </div>
          </div>

          <main className="gateway-body">
            <button 
              onClick={() => setStep('select_amount')}
              className="mb-4 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-transparent border-none outline-none cursor-pointer p-0"
            >
              &#10094; {lang === 'বাং' ? 'ফিরে যান' : 'Go Back'}
            </button>

            {/* Visual Timer Badge */}
            <div className={`p-4 rounded-2xl mb-4 flex items-center justify-between border ${
              timeLeft <= 20 
                ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse font-bold' 
                : 'bg-indigo-50 border-indigo-100 text-indigo-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏳</span>
                <div>
                  <p className="text-xs font-extrabold leading-none">
                    {lang === 'বাং' ? 'পেমেন্ট ট্র্যাকার সময়সীমা' : 'Payment Tracker Time Limit'}
                  </p>
                  <p className="text-[10px] opacity-85 mt-1 font-medium">
                    {lang === 'বাং' ? 'এই সময়সীমার মধ্যে TrxID সাবমিট করুন' : 'Submit TrxID before timer ends'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black font-mono tracking-wider">
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>

            <div className="red-alert-text">
              {lang === 'বাং' 
                ? `আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT ${selectedAmount}), আপনি ক্রেডিট পেতে সক্ষম হবেন না।`
                : `If you change the amount of money (BDT ${selectedAmount}), you will not be able to get credit.`
              }
            </div>

            <div className="nagad-deposit-banner">
              <div className="nagad-logo-wrap">
                <img referrerPolicy="no-referrer" src={methodDetails.logo} alt={`${methodDetails.name} Logo`} />
              </div>
              <div className="banner-title">
                {methodDetails.name} Deposit
              </div>
            </div>

            <div className="wallet-section">
              <div className="section-label">
                Wallet No<span>*</span>
              </div>
              <div className="info-subtext">
                {lang === 'বাং' 
                  ? `নিচের ${methodDetails.bnName} নম্বরে শুধুমাত্র সেন্ড মানি/ক্যাশআউট গ্রহণ করা হয়`
                  : `Only send money/cashout is accepted on this ${methodDetails.name} number`
                }
              </div>
              
              <div className="copy-box-field">
                <span className="number-display" id="walletNumber">{personalNumber}</span>
                <button className="copy-action-btn" onClick={handleWalletCopy} title={lang === 'বাং' ? 'কপি করুন' : 'Copy Number'}>
                  <svg viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="input-section">
              <div className="section-label">
                {lang === 'বাং' 
                  ? 'লেনদেনের TrxID নাম্বারটি লিখুন'
                  : 'Enter transaction TrxID number'
                } <span>({lang === 'বাং' ? 'প্রয়োজন' : 'Required'})</span>
              </div>
              <input 
                type="text" 
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                disabled={loading}
                className="trx-input-field font-mono uppercase" 
                placeholder={lang === 'বাং' ? 'TrxID অবশ্যই পূরণ করতে হবে!' : 'TrxID must be filled!'} 
              />
            </div>

            <div className="submit-btn-wrap">
              <button 
                className="confirm-button" 
                disabled={loading}
                onClick={executeDeposit}
              >
                {loading 
                  ? (lang === 'বাং' ? 'যাচাই করা হচ্ছে...' : 'Verifying...') 
                  : (lang === 'বাং' ? 'নিশ্চিত' : 'Confirm')
                }
              </button>
            </div>

            <div className="bottom-warning-notes">
              <div className="warning-heading">
                {lang === 'বাং' ? 'সতর্কতাঃ' : 'Warning:'}
              </div>
              <div className="warning-bold-red">
                {lang === 'বাং' 
                  ? 'লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় স্কোর ব্যর্থ হবে!!'
                  : 'The transaction ID must be filled correctly, otherwise the score will fail!!'
                }
              </div>
              <div className="warning-normal-gray">
                {lang === 'বাং' 
                  ? `অনুগ্রহ করে নিশ্চিত হয়ে নিন যে আপনি ${methodDetails.bnName} deposit ওয়ালেট নাম্বারে ক্যাশ আউট/সেন্ডমানি করছেন। এই নাম্বারের অন্য কোন ওয়ালেট থেকে ক্যাশ আউট করলে সেই টাকা পাওয়ার কোন সম্ভাবনা নাই`
                  : `Please ensure that you are sending money/cashing out to the ${methodDetails.name} deposit wallet number. If you make a transfer to any other wallet on this number, there is no chance of receiving that credit.`
                }
              </div>
            </div>

          </main>
        </div>
      </div>
    );
  }

  // default view (select_amount step)
  return (
    <div className="flex justify-center items-start min-h-screen w-full bg-[#f3f4f6] text-slate-800">
      <style>{`
        .app-container {
            width: 100%;
            max-width: 450px;
            background-color: #f8f9fa;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            position: relative;
            padding-bottom: 180px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .app-header {
            background-color: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #efefef;
        }

        .back-btn {
            font-size: 20px;
            cursor: pointer;
            color: #333;
            font-weight: 600;
        }

        .header-title {
            font-size: 18px;
            color: #111;
            font-weight: 500;
        }

        .history-link {
            font-size: 13px;
            color: #444;
            text-decoration: none;
            font-weight: 500;
        }

        .content-body {
            padding: 14px;
            text-align: left;
        }

        /* Balance Card */
        .balance-card {
            background: linear-gradient(135deg, #f5c300, #f3be00);
            border-radius: 16px;
            padding: 18px;
            color: #ffffff;
            margin-bottom: 16px;
            box-shadow: 0 4px 12px rgba(243, 190, 0, 0.2);
        }

        .balance-title-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            opacity: 0.95;
            margin-bottom: 4px;
        }

        .balance-amount-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .balance-amount {
            font-size: 26px;
            font-weight: 700;
        }

        .refresh-icon {
            cursor: pointer;
            width: 16px;
            height: 16px;
            fill: #ffffff;
            transition: transform 0.4s ease;
        }

        /* Payment Grid */
        .payment-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
        }

        .method-box {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 12px 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s ease;
        }

        .method-bkash { background-color: #fdf0f7; }
        .method-nagad { background-color: #fff0e6; }
        .method-upay { background-color: #eff6ff; }
        .method-cellfin { background-color: #f0fdf4; }

        .method-box.selected {
            transform: scale(1.03);
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .method-box.selected.method-bkash { border-color: #e2136e; }
        .method-box.selected.method-nagad { border-color: #ff6b00; }
        .method-box.selected.method-upay { border-color: #005bc4; }
        .method-box.selected.method-cellfin { border-color: #00875a; }

        .logo-container {
            width: 55px;
            height: 55px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 6px;
            overflow: hidden;
        }

        .logo-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 10px;
        }

        .method-name {
            font-size: 11px;
            font-weight: 600;
            color: #222;
        }

        /* Amount Section */
        .amount-section-card {
            background-color: #ffffff;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }

        .section-title-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 15px;
            font-weight: 600;
            color: #222;
            margin-bottom: 14px;
        }

        .amount-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .amount-box {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
            font-size: 16px;
            font-weight: 500;
            color: #333;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .amount-box.selected {
            border-color: #111111;
            background-color: #f9fafb;
            font-weight: 600;
        }

        /* Footer Fixed */
        .footer-fixed {
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 450px;
            background-color: #ffffff;
            padding: 16px;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.03);
            border-radius: 20px 20px 0 0;
            z-index: 100;
        }

        .deposit-btn {
            width: 100%;
            transition: all 0.3s ease;
        }

        .recharge-info {
            margin-top: 12px;
            font-size: 11px;
            color: #666;
            text-align: left;
        }

        .recharge-info strong {
            color: #000;
            display: block;
            font-size: 13px;
            margin-top: 1px;
            text-transform: uppercase;
        }
      `}</style>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="back-btn" onClick={onClose}>&#10094;</div>
          <div className="header-title">Deposit</div>
          <button onClick={onOpenHistory} className="history-link bg-transparent border-none outline-none">
            Deposit history
          </button>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {/* Balance Card */}
          <div className="balance-card">
            <div className="balance-title-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: '2px' }}>
                <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z"/>
              </svg>
              Balance
            </div>
            <div className="balance-amount-row">
              <span className="balance-amount">৳{(user?.balance || 0).toFixed(2)}</span>
              <svg 
                className={`refresh-icon ${refreshing ? 'animate-spin' : ''}`} 
                viewBox="0 0 24 24" 
                onClick={handleRefreshBalance}
              >
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </div>
          </div>

          {/* Payment Grid */}
          <div className="payment-grid">
            <div 
              className={`method-box method-bkash ${selectedMethod === 'BKASH' ? 'selected' : ''}`} 
              onClick={() => setSelectedMethod('BKASH')}
            >
              <div className="logo-container">
                <img referrerPolicy="no-referrer" src="https://i.postimg.cc/854NKY48/images-(16).jpg" alt="bKash" className="logo-img" />
              </div>
              <span className="method-name">bKash</span>
            </div>

            <div 
              className={`method-box method-nagad ${selectedMethod === 'NAGAD' ? 'selected' : ''}`} 
              onClick={() => setSelectedMethod('NAGAD')}
            >
              <div className="logo-container">
                <img referrerPolicy="no-referrer" src="https://i.postimg.cc/VkvrjqYL/images-(16).jpg" alt="Nagad" className="logo-img" />
              </div>
              <span className="method-name">Nagad</span>
            </div>

            <div 
              className={`method-box method-upay ${selectedMethod === 'UPAY' ? 'selected' : ''}`} 
              onClick={() => setSelectedMethod('UPAY')}
            >
              <div className="logo-container">
                <img referrerPolicy="no-referrer" src="https://i.postimg.cc/mDYtbVSm/unnamed.png" alt="Upay" className="logo-img" />
              </div>
              <span className="method-name">Upay</span>
            </div>

            <div 
              className={`method-box method-cellfin ${selectedMethod === 'CELLFIN' ? 'selected' : ''}`} 
              onClick={() => setSelectedMethod('CELLFIN')}
            >
              <div className="logo-container">
                <img referrerPolicy="no-referrer" src="https://i.postimg.cc/sxKxWXqR/images-(17).jpg" alt="Cellfin" className="logo-img" />
              </div>
              <span className="method-name">Cellfin</span>
            </div>
          </div>

          {/* Amount Section */}
          <div className="amount-section-card">
            <div className="section-title-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffaa00">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2-.9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
              Deposit amount
            </div>
            
            <div className="amount-grid">
              {[150, 250, 300, 500, 740].map((amt) => (
                <div 
                  key={amt}
                  className={`amount-box ${selectedAmount === amt ? 'selected' : ''}`} 
                  onClick={() => setSelectedAmount(amt)}
                >
                  ৳ {amt}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer Fixed Panel */}
        <footer className="footer-fixed">
          <button 
            id="mainDepositBtn" 
            onClick={() => {
              if (!selectedAmount) {
                alert("Please select a deposit amount first!");
                return;
              }
              setStep('payment_gateway');
            }}
            className="deposit-btn border-none py-3.5 text-base font-bold rounded-xl text-center"
            style={{
              backgroundColor: selectedAmount ? '#6366f1' : '#cbcee0',
              color: selectedAmount ? '#ffffff' : '#4a4a4a',
              cursor: selectedAmount ? 'pointer' : 'not-allowed'
            }}
          >
            এগিয়ে যান
          </button>
          
          <div className="recharge-info">
            Recharge Method:
            <strong id="methodLabel">{selectedMethod}</strong>
          </div>
        </footer>
      </div>
    </div>
  );
}
