"use strict";

const APP_VERSION = "2.2";
const DAMAGE_ACTIONS = {
  "attack-base": { coefficient: 1, label: "属性收益比较（无需系数）", shortLabel: "属性收益比较" },
  custom: { coefficient: 1, label: "完整动作结算", shortLabel: "完整动作" },
};
const ids = [
  "targetType", "sourceLevel", "targetLevel", "damageAction", "eventOrder",
  "sourceAttackMin", "sourceAttackMax", "sourceArmorBreak", "sourceSpecialization", "sourceSkillEnhancement", "normalAttackCoefficient",
  "sourceBreakFlat", "sourceBreakPercent", "sourceCrit", "sourceCritDamage", "sourcePierce", "sourceFinalBonus",
  "sourceDamageIncrease", "sourceDamageDeepening", "sourceSuppression", "comboBonus",
  "targetDefense", "targetArmor", "targetSpecializationDefense", "targetFinalResistance", "targetAntiCrit",
  "targetCritDamageReduction", "targetBlock", "targetDamageReduction", "targetDamageMitigation",
  "targetResistance", "targetSkillResistance", "targetWeakness", "targetBossWeakness", "sourceAttackCorrection", "targetDefenseCorrection",
  "campBaseMultiplier", "includeCampBaseMultiplier", "includeMonsterCorrection", "includeCrossTypeMultiplier", "includeWeaknessMultiplier", "sourceCrossTypeIncrease", "targetCrossTypeImmunity", "actualTargetCount", "fullDamageTargetCount", "confirmTargetCountMetadata",
  "sourceId", "targetId", "targetScenario", "skillName", "skillSegment", "skillLevel", "damageType", "buffState", "controlVariableNote", "roundingAssumption", "conditionalEvidence", "confirmSnapshotComplete", "tooltipNumber",
  "tooltipNote", "observedHit", "observedEvent", "observedSamples",
];
const calibrationSnapshotIds = ids.filter((id) => !["damageAction", "normalAttackCoefficient"].includes(id));
const element = (id) => document.getElementById(id);
const clamp = (value, lo, hi) => Math.min(Math.max(value, lo), hi);
const asNumber = (id) => {
  const value = Number.parseFloat(element(id)?.value);
  return Number.isFinite(value) ? value : 0;
};
const formatNumber = (value, decimals = 0) => new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: decimals, minimumFractionDigits: decimals,
}).format(Number.isFinite(value) ? value : 0);
const formatPercent = (value, decimals = 1) => `${formatNumber(value * 100, decimals)}%`;
const targetTypeLabels = { normal: "普通怪物", elite: "精英", boss: "首领", player: "玩家", building: "建筑（不可用）" };
let boundCalibration = null;
let pendingManualCoefficient = "";
let coefficientModeValue = "";
const MAX_CALIBRATION_ATTACK_ROLLS = 10001;
const MAX_COEFFICIENT_SEARCH = 1_000_000;

function combatLevel(level) {
  const l = clamp(Math.round(level), 1, 100);
  if (l <= 10) return 1;
  if (l <= 29) return 2;
  if (l <= 40) return 3;
  if (l <= 44) return 4;
  if (l <= 48) return 5;
  if (l <= 53) return 6;
  if (l <= 56) return 7;
  if (l === 57) return 8;
  if (l <= 59) return 9;
  if (l <= 61) return 10;
  if (l === 62) return 11;
  if (l === 63) return 12;
  if (l === 64) return 13;
  if (l === 65) return 14;
  if (l === 66) return 15;
  if (l === 67) return 16;
  if (l === 68) return 17;
  if (l === 69) return 18;
  if (l === 70) return 19;
  if (l <= 72) return 20;
  if (l === 73) return 21;
  if (l <= 75) return 22;
  if (l <= 77) return 23;
  if (l <= 79) return 24;
  if (l === 80) return 25;
  if (l <= 99) return l - 55;
  return 45;
}

function roleLabels(targetType) {
  const subject = targetType === "player" ? "途径" : targetType === "building" ? "建筑" : targetType === "elite" ? "精英怪物" : targetType === "boss" ? "首领怪物" : "普通怪物";
  const suffix = targetType === "building" ? "（不可用）" : "";
  return {
    sourceSpecialization: `${subject}专攻${suffix}`,
    sourceSuppression: `${subject}压制${suffix}`,
    targetSpecialization: `攻击者对应专防${suffix}`,
    targetResistance: `${subject}抵抗${suffix}`,
  };
}

function actionSourceLabel(state) {
  if (isCalibrationAction(state.damageAction) && boundCalibration?.source === "observed-range") return "实测有效系数";
  if (isCalibrationAction(state.damageAction) && boundCalibration?.source === "manual") return "手填系数";
  return "动作系数";
}

function isCalibrationAction(action) { return action === "custom"; }
function isActionFormula(action) { return action === "custom"; }

