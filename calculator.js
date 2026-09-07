(() => {
  "use strict";

  const root = document.querySelector(".calculator-app");
  if (!root) return;

  // Migrated from the standalone attribute calculator. This file intentionally
  // remains dependency-free so the tool works in the published static site.
  const APP_VERSION = "1.0";

const DAMAGE_ACTIONS = {
  "attack-base": {
    coefficient: 1,
    label: "属性收益比较（无需系数）",
    shortLabel: "属性收益比较",
    source: "技能系数为常数，取 1 不影响“哪个词条更赚”的相对排序，因此无需知道技能系数。",
    gameInstruction: "用于比较攻击/破甲/暴击/技能增强等哪个收益更高；结果不代表绝对伤害。",
    exclusions: "要算绝对伤害，请用下面的“自定义技能系数 / 技能说明反推”。",
  },
  custom: {
    coefficient: 1,
    label: "自定义技能系数",
    shortLabel: "自定义系数",
    source: "任意技能通用：填/反推你的技能系数后可算绝对伤害，多段逐段填。",
    gameInstruction: "填入你的技能系数（或由“技能说明反推系数”算出），再对照实测跳字。",
    exclusions: "系数 = 技能说明数字 ÷ (攻击中点 + 120 × 技能等级)，或用实测反推。",
  },
};

const ids = [
  "targetType", "sourceLevel", "targetLevel",
  "damageAction", "sourceAttackMin", "sourceAttackMax", "sourceArmorBreak", "sourceSpecialization",
  "normalAttackCoefficient", "sourceBreakFlat", "sourceBreakPercent", "sourceCrit", "sourceCritDamage",
  "sourcePierce", "sourceFinalBonus", "sourceDamageIncrease", "sourceDamageDeepening", "sourceSuppression",
  "comboBonus", "targetDefense", "targetArmor", "targetSpecializationDefense", "targetFinalResistance",
  "targetAntiCrit", "targetCritDamageReduction", "targetBlock", "targetDamageReduction",
  "targetDamageMitigation", "targetSkillResistance", "targetResistance", "targetWeakness", "targetBossWeakness",
  "sourceAttackCorrection", "targetDefenseCorrection", "campBaseMultiplier",
  "sourceSkillLevel", "sourceSkillEnhancement", "includeSkillLevelPart",
];

const element = (id) => root.querySelector(`#${id}`);
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const number = (id) => {
  const value = Number.parseFloat(element(id).value);
  return Number.isFinite(value) ? value : 0;
};
const formatNumber = (value, decimals = 0) => new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: decimals,
  minimumFractionDigits: decimals,
}).format(Number.isFinite(value) ? value : 0);
const formatPercent = (value, decimals = 1) => `${formatNumber(value * 100, decimals)}%`;

const targetTypeLabels = {
  normal: "普通怪物",
  elite: "精英",
  boss: "首领",
  player: "玩家",
  building: "建筑",
};

function combatLevel(level) {
  const normalizedLevel = clamp(Math.round(level), 1, 100);
  if (normalizedLevel <= 10) return 1;
  if (normalizedLevel <= 29) return 2;
  if (normalizedLevel <= 40) return 3;
  if (normalizedLevel <= 44) return 4;
  if (normalizedLevel <= 48) return 5;
  if (normalizedLevel <= 53) return 6;
  if (normalizedLevel <= 56) return 7;
  if (normalizedLevel === 57) return 8;
  if (normalizedLevel <= 59) return 9;
  if (normalizedLevel <= 61) return 10;
  if (normalizedLevel === 62) return 11;
  if (normalizedLevel === 63) return 12;
  if (normalizedLevel === 64) return 13;
  if (normalizedLevel === 65) return 14;
  if (normalizedLevel === 66) return 15;
  if (normalizedLevel === 67) return 16;
  if (normalizedLevel === 68) return 17;
  if (normalizedLevel === 69) return 18;
  if (normalizedLevel === 70) return 19;
  if (normalizedLevel <= 72) return 20;
  if (normalizedLevel === 73) return 21;
  if (normalizedLevel <= 75) return 22;
  if (normalizedLevel <= 77) return 23;
  if (normalizedLevel <= 79) return 24;
  if (normalizedLevel === 80) return 25;
  if (normalizedLevel <= 99) return normalizedLevel - 55;
  return 45;
}

