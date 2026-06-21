import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { REFERRAL_POOL } from './referrals';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

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
  let referrerCurrentReferralBalance = 0;
  let referrerHasPackage = false;

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
      referrerCurrentReferralBalance = referrerDoc.data().referralBalance || 0;
      referrerHasPackage = !!referrerDoc.data().hasActivePackage;
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

  // Initial bonus 50 for the new user, goes to referralBalance
  const userData = { 
    phone, 
    password, 
    referCode: assignedCode, 
    referredBy: referredBy.trim() || null,
    balance: 0,
    referralBalance: 50,
    customUid: nextCustomUid
  };
  
  await setDoc(userRef, userData);

  // Instantly reward the referrer with 50 TK
  if (referrerPhoneToReward) {
    if (referrerHasPackage) {
      await updateDoc(doc(db, 'users', referrerPhoneToReward), {
        balance: referrerCurrentBalance + 50
      });
    } else {
      await updateDoc(doc(db, 'users', referrerPhoneToReward), {
        referralBalance: referrerCurrentReferralBalance + 50
      });
    }
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

    // Fix dailyIncomeRate if missing or 0
    if (data.hasActivePackage && (!data.dailyIncomeRate || data.dailyIncomeRate <= 0)) {
      let dailyRate = 0;
      if (data.purchasedPackages && data.purchasedPackages.length > 0) {
        dailyRate = data.purchasedPackages.reduce((sum: number, pkg: any) => sum + (pkg.dailyRate || 0), 0);
      }
      if (dailyRate <= 0) {
        const legacyPrice = data.packagePrice || 0;
        if (legacyPrice === 150) dailyRate = 20;
        else if (legacyPrice === 250) dailyRate = 30;
        else if (legacyPrice === 300) dailyRate = 40;
        else if (legacyPrice === 500) dailyRate = 60;
        else if (legacyPrice === 800 || legacyPrice === 840) dailyRate = 80;
        else dailyRate = Math.floor(legacyPrice / 10);
      }
      if (dailyRate > 0) {
        updatePayload.dailyIncomeRate = dailyRate;
        data.dailyIncomeRate = dailyRate;
        needsUpdate = true;
      }
    }

    // Assign customUid sequentially if not already present
    if (!data.customUid || typeof data.customUid !== 'number') {
      const nextCustomUid = await assignNextCustomUid();
      updatePayload.customUid = nextCustomUid;
      data.customUid = nextCustomUid;
      needsUpdate = true;
    }

    // If they have no refer code, we automatically assign them a random code
    if (!data.referCode) {
      const assignedCode = 'REF' + Math.floor(1000 + Math.random() * 9000).toString();
      updatePayload.referCode = assignedCode;
      data.referCode = assignedCode;
      needsUpdate = true;
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
  const currentReferralBalance = snap.data().referralBalance || 0;
  
  const existingPackages = snap.data().purchasedPackages || [];
  if (snap.data().hasActivePackage === true && existingPackages.length === 0) {
    // Migrate legacy single package
    const legacyPrice = snap.data().packagePrice || 150;
    const legacyRate = snap.data().dailyIncomeRate || 20;
    const legacyTitle = snap.data().activePackageTitle || 'Level 1';
    existingPackages.push({
      id: 'legacy-' + Date.now().toString(),
      title: legacyTitle,
      price: legacyPrice,
      dailyRate: legacyRate,
      purchasedAt: snap.data().joinedAt || new Date().toISOString(),
      claimedCount: 0,
      totalEarned: 0
    });
  }

  if (existingPackages.length >= 3) {
    throw new Error('একটি একাউন্ট থেকে সর্বোচ্চ ৩টি প্যাকেজ কেনা যাবে!');
  }

  if (currentBalance < price) {
    throw new Error(`আপনার ডিপোজিট বা কাজের ব্যালেন্স পর্যাপ্ত নেই! প্যাকেজের দাম ${price} ৳, আপনার ব্যালেন্স ${currentBalance} ৳। (রেফার বোনাস দিয়ে প্যাকেজ কেনা যায় না, ডিপোজিট করে প্যাকেজ কিনলে রেফার বোনাস মূল ব্যালেন্সে যোগ হবে)।`);
  }

  // Determine daily income rate based on price
  let dailyRate = 0;
  let dailyBonus = 0;
  if (price === 150) {
    dailyRate = 20;
    dailyBonus = 1;
  } else if (price === 250) {
    dailyRate = 30;
    dailyBonus = 2;
  } else if (price === 300) {
    dailyRate = 40;
    dailyBonus = 3;
  } else if (price === 500) {
    dailyRate = 60;
    dailyBonus = 5;
  } else if (price === 800) {
    dailyRate = 80;
    dailyBonus = 8;
  } else {
    // fallback
    dailyRate = Math.floor(price / 10);
    dailyBonus = Math.floor(price / 100);
  }
  
  const balanceAfterPurchaseAndReferralUnlock = currentBalance - price + currentReferralBalance;
  
  const newPackage = {
    id: Date.now().toString(),
    title: packageTitle,
    price: price,
    dailyRate: dailyRate,
    purchasedAt: new Date().toISOString(),
    claimedCount: 0,
    totalEarned: 0
  };

  const updatedPackages = [...existingPackages, newPackage];
  // Calculate combined daily rate
  const combinedDailyRate = updatedPackages.reduce((acc, pkg) => acc + pkg.dailyRate, 0);

  // Note: we still set activePackageTitle to the latest one or maybe "Multiple Packages" if > 1
  const displayTitle = updatedPackages.length > 1 ? `${updatedPackages.length} টি প্যাকেজ` : packageTitle;

  // We should also calculate cumulative daily bonus
  let combinedDailyBonus = 0;
  if (snap.data().dailyBonusRate) {
    // wait we can just accumulate standard dailyBonus
    combinedDailyBonus = (snap.data().dailyBonusRate || 0) + dailyBonus;
  } else {
    combinedDailyBonus = dailyBonus;
  }

  await updateDoc(userRef, {
    balance: balanceAfterPurchaseAndReferralUnlock,
    referralBalance: 0,
    hasActivePackage: true,
    activePackageTitle: displayTitle,
    packagePrice: price,  // Just keeping the latest price for legacy fields
    dailyIncomeRate: combinedDailyRate,
    dailyBonusRate: combinedDailyBonus,
    purchasedPackages: updatedPackages,
    // Do not reset lastClaimedDate if they already have an active package, otherwise they can claim multiple times!
    // But previously it reset it. Let's keep existing logic but just comment... actually, if we reset it, they can claim instantly again.
    // user requested to see how many days it has been.
    ...(existingPackages.length === 0 ? { lastClaimedDate: null, lastClaimedAt: null, lastBonusClaimedDate: null, lastBonusClaimedAt: null } : {})
  });

  return { 
    balance: balanceAfterPurchaseAndReferralUnlock, 
    referralBalance: 0,
    hasActivePackage: true, 
    activePackageTitle: displayTitle,
    packagePrice: price,
    dailyIncomeRate: combinedDailyRate,
    dailyBonusRate: combinedDailyBonus,
    purchasedPackages: updatedPackages
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

  let dailyRate = data.dailyIncomeRate || 0;
  if (dailyRate <= 0) {
    if (data.purchasedPackages && data.purchasedPackages.length > 0) {
      dailyRate = data.purchasedPackages.reduce((sum: number, pkg: any) => sum + (pkg.dailyRate || 0), 0);
    }
  }

  // legacy fallback
  if (dailyRate <= 0) {
    const legacyPrice = data.packagePrice || 0;
    if (legacyPrice === 150) dailyRate = 20;
    else if (legacyPrice === 250) dailyRate = 30;
    else if (legacyPrice === 300) dailyRate = 40;
    else if (legacyPrice === 500) dailyRate = 60;
    else if (legacyPrice === 800 || legacyPrice === 840) dailyRate = 80;
    else dailyRate = Math.floor(legacyPrice / 10);
  }

  if (dailyRate <= 0) {
    throw new Error('আপনার একটিভ প্যাকেজের ডেইলি আয় নির্ধারণ করা হয়নি!');
  }

  const now = new Date();

  // 24-hours gap checker
  if (data.lastClaimedAt) {
    const lastClaim = new Date(data.lastClaimedAt);
    const diffMs = now.getTime() - lastClaim.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (!isTestOverride && diffHours < 24) {
      throw new Error('আপনি গত ২৪ ঘণ্টার মধ্যে একবার প্যাকেজের আয় ক্লেম করেছেন। ২৪ ঘন্টা পূর্ণ হলে আবার ক্লেম করতে পারবেন!');
    }
  }

  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const currentBalance = data.balance || 0;
  const newBalance = currentBalance + dailyRate;
  const newTotalClaimed = (data.totalDailyClaimedAmount || 0) + dailyRate;

  let updatedPurchasedPackages = data.purchasedPackages || [];
  updatedPurchasedPackages = updatedPurchasedPackages.map((pkg: any) => ({
    ...pkg,
    claimedCount: (pkg.claimedCount || 0) + 1,
    totalEarned: (pkg.totalEarned || 0) + (pkg.dailyRate || 0)
  }));

  await updateDoc(userRef, {
    balance: newBalance,
    totalDailyClaimedAmount: newTotalClaimed,
    dailyIncomeRate: dailyRate,
    lastClaimedDate: todayStr,
    lastClaimedAt: now.toISOString(),
    purchasedPackages: updatedPurchasedPackages
  });

  return {
    balance: newBalance,
    totalDailyClaimedAmount: newTotalClaimed,
    lastClaimedDate: todayStr,
    lastClaimedAt: now.toISOString(),
    purchasedPackages: updatedPurchasedPackages
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

  // 24-hours gap checker
  if (data.lastBonusClaimedAt) {
    const lastClaim = new Date(data.lastBonusClaimedAt);
    const diffMs = now.getTime() - lastClaim.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (!isTestOverride && diffHours < 24) {
      throw new Error('আপনি গত ২৪ ঘণ্টার মধ্যে একবার প্যাকেজ বোনাস দাবি করেছেন। ২৪ ঘন্টা পূর্ণ হলে আবার দাবি করতে পারবেন!');
    }
  }

  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  if (data.lastBonusClaimedDate === todayStr && !data.lastBonusClaimedAt) {
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