function readState() {
  const state = {};
  ids.forEach((id) => {
    const field = element(id);
    if (!field) return;
    if (field.type === "checkbox") state[id] = field.checked;
    else if (field.tagName === "SELECT" || field.tagName === "TEXTAREA" || field.type === "text") state[id] = field.value.trim();
    else state[id] = asNumber(id);
  });
  state.eventOrder = ["block-first", "unknown"].includes(state.eventOrder) ? state.eventOrder : "unknown";
  return state;
}

function rawFieldIsMissing(id) {
  const field = element(id);
  return !field || field.value.trim() === "";
}

function validationIssues(state) {
  const issues = [];
  const nonFiniteFields = ids.filter((id) => {
    const field = element(id);
    return field && field.type !== "checkbox" && field.tagName !== "SELECT" && field.tagName !== "TEXTAREA" && field.type !== "text" && !Number.isFinite(Number.parseFloat(field.value));
  });
  if (nonFiniteFields.length) issues.push("数值输入必须为有限数字");
  ["sourceAttackMin", "sourceAttackMax", "sourceLevel", "targetLevel", "sourceArmorBreak", "targetArmor", "targetDefense", "sourceBreakFlat"].forEach((id) => {
    if (rawFieldIsMissing(id)) issues.push(`“${element(id)?.previousElementSibling?.textContent || id}”不能为空`);
  });
  if (!Number.isInteger(state.sourceAttackMin) || !Number.isInteger(state.sourceAttackMax) || state.sourceAttackMin < 0 || state.sourceAttackMax < 0) issues.push("攻击区间必须是非负整数");
  if (state.sourceAttackMin > state.sourceAttackMax) issues.push("攻击下限不能大于攻击上限");
  if (!Number.isInteger(state.sourceLevel) || !Number.isInteger(state.targetLevel) || state.sourceLevel < 1 || state.sourceLevel > 100 || state.targetLevel < 1 || state.targetLevel > 100) issues.push("双方等级必须是 1–100 的整数");
  const nonNegativeFields = ["sourceArmorBreak", "sourceSpecialization", "sourceBreakFlat", "sourceCrit", "sourceCritDamage", "sourcePierce", "sourceFinalBonus", "targetDefense", "targetArmor", "targetSpecializationDefense", "targetFinalResistance", "targetAntiCrit", "targetCritDamageReduction", "targetBlock"];
  if (nonNegativeFields.some((id) => state[id] < 0)) issues.push("攻击、防御、暴击、穿刺及固定点数属性不能为负数");
  if (state.sourceSkillEnhancement < 0 || state.targetSkillResistance < 0) issues.push("技能增强与技能抵挡不能为负数");
  if (state.sourceBreakPercent < 0 || state.sourceBreakPercent > 100) issues.push("忽视防御必须在 0%–100% 内");
  if (!Number.isInteger(state.actualTargetCount) || !Number.isInteger(state.fullDamageTargetCount) || state.actualTargetCount < 1 || state.fullDamageTargetCount < 1) issues.push("目标数必须是大于 0 的整数");
  if (state.includeWeaknessMultiplier && state.targetWeakness < -100) issues.push("目标弱点不能低于 -100%");
  if (state.includeMonsterCorrection && (state.targetBossWeakness < -100 || state.sourceAttackCorrection < 0 || state.targetDefenseCorrection < 0)) issues.push("怪物修正输入超出已知定义域");
  if (state.includeCampBaseMultiplier && state.campBaseMultiplier < 0) issues.push("阵营基础倍率不能为负数");
  if (state.observedHit !== 0 && (!Number.isInteger(state.observedHit) || state.observedHit < 1)) issues.push("实测跳字必须是正整数");
  if (isCalibrationAction(state.damageAction) && hasProfile(state) && state.damageType !== "physical") issues.push("当前主链仅支持物理伤害校准");
  if (isActionFormula(state.damageAction) && (!Number.isInteger(state.skillLevel) || state.skillLevel < 1)) issues.push("完整动作结算需要填写大于 0 的整数技能等级");
  const level = Math.min(combatLevel(state.sourceLevel), combatLevel(state.targetLevel));
  const k = level > 45 ? 0.48 * (level - 45) + 50.4 : 1.12 * level;
  if (state.sourceCrit - state.targetAntiCrit + 180 * k <= 0) issues.push("暴击差使概率公式分母非正");
  if (state.sourcePierce - state.targetBlock + 180 * k <= 0) issues.push("穿刺差使概率公式分母非正");
  return [...new Set(issues)];
}

