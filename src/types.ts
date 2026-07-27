export type Role = "owner" | "admin" | "operator" | "viewer";
export type Permission = "keys.read" | "keys.write" | "keys.delete" | "monitor.read" | "users.manage" | "alerts.manage" | "audit.read" | "system.read";

export interface AppUser { telegramId: number; role: Role; active: boolean; displayName?: string; }
export interface ApiKeyRecord { id: string; name: string; key?: string; isActive?: boolean; models?: string[]; tokenBalance?: number | null; tokensUsed?: number; unlimited?: boolean; expiresAt?: string | null; createdAt?: string; updatedAt?: string; status?: string; }
export interface ModelOption { id: string; name: string; groupId: string; groupName: string; isCombo?: boolean; memberCount?: number; }
export interface ModelGroup { id: string; name: string; models: ModelOption[]; }
export interface WizardState { step: "name" | "keyMode" | "customKey" | "models" | "modelSearch" | "customModel" | "quota" | "expiry" | "owner" | "review"; operation?: "create" | "editModels" | "renew" | "search" | "addUser"; keyId?: string; name?: string; customKey?: string; models: string[]; quota?: string; expiry?: string; ownerId?: number; modelGroup?: string; modelPage?: number; modelSearch?: string; }
