import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { REFERRAL_POOL } from './referrals';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const assignNextCustomUid = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('customUid', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uData = snap.docs[0].data();
      if (uData.customUid && typeof uData.customUid === 'number') {
        return uData.customUid + 1;
      }
    }
  } catch (error) {
    // If index doesn't exist yet, fallback to random assignment
  }
  return 1037830 + Math.floor(Math.random() * 800000);
};

export const registerUser = async (phone: string, password: string, referredBy: string) => {
  const userRef = doc(db, 'users', phone);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    throw new Error("এই মোবাইল নাম্বার দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে!");
  }

  let referrerPhoneToReward = '';
  let referrerCurrentBalance = 0;

  // Verify referral code if provided
  if (referredBy && referredBy.trim() !== '') {
    const cleanReferredBy = referredBy.trim();
    const q = query(collection(db, 'users'), where('referCode', '==', cleanReferredBy));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('আপনার দেয়া আমন্ত্রণ কোডটি (Refer Code) সঠিক নয়!');
    } else {
      const referrerDoc = snap.docs[0];
      referrerPhoneToReward = referrerDoc.id;
      referrerCurrentBalance = referrerDoc.data().balance || 0;
    }
  }

  // Find a unique refer code quickly
  let assignedCode = '';
  for (let i = 0; i < 5; i++) {
    const randomCode = REFERRAL_POOL[Math.floor(Math.random() * REFERRAL_POOL.length)];
    const q = query(collection(db, 'users'), where('referCode', '==', randomCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      assignedCode = randomCode;
      break;
    }
  }

  // Fallback in case pool is full or checks failed
  if (!assignedCode) {
    assignedCode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  const nextCustomUid = await assignNextCustomUid();

  // Initial bonus 50 for the new user, save assignedCode of the user
  const userData = { 
    phone, 
    password, 
    referCode: assignedCode, 
    referredBy: referredBy.trim() || null,
    balance: 50,
    customUid: nextCustomUid
  };
  
  await setDoc(userRef, userData);

  // Instantly reward the referrer with 50 TK
  if (referrerPhoneToReward) {
    await updateDoc(doc(db, 'users', referrerPhoneToReward), {
      balance: referrerCurrentBalance + 50
    });
  }

  return { ...userData, isNewRegistration: true };
};


export const loginUser = async (phone: string, password: string) => {
  const userRef = doc(db, 'users', phone);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.password === password) {
       const updatedData = await getUserDataByPhone(phone);
       return updatedData || data;
    }
  }
  throw new Error("মোবাইল নাম্বার অথবা পাসওয়ার্ডটি সঠিক নয়!");
};

// Firestore helper
export const getUserDataByPhone = async (phone: string) => {
  const docRef = doc(db, 'users', phone);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    let data = docSnap.data();
    let needsUpdate = false;
    const updatePayload: any = {};

    // Assign customUid sequentially if not already present
    if (!data.customUid || typeof data.customUid !== 'number') {
      const nextCustomUid = await assignNextCustomUid();
      updatePayload.customUid = nextCustomUid;
      data.customUid = nextCustomUid;
      needsUpdate = true;
    }

    // If they have no refer code, or their refer code is not in the 200 REFERRAL_POOL,
    // we automatically assign them a valid code from our REFERRAL_POOL!
    if (!data.referCode || !REFERRAL_POOL.includes(data.referCode)) {
      const usersRef = collection(db, 'users');
      const allUsersSnap = await getDocs(usersRef);
      const takenCodes = new Set<string>();
      allUsersSnap.forEach((uDoc) => {
        const uData = uDoc.data();
        if (uData.referCode && REFERRAL_POOL.includes(uData.referCode)) {
          takenCodes.add(uData.referCode);
        }
      });

      let assignedCode = '';
      for (const code of REFERRAL_POOL) {
        if (!takenCodes.has(code)) {
          assignedCode = code;
          break;
        }
      }

      if (assignedCode) {
        updatePayload.referCode = assignedCode;
        data.referCode = assignedCode;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await updateDoc(docRef, updatePayload);
    }
    return data;
  }
  return null;
};

export const getReferralsCountAndIncome = async (referCode: string) => {
  if (!referCode) return { count: 0, income: 0 };
  const q = query(collection(db, 'users'), where('referredBy', '==', referCode));
  const snap = await getDocs(q);
  const count = snap.size;
  const income = count * 50; // Each referral yields 50 TK
  return { count, income };
};

