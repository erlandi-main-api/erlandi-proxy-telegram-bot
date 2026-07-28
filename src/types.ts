export type Role = "owner" | "admin" | "operator" | "viewer";
export type Permission = "keys.read" | "keys.write" | "keys.delete" | "monitor.read" | "users.manage" | "alerts.manage" | "audit.read" | "system.read" | "portal.manage";

export interface AppUser { telegramId: number; role: Role; active: boolean; displayName?: string; }
export interface ApiKeyRecord { id: string; name: string; key?: string; isActive?: boolean; models?: string[]; tokenBalance?: number | null; tokensUsed?: number; unlimited?: boolean; expiresAt?: string | null; createdAt?: string; updatedAt?: string; status?: string; }
export interface ModelOption { id: string; name: string; groupId: string; groupName: string; isCombo?: boolean; memberCount?: number; }
export interface ModelGroup { id: string; name: string; models: ModelOption[]; }
export interface PublicQuota { name: string; status: string; models: string[]; allModels: boolean; tokenBalance: number|null; unlimited: boolean; tokensUsed: number; expiresAt: string|null; }
export interface PublicSession { step: "quotaKey"|"renewKey"|"renewTokens"|"renewDays"; keyName?: string; keyFingerprint?: string; tokens?: number; createdAt: number; }
export interface WizardState { step: "name" | "keyMode" | "customKey" | "models" | "modelSearch" | "customModel" | "quota" | "expiry" | "owner" | "review" | "portalWelcome" | "portalButtonLabel" | "portalButtonUrl" | "portalPageTitle" | "portalPageBody"; operation?: "create" | "editModels" | "renew" | "search" | "addUser" | "portalWelcome" | "portalButton" | "portalPage"; keyId?: string; name?: string; customKey?: string; models: string[]; quota?: string; expiry?: string; ownerId?: number; modelGroup?: string; modelPage?: number; modelSearch?: string; portalButtonId?: string; portalPageId?: string; portalLabel?: string; }