function profileKey(state) { return `${state.skillName}\u0000${state.skillSegment}`; }
function hasProfile(state) { return Boolean(state.skillName && state.skillSegment); }
function hasCalibrationMetadata(state) {
  return hasProfile(state)
    && state.damageType === "physical"
    && Boolean(state.sourceId)
    && Boolean(state.targetId)
    && Boolean(state.targetScenario)
    && Boolean(state.buffState)
    && state.roundingAssumption === "final-round"
    && Boolean(state.conditionalEvidence)
    && state.confirmSnapshotComplete
    && state.confirmTargetCountMetadata
    && state.targetType !== "building";
}
function hasFullFormulaInputs(state) {
  const monsterReady = state.targetType === "player" || state.targetType === "building" || state.includeMonsterCorrection;
  return state.includeCampBaseMultiplier && state.includeCrossTypeMultiplier && state.includeWeaknessMultiplier && monsterReady && state.confirmTargetCountMetadata;
}
function snapshotSignature(state) {
  return calibrationSnapshotIds.map((id) => `${id}=${String(state[id])}`).join("\u0001");
}
function activeCoefficient(state) {
  if (!boundCalibration || !isCalibrationAction(state.damageAction) || !hasCalibrationMetadata(state)) return null;
  return boundCalibration.profileKey === profileKey(state) && boundCalibration.signature === snapshotSignature(state)
    ? boundCalibration.coefficient : null;
}
function coefficientFor(state, override) {
  if (Number.isFinite(override)) return override;
  if (isCalibrationAction(state.damageAction)) return activeCoefficient(state) ?? 0;
  return 1;
}
function probabilities(critRate, blockRate, eventOrder) {
  // 目前只有资料中的“先格挡后暴击”推断可计算；其它顺序必须在调用方保持 unknown。
  if (eventOrder !== "block-first") return null;
  return { block: blockRate, critical: (1 - blockRate) * critRate, normal: (1 - blockRate) * (1 - critRate) };
}

function calculate(state, options = {}) {
  const sourceCL = combatLevel(state.sourceLevel);
  const targetCL = combatLevel(state.targetLevel);
  const combatLvl = Math.min(sourceCL, targetCL);
  const k = combatLvl > 45 ? 0.48 * (combatLvl - 45) + 50.4 : 1.12 * combatLvl;
  const attackMin = Math.min(state.sourceAttackMin, state.sourceAttackMax);
  const attackMax = Math.max(state.sourceAttackMin, state.sourceAttackMax);
  const attackRoll = Number.isFinite(options.attackRoll) ? clamp(options.attackRoll, attackMin, attackMax) : (attackMin + attackMax) / 2;
  const armorDelta = state.targetArmor <= state.sourceArmorBreak
    ? (state.sourceArmorBreak - state.targetArmor) / 3
    : state.sourceArmorBreak <= state.targetArmor / 4
      ? 2 * state.sourceArmorBreak - state.targetArmor
      : (state.sourceArmorBreak - state.targetArmor) * 2 / 3;
  const specializationDelta = Math.max(state.sourceSpecialization - state.targetSpecializationDefense, 0);
  const effectiveDefense = Math.max(state.targetDefense - state.sourceBreakFlat, 0) * (1 - state.sourceBreakPercent / 100);
  const reduction = clamp((effectiveDefense * 0.85) / (effectiveDefense + combatLvl * 31.68), 0.25, 0.8);
  const defenseMultiplier = 1 - reduction;
  const coefficient = coefficientFor(state, options.coefficient);
  const absoluteUnavailable = state.targetType === "building";
  const preDefense = Math.max(attackRoll + armorDelta + specializationDelta, 0);
  const attackPart = coefficient * preDefense * defenseMultiplier;
  const skillMultiplier = isActionFormula(state.damageAction)
    ? clamp(1 + 0.025 * (state.sourceSkillEnhancement - state.targetSkillResistance) / combatLvl, 0.05, 2.5)
    : 1;
  const skillPart = isActionFormula(state.damageAction)
    ? coefficient * state.skillLevel * 120 * skillMultiplier
    : 0;
  const baseDamage = attackPart + skillPart;

  const increase = Math.max(0, 1 + state.comboBonus / 100 + state.sourceDamageIncrease / 100 - state.targetDamageReduction / 100);
  const deepening = Math.max(0, 1 + state.sourceDamageDeepening / 100 - state.targetDamageMitigation / 100);
  const campMultiplier = state.includeCampBaseMultiplier ? state.campBaseMultiplier : 1;
  const suppression = campMultiplier * Math.max(0, 1 + state.sourceSuppression / 100 - state.targetResistance / 100);
  const crossType = state.includeCrossTypeMultiplier ? Math.max(0, 1 + state.sourceCrossTypeIncrease / 100 - state.targetCrossTypeImmunity / 100) : 1;
  const weakness = state.includeWeaknessMultiplier ? Math.max(0, 1 + state.targetWeakness / 100) : 1;
  // 资料给出分段函数；每个动作的“满伤目标数”仍需来自动作记录或实测。
  const targetCount = state.actualTargetCount <= state.fullDamageTargetCount
    ? 1 : Math.max(0.08, state.fullDamageTargetCount / state.actualTargetCount);
  const monster = state.targetType === "player" || state.targetType === "building" || !state.includeMonsterCorrection
    ? 1 : Math.max(0, 1 + state.targetBossWeakness / 100) * state.sourceAttackCorrection * state.targetDefenseCorrection;
  const comparisonMultiplier = increase * deepening * suppression;
  const fullNonEventMultiplier = comparisonMultiplier * crossType * weakness * targetCount * monster;
  const critDiff = state.sourceCrit - state.targetAntiCrit;
  const pierceDiff = state.sourcePierce - state.targetBlock;
  const critDenominator = critDiff + 180 * k;
  const pierceDenominator = pierceDiff + 180 * k;
  const critRate = critDenominator > 0 ? clamp((2 * critDiff + 45 * k) / critDenominator, 0.05, 0.75) : null;
  const pierceRate = pierceDenominator > 0 ? clamp((1.5 * pierceDiff + 135 * k) / pierceDenominator, 0.25, 1) : null;
  const blockRate = pierceRate === null ? null : 1 - pierceRate;
  const critMultiplier = clamp(state.sourceCritDamage / 100 - state.targetCritDamageReduction / 100, 1.25, 2.5);
  const finalDelta = state.sourceFinalBonus - state.targetFinalResistance;
  const floorValue = baseDamage * 0.005;
  const finalise = (core) => Math.max(core + finalDelta, floorValue, 1);
  const normal = finalise(baseDamage * fullNonEventMultiplier);
  const critical = finalise(baseDamage * fullNonEventMultiplier * critMultiplier);
  const blocked = finalise(baseDamage * fullNonEventMultiplier * 0.3);
  const event = state.eventOrder === "unknown" || critRate === null || blockRate === null ? null : probabilities(critRate, blockRate, state.eventOrder);
  const finalExpected = event ? event.normal * normal + event.critical * critical + event.block * blocked : null;
  const recommendedExpected = event ? baseDamage * comparisonMultiplier * (event.normal + event.critical * critMultiplier + event.block * 0.3) + finalDelta : null;
  return {
    sourceCL, targetCL, combatLvl, k, attackMin, attackMax, attackRoll, armorDelta, specializationDelta,
    effectiveDefense, reduction, defenseMultiplier, coefficient, attackPart, skillPart, skillMultiplier, baseDamage,
    increase, deepening, suppression, campMultiplier, crossType, weakness, targetCount, monster, comparisonMultiplier, fullNonEventMultiplier, absoluteUnavailable,
    critDiff, pierceDiff, critRate, pierceRate, blockRate, critMultiplier, finalDelta, floorValue,
    normal, critical, blocked, normalJump: Math.round(normal), critJump: Math.round(critical), blockJump: Math.round(blocked),
    event, finalExpected, recommendedExpected,
  };
}

