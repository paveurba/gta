export interface ShopLocation {
    x: number;
    y: number;
    z: number;
    name: string;
}

export interface PropertyLocation {
    id: number;
    name: string;
    price: number;
    owner_player_id: number | null;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    interior_x: number;
    interior_y: number;
    interior_z: number;
    interior_heading?: number;
    ipl?: string;
}

export interface VehicleCatalogItem {
    name: string;
    model: string;
    hash: number;
    price: number;
    category: string;
}

export interface PlayerVehicle {
    id: number;
    model: string;
    model_hash: number;
    color_primary: number;
    color_secondary: number;
    garage_property_id: number | null;
    is_spawned: boolean;
}

export type AuthScreen = 'menu' | 'login' | 'register' | 'forgot' | 'changePassword';

export type PhoneTab = 'main' | 'contacts' | 'messages' | 'addContact' | 'sendMessage';

export interface ClientAuthForm {
    loginId: string;
    loginPassword: string;
    regUsername: string;
    regEmail: string;
    regPassword: string;
    regConfirm: string;
    forgotEmail: string;
    changeCurrent: string;
    changeNew: string;
    changeConfirm: string;
}

export interface CasinoSlotsResult {
    symbols: string[];
    won: boolean;
    winAmount: number;
}

export interface CasinoRouletteResult {
    number: number;
    color: string;
    won: boolean;
    winAmount: number;
}

export interface PhoneContactRow {
    id: number;
    contact_name: string;
    contact_number: string;
}

export interface PhoneMessageRow {
    id: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    is_read: boolean;
}

export interface ClientState {
    playerMoney: number;
    playerBank: number;
    isLoggedIn: boolean;
    currentPlayerId: number;
    weaponShops: ShopLocation[];
    clothingShops: ShopLocation[];
    casinos: ShopLocation[];
    properties: PropertyLocation[];
    createdBlips: number[];
    nearbyProperty: PropertyLocation | null;
    propertyInteractionOpen: boolean;
    propertyMenuSelection: number;
    nearbyShop: ShopLocation | null;
    nearbyShopType: 'weapon' | 'clothing' | 'casino' | null;
    shopMenuOpen: boolean;
    shopMenuType: 'weapon' | 'clothing' | null;
    shopCatalog: any[];
    shopMenuSelection: number;
    nearbyDealership: ShopLocation | null;
    dealershipMenuOpen: boolean;
    vehicleCatalog: VehicleCatalogItem[];
    vehicleMenuSelection: number;
    garageMenuOpen: boolean;
    garageVehicles: PlayerVehicle[];
    garageMenuSelection: number;
    currentGaragePropertyId: number | null;
    phoneOpen: boolean;
    phoneTab: PhoneTab;
    phoneContacts: PhoneContactRow[];
    phoneMessages: PhoneMessageRow[];
    phoneUnread: number;
    phoneInput: string;
    phoneInput2: string;
    phoneSelectedContact: number;
    isDead: boolean;
    deathTime: number;
    slotsResult: CasinoSlotsResult | null;
    rouletteResult: CasinoRouletteResult | null;
    showCasinoResult: number;
    authOpen: boolean;
    authScreen: AuthScreen;
    authRequirePasswordChange: boolean;
    authMessage: string;
    authForm: ClientAuthForm;
    activeAuthFieldIndex: number;
    chatOpen: boolean;
    chatInput: string;
    chatHistory: string[];
    isDisconnected: boolean;
    reconnectAttempts: number;
    reconnectTimer: ReturnType<typeof import('alt-client').setInterval> | null;
    justOpened: boolean;
    shiftPressed: boolean;
    activeInput: 'chat' | 'phone1' | 'phone2';
}