function roleLabels(targetType) {
  const isPlayer = targetType === "player";
  const isBuilding = targetType === "building";
  const subject = isPlayer
    ? "途径"
    : isBuilding
      ? "建筑"
      : targetType === "elite"
        ? "精英怪物"
        : targetType === "boss"
          ? "首领怪物"
          : "普通怪物";
  const suffix = isBuilding ? "（待测）" : "";
  return {
    sourceSpecialization: `${subject}专攻${suffix}`,
    sourceSuppression: `${subject}压制${suffix}`,
    targetSpecialization: `攻击者对应专防${suffix}`,
    targetResistance: `${subject}抵抗${suffix}`,
  };
}

function skillEnhancementMultiplier(state, currentCombatLevel) {
  const difference = (state.sourceSkillEnhancement || 0) - (state.targetSkillResistance || 0);
  if (currentCombatLevel <= 0) return 1;
  return clamp(1 + (0.025 * difference) / currentCombatLevel, 0.05, 2.5);
}

function readState() {
  const state = { eventOrder: "block-first" };
  ids.forEach((id) => {
    const field = element(id);
    if (!field) return;
    if (field.type === "checkbox") state[id] = field.checked;
    else if (field.tagName === "SELECT" || field.type === "text") state[id] = field.value.trim();
    else state[id] = number(id);
  });
  return state;
}

function selectedAction(state) {
  return DAMAGE_ACTIONS[state.damageAction] || DAMAGE_ACTIONS["attack-base"];
}

function currentModelAction(state) {
  const action = selectedAction(state);
  return {
    label: action.label,
    shortLabel: action.shortLabel,
    gameInstruction: action.gameInstruction,
    exclusions: action.exclusions,
  };
}