export const buyUserPackage = async (phone: string, price: number, packageTitle: string) => {
  const userRef = doc(db, 'users', phone);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('ব্যবহারকারী সন্ধান পাওয়া যায়নি!');
  }
  const currentBalance = snap.data().balance || 0;
  if (currentBalance < price) {
    throw new Error(`আপনার পর্যাপ্ত ব্যালেন্স নেই! প্যাকেজের দাম ${price} ৳, আপনার ব্যালেন্স ${currentBalance} ৳। অনুগ্রহ করে ডিপোজিট করুন।`);
  }

  // Determine daily income rate based on price
  let dailyRate = 0;
  let dailyBonus = 0;
  if (price === 150) {
    dailyRate = 15;
    dailyBonus = 1;
  } else if (price === 250) {
    dailyRate = 25;
    dailyBonus = 2;
  } else if (price === 300) {
    dailyRate = 30;
    dailyBonus = 3;
  } else if (price === 500) {
    dailyRate = 40;
    dailyBonus = 5;
  } else if (price === 840) {
    dailyRate = 60;
    dailyBonus = 8;
  } else {
    // fallback
    dailyRate = Math.floor(price / 10);
    dailyBonus = Math.floor(price / 100);
  }
  
  await updateDoc(userRef, {
    balance: currentBalance - price,
    hasActivePackage: true,
    activePackageTitle: packageTitle,
    packagePrice: price,
    dailyIncomeRate: dailyRate,
    dailyBonusRate: dailyBonus,
    lastClaimedDate: null,
    lastBonusClaimedDate: null
  });

  return { 
    balance: currentBalance - price, 
    hasActivePackage: true, 
    activePackageTitle: packageTitle,
    packagePrice: price,
    dailyIncomeRate: dailyRate,
    dailyBonusRate: dailyBonus,
    lastClaimedDate: null,
    lastBonusClaimedDate: null
  };
};

export const checkReferredPackagesStatus = async (referCode: string) => {
  if (!referCode) return { hasAnyReferralWithPackage: false, referredCount: 0 };
  const q = query(collection(db, 'users'), where('referredBy', '==', referCode));
  const snap = await getDocs(q);
  
  let hasAnyReferralWithPackage = false;
  const referredCount = snap.size;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.hasActivePackage === true) {
      hasAnyReferralWithPackage = true;
    }
  });

  return { hasAnyReferralWithPackage, referredCount };
};

export const claimDailyIncome = async (phone: string, isTestOverride: boolean = false) => {
  const userRef = doc(db, 'users', phone);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('ব্যবহারকারী সন্ধান পাওয়া যায়নি!');
  }
  const data = snap.data();
  if (!data.hasActivePackage) {
    throw new Error('আপনার কোনো একটিভ প্যাকেজ নেই! দয়া করে হোম থেকে প্যাকেজ কিনুন।');
  }

  const dailyRate = data.dailyIncomeRate || 0;
  if (dailyRate <= 0) {
    throw new Error('আপনার একটিভ প্যাকেজের ডেইলি আয় নির্ধারণ করা হয়নি!');
  }

  const now = new Date();
  const currentHour = now.getHours();

  if (!isTestOverride && currentHour < 20) {
    throw new Error('আজকের ডেইলি ইনকাম রাত ০৮:০০ টার পর ক্লেম করতে পারবেন!');
  }

  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  if (data.lastClaimedDate === todayStr) {
    throw new Error('আপনি আজকের ইনকাম ইতিমধ্যেই সফলভাবে ক্লেম করেছেন!');
  }

  const currentBalance = data.balance || 0;
  const newBalance = currentBalance + dailyRate;

  await updateDoc(userRef, {
    balance: newBalance,
    lastClaimedDate: todayStr,
    lastClaimedAt: now.toISOString()
  });

  return {
    balance: newBalance,
    lastClaimedDate: todayStr,
    lastClaimedAt: now.toISOString()
  };
};

export const claimNightlyBonus = async (phone: string, isTestOverride: boolean = false) => {
  const userRef = doc(db, 'users', phone);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('ব্যবহারকারী সন্ধান পাওয়া যায়নি!');
  }
  const data = snap.data();
  if (!data.hasActivePackage) {
    throw new Error('আপনার কোনো একটিভ প্যাকেজ নেই! দয়া করে হোম থেকে প্যাকেজ কিনুন।');
  }

  // Determine bonus rate (1, 2, 3, 5, 8 based on price)
  let bonusRate = data.dailyBonusRate || 0;
  if (bonusRate <= 0) {
    // calculate fallback based on price
    const price = data.packagePrice || 0;
    if (price === 150) bonusRate = 1;
    else if (price === 250) bonusRate = 2;
    else if (price === 300) bonusRate = 3;
    else if (price === 500) bonusRate = 5;
    else if (price === 840) bonusRate = 8;
    else {
      bonusRate = Math.floor(price / 100) || 1;
    }
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Removed time restriction as per user request
  // if (!isTestOverride && currentHour < 20) {
  //   throw new Error('এই বোনাসটি শুধুমাত্র প্রতিদিন রাত ০৮:০০ টার পর দাবি করা যাবে!');
  // }

  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  if (data.lastBonusClaimedDate === todayStr) {
    throw new Error('আপনি আজকের প্যাকেজ বোনাস ইতিমধ্যেই সফলভাবে দাবি করেছেন!');
  }

  const currentBalance = data.balance || 0;
  const newBalance = currentBalance + bonusRate;

  await updateDoc(userRef, {
    balance: newBalance,
    lastBonusClaimedDate: todayStr,
    lastBonusClaimedAt: now.toISOString()
  });

  return {
    balance: newBalance,
    lastBonusClaimedDate: todayStr,
    lastBonusClaimedAt: now.toISOString(),
    claimedBonusAmount: bonusRate
  };
};


