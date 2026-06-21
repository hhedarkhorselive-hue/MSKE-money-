export interface User {
  phone: string;
  balance: number;
  activePackage: { price: number; dailyEarn: number } | null;
  lastClaimedDate: string | null;
  totalDailyClaimedAmount?: number;
}
