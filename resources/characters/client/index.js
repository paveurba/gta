import * as alt from "alt-client";
import * as native from "natives";

const S = { IDLE: 0, SELECTING: 1, CREATING_NAME: 2, CREATING_SEX: 3 };

let state = S.IDLE;
let chars = [];
let maxSlots = 2;
let newCharName = "";
let tickId = null;

// ── Receive character list from server ──────────────────────────────────────
alt.onServer("characters:show", (characterList, max) => {
  chars = characterList ?? [];
  maxSlots = max ?? 2;
  state = S.SELECTING;
  // Freeze player but keep input working for key events
  const ped = alt.Player.local.scriptID;
  native.freezeEntityPosition(ped, true);
  startTick();
});

alt.onServer("characters:spawned", () => {
  state = S.IDLE;
  // Unfreeze player
  const ped = alt.Player.local.scriptID;
  native.freezeEntityPosition(ped, false);
  stopTick();
});

alt.onServer("characters:error", (msg) => {
  alt.log("[characters] Server error: " + msg);
  // Return to selection so player can retry
  if (state !== S.IDLE) state = S.SELECTING;
});

// ── Key handling ─────────────────────────────────────────────────────────────
alt.on("keydown", (key) => {
  if (state === S.SELECTING) {
    // 1–9: select existing character by index
    if (key >= 49 && key <= 57) {
      const idx = key - 49;
      if (chars[idx]) alt.emitServer("characters:select", chars[idx].id);
    }
    // N: new character
    if (key === 78 && chars.length < maxSlots) {
      state = S.CREATING_NAME;
      showKeyboard("");
    }
  } else if (state === S.CREATING_NAME) {
    if (key === 27) state = S.SELECTING; // ESC = back
  } else if (state === S.CREATING_SEX) {
    if (key === 77) { alt.emitServer("characters:create", newCharName, 0); state = S.IDLE; } // M
    if (key === 70) { alt.emitServer("characters:create", newCharName, 1); state = S.IDLE; } // F
    if (key === 27) state = S.SELECTING; // ESC = back
  }
});

// ── Draw UI every tick ────────────────────────────────────────────────────────
function startTick() {
  if (tickId !== null) return;
  tickId = alt.everyTick(onTick);
}

function stopTick() {
  if (tickId === null) return;
  alt.clearEveryTick(tickId);
  tickId = null;
}

function onTick() {
  if (state === S.IDLE) return;

  // Semi-transparent dark background
  native.drawRect(0.5, 0.5, 1.0, 1.0, 0, 0, 0, 160, false);

  if (state === S.SELECTING) {
    drawText("~y~CHARACTER SELECTION", 0.5, 0.12, 0.7);

    let y = 0.30;
    if (chars.length === 0) {
      drawText("~w~No characters found.", 0.5, y, 0.45);
      y += 0.07;
    }
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const sexLabel = c.sex === 1 ? "Female" : "Male";
      drawText(`~b~[${i + 1}]  ~w~${c.name}  ~s~(${sexLabel})`, 0.5, y, 0.45);
      y += 0.07;
    }
    if (chars.length < maxSlots) {
      drawText("~g~[N]  Create New Character", 0.5, y + 0.03, 0.45);
    }

  } else if (state === S.CREATING_NAME) {
    drawText("~y~NEW CHARACTER", 0.5, 0.25, 0.65);
    drawText("~w~Enter your character name below", 0.5, 0.35, 0.42);
    drawText("~s~(ESC to cancel)", 0.5, 0.42, 0.35);

    // Poll GTA's onscreen keyboard
    const status = native.updateOnscreenKeyboard();
    if (status === 1) {
      const result = (native.getOnscreenKeyboardResult() ?? "").trim();
      if (result.length >= 3) {
        newCharName = result;
        state = S.CREATING_SEX;
      } else {
        showKeyboard(result); // re-show if too short
      }
    } else if (status === 2) {
      state = S.SELECTING; // cancelled
    }

  } else if (state === S.CREATING_SEX) {
    drawText("~y~NEW CHARACTER", 0.5, 0.25, 0.65);
    drawText(`~w~Name: ~b~${newCharName}`, 0.5, 0.35, 0.45);
    drawText("~w~Choose sex:", 0.5, 0.44, 0.45);
    drawText("~b~[M]  Male", 0.5, 0.52, 0.45);
    drawText("~p~[F]  Female", 0.5, 0.59, 0.45);
    drawText("~s~(ESC to cancel)", 0.5, 0.67, 0.35);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawText(text, x, y, scale) {
  native.setTextFont(4);
  native.setTextScale(0, scale);
  native.setTextColour(255, 255, 255, 255);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText("STRING");
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(x, y);
}

function showKeyboard(defaultText) {
  native.displayOnscreenKeyboard(0, "FMMC_KEY_TIP8", "", defaultText ?? "", "", "", "", 30);
}
