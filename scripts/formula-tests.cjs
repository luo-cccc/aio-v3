"use strict";

const fs = require("fs");
const projectRoot = require("path").resolve(__dirname, "..");
const source = fs.readFileSync(require("path").join(projectRoot, "calculator.js"), "utf8");
const htmlSource = fs.readFileSync(require("path").join(projectRoot, "calculator.html"), "utf8");
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing ${name}`);
  const openParen = source.indexOf("(", start);
  let parenDepth = 0;
  let brace = -1;
  for (let index = openParen; index < source.length; index += 1) {
    if (source[index] === "(") parenDepth += 1;
    else if (source[index] === ")") parenDepth -= 1;
    else if (source[index] === "{" && parenDepth === 0) { brace = index; break; }
  }
  if (brace < 0) throw new Error(`Missing body for ${name}`);
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (char === "\\") { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}") { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`Unclosed ${name}`);
}
const prelude = `
const clamp=(value,lo,hi)=>Math.min(Math.max(value,lo),hi);
let boundCalibration=null;
const MAX_CALIBRATION_ATTACK_ROLLS=10001;
const MAX_COEFFICIENT_SEARCH=1000000;
function activeCoefficient(){return null;}
function isCalibrationAction(action){return action==='custom';}
function isActionFormula(action){return action==='custom';}
function coefficientFor(state,override){return Number.isFinite(override)?override:(isCalibrationAction(state.damageAction)?0:1);}
function hasProfile(state){return Boolean(state.skillName&&state.skillSegment);}
function hasCalibrationMetadata(state){return hasProfile(state)&&state.damageType==='physical'&&Boolean(state.sourceId)&&Boolean(state.targetId)&&Boolean(state.targetScenario)&&Boolean(state.buffState)&&state.roundingAssumption==='final-round'&&Boolean(state.conditionalEvidence)&&state.confirmSnapshotComplete&&state.confirmTargetCountMetadata&&state.targetType!=='building';}
`;
if (!source.includes("let coefficientModeValue")) throw new Error("Missing independent custom coefficient state");
const runtime = new Function(`${prelude}\n${["combatLevel", "probabilities", "calculate", "branchDamage", "calculateWithCoefficient", "normalizeEvent", "parseSamples", "sampleInterval", "calibrationData"].map(extractFunction).join("\n")}\nreturn { combatLevel, calculate, calibrationData };`)();
const { combatLevel, calculate, calibrationData } = runtime;

function fixture(overrides = {}) {
  return {
    sourceLevel: 69, targetLevel: 69, sourceAttackMin: 100, sourceAttackMax: 100,
    sourceArmorBreak: 0, targetArmor: 0, sourceSpecialization: 0, sourceSkillEnhancement: 0, targetSkillResistance: 0, targetSpecializationDefense: 0,
    sourceBreakFlat: 0, sourceBreakPercent: 0, damageAction: "attack-base", normalAttackCoefficient: 1,
    comboBonus: 0, sourceDamageIncrease: 0, targetDamageReduction: 0, sourceDamageDeepening: 0,
    targetDamageMitigation: 0, campBaseMultiplier: 1, includeCampBaseMultiplier: false,
    sourceSuppression: 0, targetResistance: 0, includeCrossTypeMultiplier: false, sourceCrossTypeIncrease: 0,
    targetCrossTypeImmunity: 0, includeWeaknessMultiplier: false, targetWeakness: 0,
    actualTargetCount: 1, fullDamageTargetCount: 1, targetType: "player", includeMonsterCorrection: false,
    targetBossWeakness: 0, sourceAttackCorrection: 1, targetDefenseCorrection: 1,
    sourceCrit: 0, targetAntiCrit: 0, sourcePierce: 0, targetBlock: 0,
    sourceCritDamage: 150, targetCritDamageReduction: 0, sourceFinalBonus: 0, targetFinalResistance: 0,
    eventOrder: "block-first", targetDefense: 0, skillLevel: 1, sourceId: "source", targetId: "target", targetScenario: "pvp", skillName: "test", skillSegment: "hit", damageType: "physical", buffState: "none", roundingAssumption: "final-round", conditionalEvidence: "none", confirmSnapshotComplete: true, confirmTargetCountMetadata: true, ...overrides,
  };
}
function near(actual, expected, message, tolerance = 1e-9) { if (Math.abs(actual - expected) > tolerance) throw new Error(`${message}: ${actual} != ${expected}`); }
function assert(condition, message) { if (!condition) throw new Error(message); }
const tests = [];
function test(name, fn) { try { fn(); tests.push({ name, pass: true }); } catch (error) { tests.push({ name, pass: false, error: error.message }); } }

test("combat-level table remains exact", () => { near(combatLevel(68), 17, "68"); near(combatLevel(69), 18, "69"); near(combatLevel(72), 20, "72"); near(combatLevel(99), 44, "99"); near(combatLevel(100), 45, "100"); });
test("armor boundaries keep documented equality", () => { near(calculate(fixture({ sourceArmorBreak: 100, targetArmor: 100 })).armorDelta, 0, "H=P"); near(calculate(fixture({ sourceArmorBreak: 25, targetArmor: 100 })).armorDelta, -50, "P=H/4"); });
test("defense clamp spans 0.75 to 0.20", () => { near(calculate(fixture({ targetDefense: 0 })).defenseMultiplier, 0.75, "low defense"); near(calculate(fixture({ targetDefense: 1e9 })).defenseMultiplier, 0.2, "high defense"); });
test("event probabilities sum to one", () => { const result = calculate(fixture({ sourceCrit: 599, targetAntiCrit: 611, sourcePierce: 1702, targetBlock: 2039 })); near(result.event.normal + result.event.critical + result.event.block, 1, "sum"); });
test("only an explicit supported event-order strategy produces probabilities", () => {
  const blockFirst = calculate(fixture({ eventOrder: "block-first" }));
  assert(blockFirst.event !== null, "supported strategy returns an event distribution");
  assert(source.includes('if (eventOrder !== "block-first") return null;'), "unsupported strategies are not silently evaluated as block-first");
});
test("each branch is floored before final expectation", () => { const result = calculate(fixture({ sourceAttackMin: 200, sourceAttackMax: 200, sourceFinalBonus: 30, targetFinalResistance: 160 })); const weighted = result.event.normal * result.normal + result.event.critical * result.critical + result.event.block * result.blocked; near(result.finalExpected, weighted, "branch weighted"); assert(result.normal >= result.floorValue && result.critical >= result.floorValue && result.blocked >= result.floorValue, "per-branch floor"); });
test("recommended expectation omits enabled scenario multipliers", () => { const baseline = calculate(fixture({ sourceAttackMin: 200, sourceAttackMax: 200, sourceFinalBonus: 10 })); const scenario = calculate(fixture({ sourceAttackMin: 200, sourceAttackMax: 200, sourceFinalBonus: 10, includeCrossTypeMultiplier: true, sourceCrossTypeIncrease: 80, includeWeaknessMultiplier: true, targetWeakness: 50 })); near(baseline.recommendedExpected, scenario.recommendedExpected, "recommended"); assert(scenario.fullNonEventMultiplier > baseline.fullNonEventMultiplier, "full branch scenario layer"); });
test("target-count formula uses full-target metadata and 8% floor", () => { const result = calculate(fixture({ actualTargetCount: 20, fullDamageTargetCount: 1 })); near(result.targetCount, 0.08, "8% floor"); assert(result.normal > 0, "multi-target branch remains calculable with explicit metadata"); });
test("building output is explicitly guarded by UI state", () => { const result = calculate(fixture({ targetType: "building" })); assert(result.absoluteUnavailable, "building is unavailable for absolute prediction"); });
test("invalid probability denominators return null", () => { const result = calculate(fixture({ targetAntiCrit: 10000, targetBlock: 10000 })); assert(result.critRate === null && result.pierceRate === null && result.finalExpected === null, "domain guard"); });
test("unknown event order blocks both weighted expectations without blocking branch math", () => {
  const result = calculate(fixture({ eventOrder: "unknown", sourceAttackMin: 200, sourceAttackMax: 200 }));
  assert(result.normal > 0 && result.critical > 0 && result.blocked > 0, "branches remain available");
  assert(result.finalExpected === null && result.recommendedExpected === null, "weighted expectations stay unavailable");
  assert(source.includes('state.eventOrder === "unknown"'), "unknown order is an explicit runtime state");
  assert(htmlSource.includes("顺序未知（不显示期望）"), "unknown order is the UI default option");
});
test("mode switching does not overwrite the calibrated coefficient field", () => {
  assert(!source.includes('coeffField.value = "1"'), "mode switch does not replace the visible coefficient with 1");
  assert(source.includes("active !== null"), "bound coefficient remains the source of truth");
});
test("invalid non-negative attributes are rejected before UI calculation", () => {
  assert(source.includes("攻击、防御、暴击、穿刺及固定点数属性不能为负数"), "non-negative domain guard");
});
test("integer search returns a feasible set and rejects endpoint approximation", () => {
  const data = calibrationData(fixture({ sourceAttackMin: 2, sourceAttackMax: 4, observedSamples: "100 普通" }));
  assert(data.interval && !data.interval.noOverlap, "integer calibration interval");
  assert(data.interval.intervals.length >= 1, "feasible union retained");
  const wide = calibrationData(fixture({ sourceAttackMin: 0, sourceAttackMax: 10001, observedSamples: "100 普通" }));
  assert(wide.unavailable === "attack-range", "wide ranges must not fall back to endpoints");
});
test("unknown strategy hides only probability weighting, not labelled calibration", () => {
  const unknown = calculate(fixture({ eventOrder: "unknown" }));
  assert(unknown.event === null && unknown.finalExpected === null, "unknown strategy blocks probability output");
  const data = calibrationData(fixture({ eventOrder: "unknown", observedSamples: "100 普通" }));
  assert(data.interval && !data.interval.noOverlap, "labelled branch remains calibratable");
});
test("PVP stable snapshot covers observed event jumps", () => {
  // 近期攻防截图中攻击方途径专攻为 0，防守方“攻击者对应专防”为 2201。
  // 专攻差仍为 max(0 - 2201, 0) = 0；此前记录填 0 虽未改变输出，也要更正为截图值。
  const common = fixture({ sourceAttackMin: 4736, sourceAttackMax: 5066, sourceArmorBreak: 569, sourceBreakFlat: 1531, sourceBreakPercent: 13.6, targetDefense: 2610, targetArmor: 434, targetSpecializationDefense: 2201, targetDamageReduction: 17, sourceDamageDeepening: 7.61, targetDamageMitigation: 7.8, sourceSuppression: 4.5, targetResistance: 4.5, sourceCrit: 599, targetAntiCrit: 611, sourcePierce: 1702, targetBlock: 2039, sourceCritDamage: 156.4, targetCritDamageReduction: 6.4, sourceFinalBonus: 91, targetFinalResistance: 91 });
  const low = calculate(common, { coefficient: 0.225, attackRoll: 4736 });
  const high = calculate(common, { coefficient: 0.225, attackRoll: 5066 });
  assert(low.normal <= 431 && high.normal >= 431, "normal 431");
  assert(low.critical <= 652 && high.critical >= 655, "crit 652–655");
  assert(low.blocked <= 132 && high.blocked >= 132, "block 132");
  const calibrated = calibrationData({ ...common, observedSamples: "431 普通\n652 暴击\n655 暴击\n132 格挡\n132 格挡\n133 格挡" });
  assert(calibrated.interval && !calibrated.interval.noOverlap && calibrated.interval.intervals.length === 1, "one shared empirical set");
  near(calibrated.interval.lo, 0.220720981, "PVP calibrated lower bound", 1e-6);
  near(calibrated.interval.hi, 0.230524416, "PVP calibrated upper bound", 1e-6);
});
test("comparison mode does not execute action-specific skill terms", () => {
  const result = calculate(fixture(), { coefficient: 0.0974 });
  near(result.skillPart, 0, "comparison skill part");
  near(result.skillMultiplier, 1, "comparison skill multiplier");
});
test("2.2 action formula applies the integrated skill enhancement term", () => {
  const state = fixture({ damageAction: "custom", sourceSkillEnhancement: 474, targetSkillResistance: 0, skillLevel: 15 });
  const result = calculate(state, { coefficient: 0.0974, attackRoll: 2350 });
  near(result.skillMultiplier, 1 + 0.025 * 474 / result.combatLvl, "skill enhancement multiplier");
  near(result.skillPart, 0.0974 * 15 * 120 * result.skillMultiplier, "skill level part");
  near(result.baseDamage, result.attackPart + result.skillPart, "skill base damage");
});
test("2.2 action skill enhancement clamps to the documented domain", () => {
  const low = calculate(fixture({ damageAction: "custom", sourceSkillEnhancement: 0, targetSkillResistance: 100000, skillLevel: 1 }), { coefficient: 1 });
  const high = calculate(fixture({ damageAction: "custom", sourceSkillEnhancement: 100000, targetSkillResistance: 0, skillLevel: 1 }), { coefficient: 1 });
  near(low.skillMultiplier, 0.05, "lower clamp");
  near(high.skillMultiplier, 2.5, "upper clamp");
});
test("2.2 action formula keeps every explicit condition layer in the final branch", () => {
  const state = fixture({ damageAction: "custom", sourceSkillEnhancement: 474, targetSkillResistance: 0, skillLevel: 15, includeCampBaseMultiplier: true, campBaseMultiplier: 1.2, includeCrossTypeMultiplier: true, sourceCrossTypeIncrease: 20, targetCrossTypeImmunity: 0, includeWeaknessMultiplier: true, targetWeakness: 10, actualTargetCount: 2, fullDamageTargetCount: 1 });
  const result = calculate(state, { coefficient: 0.0974, attackRoll: 2350 });
  near(result.targetCount, 0.5, "target count");
  near(result.campMultiplier, 1.2, "camp multiplier");
  near(result.crossType, 1.2, "cross-type multiplier");
  near(result.weakness, 1.1, "weakness multiplier");
  near(result.baseDamage, result.attackPart + result.skillPart, "full base damage");
  assert(result.normal > 0 && result.critical > result.normal && result.blocked < result.normal, "final event branches");
});
test("formula inputs and calibration metadata are covered by the runtime contract", () => {
  const required = ["eventOrder", "includeCampBaseMultiplier", "includeMonsterCorrection", "includeCrossTypeMultiplier", "includeWeaknessMultiplier", "actualTargetCount", "fullDamageTargetCount", "confirmTargetCountMetadata", "sourceId", "targetId", "targetScenario", "damageType", "buffState", "controlVariableNote", "roundingAssumption", "conditionalEvidence", "confirmSnapshotComplete"];
  required.forEach((id) => assert(source.includes(`"${id}"`), `missing runtime id ${id}`));
});
test("runtime validates finite numeric inputs before calculating", () => {
  assert(source.includes("数值输入必须为有限数字"), "finite-number validation message");
});
test("display jump calibration requires integer attack rolls and integer observed jumps", () => {
  assert(source.includes("攻击下限不能大于攻击上限"), "reversed attack range validation");
  assert(source.includes("实测跳字必须是正整数"), "observed jump validation");
  assert(source.includes("line.trim().match(/^(\\d+)"), "sample parser accepts only integer jumps");
  assert(source.includes("observed > 0"), "zero sample jumps rejected");
});
test("comparison mode does not expose event branches as absolute jump predictions", () => {
  assert(source.includes("if (isComparison) {"), "comparison branch guard");
});
test("view state progressively discloses calibration and branch outcomes", () => {
  assert(source.includes('calibrationWorkspace.hidden = !isCustom'), "calibration workspace follows action mode");
  assert(source.includes("setOutcomesVisible(false);"), "non-absolute states hide outcome branches");
  assert(source.includes("setOutcomesVisible(true);"), "bound custom state reveals outcome branches");
  assert(!source.includes('querySelector("details.advanced").open = true'), "mode switch does not force unrelated advanced panel open");
});
test("2.2 is the single integrated delivery action formula", () => {
  assert(source.includes('const APP_VERSION = "2.2"'), "version is 2.2 delivery");
  assert(source.includes("function isActionFormula(action) { return action === \"custom\"; }"), "action formula is integrated into custom mode");
  assert(!source.includes("skill-test") && !source.includes("full-test"), "test modes removed from runtime");
  assert(htmlSource.includes("完整动作结算"), "delivery action mode is selectable");
  assert(htmlSource.includes("技能增强") && htmlSource.includes("技能抵挡") && htmlSource.includes("技能等级"), "integrated formula inputs are visible");
  assert(!htmlSource.includes("2.1测试") && !htmlSource.includes("2.2测试"), "test labels removed from delivery UI");
});
console.log(JSON.stringify(tests, null, 2));
if (tests.some((test) => !test.pass)) process.exit(1);