function calculate(state) {
  const sourceCombatLevel = combatLevel(state.sourceLevel);
  const targetCombatLevel = combatLevel(state.targetLevel);
  const currentCombatLevel = Math.min(sourceCombatLevel, targetCombatLevel);
  const levelCoefficient = currentCombatLevel > 45
    ? 0.48 * (currentCombatLevel - 45) + 50.4
    : 1.12 * currentCombatLevel;
  const attackMinimum = Math.min(state.sourceAttackMin, state.sourceAttackMax);
  const attackMaximum = Math.max(state.sourceAttackMin, state.sourceAttackMax);
  const attackMidpoint = (attackMinimum + attackMaximum) / 2;

  const armorBreak = state.sourceArmorBreak;
  const targetArmor = state.targetArmor;
  let armorDelta;
  if (targetArmor <= armorBreak) armorDelta = (armorBreak - targetArmor) / 3;
  else if (armorBreak <= targetArmor / 4) armorDelta = 2 * armorBreak - targetArmor;
  else armorDelta = (armorBreak - targetArmor) * 2 / 3;

  const specializationDelta = Math.max(state.sourceSpecialization - state.targetSpecializationDefense, 0);
  const effectiveDefense = Math.max(state.targetDefense - state.sourceBreakFlat, 0) * (1 - state.sourceBreakPercent / 100);
  const defenseReduction = clamp(
    (effectiveDefense * 0.85) / (effectiveDefense + currentCombatLevel * 31.68),
    0.25,
    0.8,
  );
  const defenseMultiplier = 1 - defenseReduction;

  const preDefense = Math.max(attackMidpoint + armorDelta + specializationDelta, 0);
  const action = selectedAction(state);
  const isCustom = state.damageAction === "custom";
  const coefficient = isCustom ? (state.normalAttackCoefficient || 0) : action.coefficient;
  const attackPart = coefficient * preDefense * defenseMultiplier;
  const skillPart = state.includeSkillLevelPart
    ? coefficient * (state.sourceSkillLevel || 0) * 120 * skillEnhancementMultiplier(state, currentCombatLevel)
    : 0;
  const baseDamage = attackPart + skillPart;

  const increase = Math.max(0, 1 + state.comboBonus / 100 + state.sourceDamageIncrease / 100 - state.targetDamageReduction / 100);
  const deepening = Math.max(0, 1 + state.sourceDamageDeepening / 100 - state.targetDamageMitigation / 100);
  const suppression = state.campBaseMultiplier * Math.max(0, 1 + state.sourceSuppression / 100 - state.targetResistance / 100);
  const weakness = 1 + state.targetWeakness / 100;
  const isMonsterTarget = state.targetType !== "player" && state.targetType !== "building";
  const monsterCorrection = isMonsterTarget
    ? (1 + state.targetBossWeakness / 100) * state.sourceAttackCorrection * state.targetDefenseCorrection
    : 1;
  const nonEvent = increase * deepening * suppression * weakness * monsterCorrection;

  const criticalDifference = state.sourceCrit - state.targetAntiCrit;
  const criticalRate = clamp(
    (2 * criticalDifference + 45 * levelCoefficient) / (criticalDifference + 180 * levelCoefficient),
    0.05,
    0.75,
  );
  const pierceDifference = state.sourcePierce - state.targetBlock;
  const pierceRate = clamp(
    (1.5 * pierceDifference + 135 * levelCoefficient) / (pierceDifference + 180 * levelCoefficient),
    0.25,
    1,
  );
  const blockRate = 1 - pierceRate;
  const criticalMultiplier = clamp(
    state.sourceCritDamage / 100 - state.targetCritDamageReduction / 100,
    1.25,
    2.5,
  );
  const finalDelta = state.sourceFinalBonus - state.targetFinalResistance;

  const normalRaw = baseDamage * nonEvent;
  const criticalRaw = normalRaw * criticalMultiplier;
  const blockedRaw = normalRaw * 0.3;
  const applyFloor = (value) => Math.max(value + finalDelta, baseDamage * 0.005, 1);
  const normal = applyFloor(normalRaw);
  const critical = applyFloor(criticalRaw);
  const blocked = applyFloor(blockedRaw);
  const criticalChance = (1 - blockRate) * criticalRate;
  const normalChance = (1 - blockRate) * (1 - criticalRate);
  const expected = Math.max(
    blockRate * blockedRaw + criticalChance * criticalRaw + normalChance * normalRaw + finalDelta,
    baseDamage * 0.005,
    1,
  );

  return {
    sourceCombatLevel,
    targetCombatLevel,
    currentCombatLevel,
    levelCoefficient,
    attackMidpoint,
    armorDelta,
    specializationDelta,
    effectiveDefense,
    defenseReduction,
    defenseMultiplier,
    preDefense,
    coefficient,
    attackPart,
    skillPart,
    baseDamage,
    nonEvent,
    criticalRate,
    pierceRate,
    blockRate,
    criticalMultiplier,
    finalDelta,
    normal,
    critical,
    blocked,
    normalJump: Math.round(normal),
    criticalJump: Math.round(critical),
    blockJump: Math.round(blocked),
    normalChance,
    criticalChance,
    expected,
  };
}

function updateLabels(state) {
  const labels = roleLabels(state.targetType);
  element("sourceSpecializationLabel").textContent = labels.sourceSpecialization;
  element("sourceSuppressionLabel").textContent = labels.sourceSuppression;
  element("targetSpecializationLabel").textContent = labels.targetSpecialization;
  element("targetResistanceLabel").textContent = labels.targetResistance;
}

function damageRoute(state) {
  return `我 → 目标（${targetTypeLabels[state.targetType] || "目标"}）`;
}

