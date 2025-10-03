export type Rpc = {
  approve_kyc: (params: { farmer_id: string; admin_id: string }) => Promise<void>;
  reject_kyc: (params: { farmer_id: string; reason: string; admin_id: string }) => Promise<void>;
};