import { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { Database } from './database-new.types';

export type Tables = Database['public']['Tables'];
export type TableNames = keyof Tables;

export type TableRow<T extends TableNames> = Tables[T]['Row'];
export type TableInsert<T extends TableNames> = Tables[T]['Insert'];
export type TableUpdate<T extends TableNames> = Tables[T]['Update'];

export type DBClient = SupabaseClient<Database>;

export type UserRole = TableRow<'user_roles'>['role'];

export type UserRoleRow = TableRow<'user_roles'>;
export type UserRoleInsert = TableInsert<'user_roles'>;
export type UserRoleUpdate = TableUpdate<'user_roles'>;

export type FarmerRow = TableRow<'farmers'>;
export type FarmerInsert = TableInsert<'farmers'>;
export type FarmerUpdate = TableUpdate<'farmers'>;

export type StaffRow = TableRow<'staff'>;
export type StaffInsert = TableInsert<'staff'>;
export type StaffUpdate = TableUpdate<'staff'>;