function branchDamage(result, event) { return event === "critical" ? result.critical : event === "block" ? result.blocked : result.normal; }
function calculateWithCoefficient(state, coefficient, attackRoll) { return calculate({ ...state }, { coefficient, attackRoll }); }

function normalizeEvent(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("暴") || text === "critical" || text === "crit") return "critical";
  if (text.includes("格") || text === "block" || text === "blocked") return "block";
  if (text.includes("普") || text === "normal") return "normal";
  return null;
}
function parseSamples(raw) {
  const invalid = [];
  const samples = String(raw || "").split(/\r?\n|[,，;；]+/).map((line, index) => {
    const match = line.trim().match(/^(\d+)(?:\s*[-:：]?\s*)(.*)$/);
    const observed = match ? Number(match[1]) : 0;
    const event = match && observed > 0 && !match[2].trim().startsWith(".") && normalizeEvent(match[2]);
    if (!match || !event) { if (line.trim()) invalid.push(index + 1); return null; }
    return { observed, event };
  }).filter(Boolean);
  return { samples, invalid };
}
function sampleInterval(state, sample) {
  if (state.targetType === "building") return null;
  // 跳字取整与服务器中间取整仍待验证；这里采用显示四舍五入的工作假设。
  const targetLow = sample.observed - 0.5;
  const targetHigh = sample.observed + 0.5;
  const attackMin = Math.min(state.sourceAttackMin, state.sourceAttackMax);
  const attackMax = Math.max(state.sourceAttackMin, state.sourceAttackMax);
  if (attackMax - attackMin + 1 > MAX_CALIBRATION_ATTACK_ROLLS) return { unavailable: "attack-range" };
  const attacks = Array.from({ length: attackMax - attackMin + 1 }, (_, index) => attackMin + index);
  const upper = MAX_COEFFICIENT_SEARCH;
  const crossing = (attack, target, strict) => {
    const damage = (coefficient) => branchDamage(calculateWithCoefficient(state, coefficient, attack), sample.event);
    if (damage(upper) === null || damage(upper) < target || (strict && damage(upper) <= target)) return upper;
    let lo = 0, hi = upper;
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      if (strict ? damage(mid) > target : damage(mid) >= target) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const intervals = attacks.map((attack) => ({
    lo: crossing(attack, targetLow, false),
    hi: crossing(attack, targetHigh, true),
    attack,
  })).filter((interval) => interval.lo <= interval.hi && interval.lo < upper);
  if (!intervals.length) return { unavailable: "no-match" };
  // 任意一个服务器可能取到的整数攻击值可解释该跳字，故样本集合是这些区间的并集。
  const sorted = intervals.sort((a, b) => a.lo - b.lo);
  const merged = [];
  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (previous && interval.lo <= previous.hi) {
      previous.hi = Math.max(previous.hi, interval.hi);
      previous.attacks.push(interval.attack);
    } else merged.push({ lo: interval.lo, hi: interval.hi, attacks: [interval.attack] });
  });
  return { intervals: merged, sample };
}
function calibrationData(state) {
  const parsed = parseSamples(state.observedSamples);
  const samples = parsed.samples.length ? parsed.samples : (() => {
    const event = normalizeEvent(state.observedEvent);
    return Number.isInteger(state.observedHit) && state.observedHit > 0 && event ? [{ observed: state.observedHit, event }] : [];
  })();
  if (!hasCalibrationMetadata(state) || !samples.length) return { interval: null, invalid: parsed.invalid, missingMetadata: !hasCalibrationMetadata(state), unavailable: false };
  const sampleSets = samples.map((sample) => sampleInterval(state, sample));
  if (sampleSets.some((item) => item?.unavailable === "attack-range")) return { interval: null, invalid: parsed.invalid, unavailable: "attack-range" };
  if (sampleSets.some((item) => !item || item.unavailable) || !sampleSets.length) return { interval: null, invalid: parsed.invalid, unavailable: "no-match" };
  let intersection = sampleSets[0].intervals.map((interval) => ({ ...interval }));
  for (const sampleSet of sampleSets.slice(1)) {
    const next = [];
    intersection.forEach((left) => sampleSet.intervals.forEach((right) => {
      const lo = Math.max(left.lo, right.lo);
      const hi = Math.min(left.hi, right.hi);
      if (lo <= hi) next.push({ lo, hi });
    }));
    intersection = next;
  }
  const merged = intersection.sort((a, b) => a.lo - b.lo).reduce((all, interval) => {
    const previous = all[all.length - 1];
    if (previous && interval.lo <= previous.hi) previous.hi = Math.max(previous.hi, interval.hi);
    else all.push({ ...interval });
    return all;
  }, []);
  if (!merged.length) return { interval: { noOverlap: true, intervals: [] }, invalid: parsed.invalid, unavailable: false };
  const best = merged.reduce((largest, interval) => interval.hi - interval.lo > largest.hi - largest.lo ? interval : largest, merged[0]);
  return { interval: { lo: best.lo, hi: best.hi, midpoint: (best.lo + best.hi) / 2, noOverlap: false, intervals: merged }, invalid: parsed.invalid, unavailable: false };
}

