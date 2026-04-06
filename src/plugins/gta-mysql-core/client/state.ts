import type { ClientState } from './types.js';

const emptyAuthForm = (): ClientState['authForm'] => ({
    loginId: '',
    loginPassword: '',
    regUsername: '',
    regEmail: '',
    regPassword: '',
    regConfirm: '',
    forgotEmail: '',
    changeCurrent: '',
    changeNew: '',
    changeConfirm: '',
});

export const clientState: ClientState = {
    playerMoney: 0,
    playerBank: 0,
    isLoggedIn: false,
    currentPlayerId: 0,
    weaponShops: [],
    clothingShops: [],
    casinos: [],
    properties: [],
    createdBlips: [],
    nearbyProperty: null,
    propertyInteractionOpen: false,
    propertyMenuSelection: 0,
    nearbyShop: null,
    nearbyShopType: null,
    shopMenuOpen: false,
    shopMenuType: null,
    shopCatalog: [],
    shopMenuSelection: 0,
    nearbyDealership: null,
    dealershipMenuOpen: false,
    vehicleCatalog: [],
    vehicleMenuSelection: 0,
    garageMenuOpen: false,
    garageVehicles: [],
    garageMenuSelection: 0,
    currentGaragePropertyId: null,
    phoneOpen: false,
    phoneTab: 'main',
    phoneContacts: [],
    phoneMessages: [],
    phoneUnread: 0,
    phoneInput: '',
    phoneInput2: '',
    phoneSelectedContact: 0,
    isDead: false,
    deathTime: 0,
    slotsResult: null,
    rouletteResult: null,
    showCasinoResult: 0,
    authOpen: false,
    authScreen: 'menu',
    authRequirePasswordChange: false,
    authMessage: '',
    authForm: emptyAuthForm(),
    activeAuthFieldIndex: 0,
    chatOpen: false,
    chatInput: '',
    chatHistory: [],
    isDisconnected: false,
    reconnectAttempts: 0,
    reconnectTimer: null,
    justOpened: false,
    shiftPressed: false,
    activeInput: 'chat',
};

export function resetAuthForm(): void {
    clientState.authForm = emptyAuthForm();
}

/**
 * Clear transient local UI/input state so reconnects and logout cannot leave hotkeys blocked
 * by stale open menus or focused inputs.
 */
export function resetTransientClientUiState(): void {
    clientState.nearbyProperty = null;
    clientState.propertyInteractionOpen = false;
    clientState.propertyMenuSelection = 0;

    clientState.nearbyShop = null;
    clientState.nearbyShopType = null;
    clientState.shopMenuOpen = false;
    clientState.shopMenuType = null;
    clientState.shopCatalog = [];
    clientState.shopMenuSelection = 0;

    clientState.nearbyDealership = null;
    clientState.dealershipMenuOpen = false;
    clientState.vehicleCatalog = [];
    clientState.vehicleMenuSelection = 0;

    clientState.garageMenuOpen = false;
    clientState.garageVehicles = [];
    clientState.garageMenuSelection = 0;
    clientState.currentGaragePropertyId = null;

    clientState.phoneOpen = false;
    clientState.phoneInput = '';
    clientState.phoneInput2 = '';

    clientState.authOpen = false;
    clientState.authScreen = 'menu';
    clientState.authRequirePasswordChange = false;
    clientState.authMessage = '';
    clientState.activeAuthFieldIndex = 0;
    resetAuthForm();

    clientState.chatOpen = false;
    clientState.chatInput = '';
    clientState.justOpened = false;
    clientState.shiftPressed = false;
    clientState.activeInput = 'chat';
}