function syncActionCoefficient() {
  const select = element("damageAction");
  const action = DAMAGE_ACTIONS[select.value];
  const isCustom = select.value === "custom";
  const coefficientField = element("normalAttackCoefficient");
  if (!isCustom && action) coefficientField.value = action.coefficient;
  coefficientField.readOnly = !isCustom;
  element("actionChip").textContent = action?.shortLabel || "属性收益比较";
  const advanced = element("sourceForm").querySelector("details.calculator-advanced");
  if (isCustom && advanced) advanced.open = true;
}

function syncFieldStates(state) {
  const isNonMonster = state.targetType === "player" || state.targetType === "building";
  ["sourceAttackCorrection", "targetDefenseCorrection", "targetBossWeakness"].forEach((id) => {
    const field = element(id);
    if (field) field.disabled = isNonMonster;
  });
  const skillResistance = element("targetSkillResistance");
  if (skillResistance) skillResistance.disabled = !state.includeSkillLevelPart;
}

function attackMidpoint() {
  const minimum = number("sourceAttackMin");
  const maximum = number("sourceAttackMax");
  return (Math.min(minimum, maximum) + Math.max(minimum, maximum)) / 2;
}

function deriveCoefficient() {
  const tooltipNumber = number("tooltipNumber");
  const skillLevel = Math.max(number("sourceSkillLevel"), 0);
  const denominator = attackMidpoint() + 120 * skillLevel;
  const value = denominator > 0 ? tooltipNumber / denominator : 0;
  element("derivedCoefficient").value = Number.isFinite(value) ? value.toFixed(6) : "0";
  return value;
}

function applyDerivedCoefficient() {
  const value = deriveCoefficient();
  if (!(value > 0)) {
    element("resultMeaning").textContent = "请先填写“技能说明面板数字”。";
    return;
  }
  element("damageAction").value = "custom";
  syncActionCoefficient();
  element("normalAttackCoefficient").value = value;
  refresh({ flash: true });
  element("resultMeaning").textContent = `已采用反推系数 ${value.toFixed(5)}（需配合“技能等级项”）`;
}

function calibrateCoefficient() {
  const observedHit = number("observedHit");
  // Use a unit coefficient to solve for the unscaled base layer.
  const probe = calculate({ ...readState(), damageAction: "custom", normalAttackCoefficient: 1 });
  const unscaledBase = probe.attackPart + probe.skillPart;
  const denominator = unscaledBase * probe.nonEvent;
  const value = denominator > 0 ? (observedHit - probe.finalDelta) / denominator : 0;
  element("calibratedCoefficient").value = Number.isFinite(value) && value > 0 ? value.toFixed(6) : "0";
  return value;
}

function applyCalibratedCoefficient() {
  const value = calibrateCoefficient();
  if (!(value > 0)) {
    element("resultMeaning").textContent = "请先填写一份“实测普通命中”伤害。";
    return;
  }
  element("damageAction").value = "custom";
  syncActionCoefficient();
  element("normalAttackCoefficient").value = value;
  refresh({ flash: true });
  element("resultMeaning").textContent = `已用实测校准系数 ${value.toFixed(5)}（请确认“技能等级项”与实际一致）`;
}