function setStatus(text, tone = "empty") { const node = element("coefficientStatus"); if (node) { node.textContent = text; node.className = `status status-${tone}`; } }
function setMeaning(text, tone = "") { const node = element("resultMeaning"); if (node) { node.textContent = text; node.dataset.tone = tone; } }
function setOutcomesVisible(visible) {
  const node = element("outcomes");
  if (node) node.hidden = !visible;
}
function invalidateCalibration(reason = "动作档案、面板、情境或样本已变更") {
  if (!boundCalibration) return;
  boundCalibration = null;
  setStatus("需重新校准", "stale");
  element("profileHint").textContent = `${reason}；此前绑定已失效，绝对伤害已隐藏。`;
}
function updateCalibrationReadout(state) {
  if (!isCalibrationAction(state.damageAction)) {
    element("calibratedCoefficient").value = "—";
    element("sampleWarning").textContent = "";
    element("calibrationSetDetail").textContent = "";
    return { interval: null, invalid: [], missingMetadata: false, unavailable: false };
  }
  if (validationIssues(state).length) {
    element("calibratedCoefficient").value = "定义域外";
    element("sampleWarning").textContent = "先修正公式定义域输入，才能反推系数。";
    return { interval: null, invalid: [], unavailable: true };
  }
  const data = calibrationData(state);
  element("calibratedCoefficient").value = !data.interval ? "—" : data.interval.noOverlap ? "样本无共同区间" : `${data.interval.lo.toFixed(6)}–${data.interval.hi.toFixed(6)}`;
  const detail = element("calibrationSetDetail");
  if (detail) detail.textContent = data.interval?.intervals?.length > 1
    ? `存在 ${data.interval.intervals.length} 段不连续可行集合；不会自动采用其中一段，请补充样本。`
    : "";
  element("sampleWarning").textContent = data.invalid.length ? `第 ${data.invalid.join("、")} 行无法识别；事件请填写“普通 / 暴击 / 格挡”。` : data.missingMetadata ? "校准需记录攻防方标识、目标情境、伤害类型、Buff / 状态、取整假设与条件乘区记录。" : data.unavailable === "attack-range" ? `攻击区间超过 ${MAX_CALIBRATION_ATTACK_ROLLS.toLocaleString()} 个整数，当前拒绝近似校准。` : data.unavailable ? "当前样本无法由稳定主链产生；请核对面板、命中段、状态与事件。" : data.interval?.noOverlap ? "这些样本没有共同系数区间；请核对动作、命中段、Buff、目标数及攻防快照。" : "";
  return data;
}
function bindCalibration(state, coefficient, source, interval = null) {
  boundCalibration = { coefficient, source, interval, profileKey: profileKey(state), signature: snapshotSignature(state) };
  pendingManualCoefficient = coefficient.toFixed(6);
  coefficientModeValue = pendingManualCoefficient;
  element("normalAttackCoefficient").value = pendingManualCoefficient;
  setStatus(source === "observed-range" ? "实测区间已绑定" : "手填系数已绑定", "ready");
}
function applyCalibratedCoefficient() {
  const state = readState(), data = updateCalibrationReadout(state);
  if (!hasProfile(state)) return setMeaning("请先填写动作名称和命中段 / 事件类型，再校准。", "invalid");
  if (!hasCalibrationMetadata(state)) return setMeaning("请补全攻防方标识、目标情境、物理伤害类型、Buff / 状态、最终取整假设、条件乘区记录、完整面板与满伤目标数确认，再校准。", "invalid");
  if (data.invalid.length) return setMeaning("先修正无法识别的样本事件，再校准。", "invalid");
  if (!hasFullFormulaInputs(state)) return setMeaning("请确认阵营、跨类、弱点、目标数及适用的怪物修正后再校准。", "invalid");
  if (data.unavailable === "attack-range") return setMeaning("攻击区间过宽，拒绝用端点或连续近似替代整数枚举；请缩小面板区间或拆分样本。", "invalid");
  if (data.unavailable) return setMeaning("当前样本不能由当前主链产生；请核对面板、段、状态、目标数与事件。", "invalid");
  if (!data.interval) return setMeaning("请填写至少一条实测跳字与事件。", "invalid");
  if (data.interval.noOverlap) return setMeaning("这些样本没有共同系数区间；请核对动作、命中段、Buff、目标数及攻防快照。", "invalid");
  if (data.interval.intervals.length > 1) return setMeaning("样本交集有多个不连续可行集合；请补充实测样本，避免任意选择一段。", "invalid");
  bindCalibration(state, data.interval.midpoint, "observed-range", data.interval);
  element("profileHint").textContent = `当前动作：${state.skillName} · ${state.skillSegment}；${data.interval.intervals.length} 条样本共同支持经验有效系数 ${data.interval.lo.toFixed(6)}–${data.interval.hi.toFixed(6)}。它不等于已证实的动作内部裸系数。`;
  refresh({ flash: true });
}
function applyManualCoefficient() {
  const state = readState(), coefficient = Number(state.normalAttackCoefficient) || 0;
  if (!isCalibrationAction(state.damageAction)) return setMeaning("动作系数只用于完整动作结算。", "invalid");
  if (!hasProfile(state)) return setMeaning("请先填写动作名称和命中段 / 事件类型，再绑定手填系数。", "invalid");
  if (!hasCalibrationMetadata(state)) return setMeaning("请补全攻防方标识、目标情境、物理伤害类型、Buff / 状态、最终取整假设、条件乘区记录、完整面板与满伤目标数确认，再绑定。", "invalid");
  if (!hasFullFormulaInputs(state)) return setMeaning("请确认阵营、跨类、弱点、目标数及适用的怪物修正后再绑定。", "invalid");
  if (!(coefficient > 0)) return setMeaning("动作系数必须大于 0。", "invalid");
  bindCalibration(state, coefficient, "manual");
  element("profileHint").textContent = `当前动作：${state.skillName} · ${state.skillSegment}；已绑定手填系数 ${coefficient.toFixed(6)}。修改完整快照任一字段会使其失效。`;
  refresh({ flash: true });
}

function updateLabels(state) {
  const labels = roleLabels(state.targetType);
  element("sourceSpecializationLabel").textContent = labels.sourceSpecialization;
  element("sourceSuppressionLabel").textContent = labels.sourceSuppression;
  element("targetSpecializationLabel").textContent = labels.targetSpecialization;
  element("targetResistanceLabel").textContent = labels.targetResistance;
}
function syncState(state) {
  const active = activeCoefficient(state);
  const isCustom = isCalibrationAction(state.damageAction);
  const calibrationWorkspace = element("calibrationWorkspace");
  if (calibrationWorkspace) calibrationWorkspace.hidden = !isCustom;
  const coeffField = element("normalAttackCoefficient");
  if (active !== null) {
    coeffField.value = active.toFixed(6);
  } else if (isCustom && coefficientModeValue) {
    coeffField.value = coefficientModeValue;
  } else if (isCustom && pendingManualCoefficient) {
    coeffField.value = pendingManualCoefficient;
  }
  const calibrationReady = hasCalibrationMetadata(state) && hasFullFormulaInputs(state);
  coeffField.readOnly = !isCustom || !hasProfile(state) || active !== null;
  element("applyManualCoefficient").disabled = !isCustom || !calibrationReady || active !== null;
  element("applyCalibrated").disabled = !isCustom || !calibrationReady || active !== null;
  element("sourceSkillEnhancement").disabled = false;
  element("targetSkillResistance").disabled = false;
  element("skillLevel").disabled = false;
  const notMonster = state.targetType === "player" || state.targetType === "building";
  ["sourceAttackCorrection", "targetDefenseCorrection", "targetBossWeakness"].forEach((id) => { element(id).disabled = notMonster; });
  element("buildingWarning").hidden = state.targetType !== "building";
}
function outcomeRange(state, coefficient, key) {
  const lo = calculate(state, { coefficient, attackRoll: Math.min(state.sourceAttackMin, state.sourceAttackMax) })[key];
  const hi = calculate(state, { coefficient, attackRoll: Math.max(state.sourceAttackMin, state.sourceAttackMax) })[key];
  if (lo === null || hi === null) return "跳字范围 —";
  return `跳字范围 ${Math.round(Math.min(lo, hi))}–${Math.round(Math.max(lo, hi))}`;
}
function updateReadout(state, result) {
  const active = activeCoefficient(state);
  const isCalibrated = isCalibrationAction(state);
  const isAction = isActionFormula(state.damageAction);
  const inactive = isCalibrated && active === null;
  const metadataMissing = isCalibrated && !hasCalibrationMetadata(state);
  const model = DAMAGE_ACTIONS[state.damageAction] || DAMAGE_ACTIONS["attack-base"];
  const sourceLabel = actionSourceLabel(state);
  // 分支是已绑定动作的绝对结果；词条比较和未绑定校准都不应留下空的“跳字”栏。
  setOutcomesVisible(false);
  element("combatLevelValue").textContent = result.combatLvl;
  element("combatLevelReason").textContent = `min(${result.sourceCL}, ${result.targetCL})`;
  element("resultTitle").textContent = `${model.label} · 结果`;
  element("calibrationTitle").textContent = "完整动作结算工作台";
  element("actionChip").textContent = active === null ? model.shortLabel : sourceLabel;
  element("damageRoute").textContent = `攻击方 → 防守方（${targetTypeLabels[state.targetType]}）`;
  const warnings = [state.eventOrder === "block-first" ? "事件顺序：先格挡后暴击（推断）" : "事件顺序未知：不显示期望"];
  if (result.critRate === null) warnings.push("暴击差超出公式定义域");
  if (result.pierceRate === null) warnings.push("穿刺差超出公式定义域");
  if (isCalibrated && active !== null) {
    if (!state.includeCampBaseMultiplier) warnings.push("阵营基础倍率未纳入（待定）");
    if (!state.includeCrossTypeMultiplier) warnings.push("跨类乘区未纳入（需关系证据）");
    if (!state.includeWeaknessMultiplier) warnings.push("弱点乘区未纳入（需目标证据）");
    if (state.targetType !== "player" && state.targetType !== "building" && !state.includeMonsterCorrection) warnings.push("怪物修正未纳入（需情境证据）");
  }
  element("formulaWarning").textContent = warnings.join(" · ");
  if (metadataMissing) {
    element("expectedLabel").textContent = "校准快照未完整记录";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "补全状态、条件记录、完整面板与满伤目标数确认";
    setMeaning("动作绝对预测必须绑定完整快照；未补全前不会使用手填或历史系数。", "invalid");
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  if (inactive) {
    element("expectedLabel").textContent = "待绑定的动作系数";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "填写动作档案并绑定手填系数或实测区间";
    setMeaning("当前没有与此动作、此命中段和完整快照一致的有效系数，因此不显示绝对伤害。", "invalid");
    ["normalDamage", "criticalDamage", "blockedDamage"].forEach((id) => { element(id).textContent = "—"; });
    ["normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  if (isAction && !hasFullFormulaInputs(state)) {
    element("expectedLabel").textContent = "完整公式条件未确认";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "确认阵营、跨类、弱点、目标数及适用的怪物修正";
    setMeaning("完整动作结算需要确认所有适用条件乘区；未确认时不输出绝对伤害。", "invalid");
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  if (result.baseDamage <= 0) {
    element("expectedLabel").textContent = "请填写属性";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "等待输入";
    setMeaning("填入攻防属性后自动计算；默认口径只用于词条排序。", "");
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  const isComparison = state.damageAction === "attack-base";
  if (state.targetType === "building") {
    element("expectedLabel").textContent = "建筑规则不可用";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "建筑绝对预测与词条结论均已禁用";
    setMeaning("建筑的常规伤害链、条件乘区与事件规则尚未验证；请先建立建筑专属实测记录。", "invalid");
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  const expected = isComparison ? result.recommendedExpected : result.finalExpected;
  element("expectedLabel").textContent = isComparison ? "推荐期望基准（省略情境层）" : "完整分支期望（含逐分支保底）";
  element("expectedDamage").textContent = expected !== null ? formatNumber(expected, 2) : state.eventOrder === "unknown" ? "顺序未知" : "定义域外";
  element("damageRange").textContent = isComparison ? "攻击中点 · 增伤 × 加深 × 压制 · 仅词条排序" : `攻击中点 · ${sourceLabel} ${formatNumber(active, 6)}x · 完整公式层已启用`;
  setMeaning(isComparison ? "推荐期望故意省略跨类、弱点、目标数与怪物修正，不代表某次跳字。" : boundCalibration?.source === "observed-range" ? "完整分支含技能项与情境层；经验有效系数只对当前动作、命中段和快照有效。" : "完整分支含技能项与情境层；请确认手填系数来源与当前动作命中段一致。", "");
  if (isComparison) {
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
    return;
  }
  setOutcomesVisible(true);
  element("normalDamage").textContent = formatNumber(result.normal, 2);
  element("criticalDamage").textContent = formatNumber(result.critical, 2);
  element("blockedDamage").textContent = formatNumber(result.blocked, 2);
  element("normalJump").textContent = active === null ? `跳字 ${result.normalJump}` : outcomeRange(state, active, "normal");
  element("criticalJump").textContent = active === null ? `跳字 ${result.critJump}` : outcomeRange(state, active, "critical");
  element("blockJump").textContent = active === null ? `跳字 ${result.blockJump}` : outcomeRange(state, active, "blocked");
  if (!result.event) {
    const eventText = state.eventOrder === "unknown" ? "未加权" : "定义域外";
    ["normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = eventText; });
  } else {
    element("normalChance").textContent = formatPercent(result.event.normal, 1);
    element("criticalChance").textContent = formatPercent(result.event.critical, 1);
    element("blockChance").textContent = formatPercent(result.event.block, 1);
  }
}
function refresh({ flash = false } = {}) {
  const state = readState();
  updateLabels(state);
  syncState(state);
  updateCalibrationReadout(state);
  const issues = validationIssues(state);
  element("inputWarning").textContent = issues.join("；");
  if (issues.length) {
    setOutcomesVisible(false);
    element("combatLevelValue").textContent = "—";
    element("combatLevelReason").textContent = "输入待修正";
    element("resultTitle").textContent = "输入待修正";
    element("actionChip").textContent = "无法结算";
    element("damageRoute").textContent = "请先修正标黄的公式输入";
    element("formulaWarning").textContent = "公式定义域校验失败";
    element("expectedLabel").textContent = "无法结算";
    element("expectedDamage").textContent = "—";
    element("damageRange").textContent = "输入不在当前已验证公式的定义域内";
    setMeaning("修正输入后再显示概率、绝对伤害与经验校准；不会用 0 或夹断值伪造结果。", "invalid");
    ["normalDamage", "criticalDamage", "blockedDamage", "normalJump", "criticalJump", "blockJump", "normalChance", "criticalChance", "blockChance"].forEach((id) => { element(id).textContent = "—"; });
  } else {
    updateReadout(state, calculate(state));
  }
  if (flash) element("resultMeaning").classList.add("flash");
}
function resetInputs() {
  document.querySelectorAll("input[type=number], input[type=text], textarea, select").forEach((field) => { if (field.dataset.defaultValue !== undefined) field.value = field.dataset.defaultValue; });
  document.querySelectorAll("input[type=checkbox]").forEach((field) => { field.checked = field.dataset.defaultChecked === "true"; });
  boundCalibration = null;
  pendingManualCoefficient = "";
  coefficientModeValue = "";
  setOutcomesVisible(false);
  setStatus("未校准", "empty");
  element("profileHint").textContent = "系数必须属于当前动作、当前命中段和当前完整快照；采用后会锁定，修改动作、状态、条件记录或任一面板字段都会使其失效。";
  refresh({ flash: true });
}
function preserveDefaults() {
  document.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.type === "checkbox") field.dataset.defaultChecked = String(field.checked);
    else field.dataset.defaultValue = field.value;
  });
}

preserveDefaults();
ids.forEach((id) => {
  const field = element(id);
  if (!field) return;
  const changed = () => {
    const currentState = readState();
    if (calibrationSnapshotIds.includes(id)) invalidateCalibration();
    if (id === "normalAttackCoefficient" && currentState.damageAction === "custom") {
      pendingManualCoefficient = field.value;
      coefficientModeValue = field.value;
    }
    refresh({ flash: true });
  };
  field.addEventListener("input", changed);
  field.addEventListener("change", changed);
});
element("applyCalibrated").addEventListener("click", applyCalibratedCoefficient);
element("applyManualCoefficient").addEventListener("click", applyManualCoefficient);
element("resetButton").addEventListener("click", resetInputs);
element("appVersion")?.replaceChildren(`v${APP_VERSION}`);
element("damageAction")?.addEventListener("change", () => refresh({ flash: true }));
refresh();