function updateReadout(result) {
  const model = currentModelAction(currentState);
  element("combatLevelValue").textContent = result.currentCombatLevel;
  element("combatLevelReason").textContent = `min(${result.sourceCombatLevel}, ${result.targetCombatLevel})`;
  element("resultTitle").textContent = `${model.label} · 结果`;
  element("actionChip").textContent = model.shortLabel;
  element("damageRoute").textContent = damageRoute(currentState);

  if (result.baseDamage <= 0) {
    element("expectedLabel").textContent = "请填写属性";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "等待输入";
    element("resultMeaning").textContent = "填入我方与目标属性后自动计算；默认口径可直接对比词条收益。";
    ["normalDamage", "criticalDamage", "blockedDamage"].forEach((id) => { element(id).textContent = "—"; });
    ["normalJump", "criticalJump", "blockJump"].forEach((id) => { element(id).textContent = "跳字 —"; });
    ["normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }

  element("expectedLabel").textContent = currentState.damageAction === "attack-base"
    ? "比较基准（仅供排序）"
    : "期望伤害（未取整）";
  element("expectedDamage").textContent = formatNumber(result.expected, 2);
  element("damageRange").textContent = currentState.damageAction === "attack-base"
    ? "属性收益比较 · 攻击区间中点"
    : `攻击区间中点 · 系数 ${formatNumber(result.coefficient, 4)}x`;
  element("resultMeaning").textContent = currentState.damageAction === "attack-base"
    ? "用于比较词条“哪个更赚”，不代表某一次跳字。"
    : "估算值；请在“高级”用方式一/二先得出你的技能系数，再对照实测。";
  element("normalDamage").textContent = formatNumber(result.normal, 2);
  element("criticalDamage").textContent = formatNumber(result.critical, 2);
  element("blockedDamage").textContent = formatNumber(result.blocked, 2);
  element("normalJump").textContent = `跳字 ${formatNumber(result.normalJump)}`;
  element("criticalJump").textContent = `跳字 ${formatNumber(result.criticalJump)}`;
  element("blockJump").textContent = `跳字 ${formatNumber(result.blockJump)}`;
  element("normalChance").textContent = formatPercent(result.normalChance, 1);
  element("criticalChance").textContent = formatPercent(result.criticalChance, 1);
  element("blockChance").textContent = formatPercent(result.blockRate, 1);
}

function refresh({ flash = false } = {}) {
  currentState = readState();
  updateLabels(currentState);
  syncFieldStates(currentState);
  currentResult = calculate(currentState);
  updateReadout(currentResult);
  if (flash) element("resultMeaning").classList.add("flash");
}

function resetInputs() {
  root.querySelectorAll("input[type=number], input[type=text]").forEach((field) => {
    if (field.dataset.defaultValue !== undefined) field.value = field.dataset.defaultValue;
  });
  root.querySelectorAll("select").forEach((field) => {
    if (field.dataset.defaultValue !== undefined) field.value = field.dataset.defaultValue;
  });
  root.querySelectorAll("input[type=checkbox]").forEach((field) => {
    field.checked = field.dataset.defaultChecked === "true";
  });
  syncActionCoefficient();
  refresh({ flash: true });
}

function preserveDefaults() {
  root.querySelectorAll("input, select").forEach((field) => {
    if (field.type === "file") return;
    if (field.type === "checkbox") {
      field.dataset.defaultChecked = String(field.checked);
      return;
    }
    field.dataset.defaultValue = field.value;
  });
}

let currentState = readState();
let currentResult = calculate(currentState);

ids.forEach((id) => {
  const field = element(id);
  if (!field) return;
  field.addEventListener("input", () => refresh({ flash: true }));
  field.addEventListener("change", () => refresh({ flash: true }));
});
element("damageAction").addEventListener("change", () => {
  syncActionCoefficient();
  refresh({ flash: true });
});
element("normalAttackCoefficient").addEventListener("input", () => {
  if (element("damageAction").value !== "custom") return;
  refresh({ flash: true });
});
element("tooltipNumber").addEventListener("input", deriveCoefficient);
element("applyCoefficient").addEventListener("click", applyDerivedCoefficient);
element("observedHit").addEventListener("input", calibrateCoefficient);
element("observedHit").addEventListener("change", calibrateCoefficient);
element("applyCalibrated").addEventListener("click", applyCalibratedCoefficient);
["sourceAttackMin", "sourceAttackMax", "sourceSkillLevel"].forEach((id) => {
  element(id).addEventListener("input", deriveCoefficient);
  element(id).addEventListener("change", deriveCoefficient);
});
element("resetButton").addEventListener("click", resetInputs);

preserveDefaults();
syncActionCoefficient();
refresh();
})();
