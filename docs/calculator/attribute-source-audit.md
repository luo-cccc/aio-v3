# 属性资料审计

来源目录：`C:\Users\Msi\Desktop\属性`

文件数量：18 张 `.webp` 截图，构成《诡秘之主》战斗数值公式整理（玩家版）第 4 至 21 页的连续资料片段。

## 证据等级

| 资料标记 | 计算器处理 |
| --- | --- |
| 无标记直接公式 | 可实现，保留 `source: formula-sheet-2026-09-05` 与公式版本 |
| 【待定】 | 字段可录入，默认不当作真值；需实验覆盖 |
| 【推断】 | 做成可切换策略，不作为唯一结论 |
| 【未确定】 | 不实现为结算常量；仅列入实验计划 |
| 模板、表格、演示 | 作为预设/测试样本，绝不从中反推通用公式 |
| 同快照实测拟合 | 仅保存为具名动作/命中段的经验有效系数；必须绑定完整条件，不能升级为内部裸系数 |

## 直接公式清单

### 基础攻击与防御

```text
attackRoll = 在[physicalAttackMin, physicalAttackMax]内随机取一个整数

armorDelta = (armorBreak - armor) / 3,       armor <= armorBreak
armorDelta = 2 * armorBreak - armor,         armorBreak <= armor / 4
armorDelta = (armorBreak - armor) * 2 / 3,   otherwise

specializationDelta = max(sourceSpecialization[targetType]
                          - targetSpecializationDefense[sourceType], 0)

effectiveDefense = max(targetDefense - sourceBreakFlat, 0)
                   * (1 - sourceBreakPercent)

reduction = clamp(effectiveDefense * 0.85
                  / (effectiveDefense + combatLevel * 31.68), 0.25, 0.80)
defenseMultiplier = 1 - reduction
```

`specializationDelta` 对怪物取怪物专攻子项，对玩家取途径专攻子项；不能同时相加。攻击区间的均值只用于面板和推荐期望伤害，不是单次命中值。资料定义单击为区间内整数；端点是否包含、分布是否均匀及各中间取整点仍待实测。

`sourceBreakPercent` 的直接公式在 `0%–100%` 输入域内使用。超出此范围、攻击下限大于上限，或其它输入非有限数时，计算器应拒绝绝对预测，不得借由格式化层显示为 `0` 或产生负有效防御。

### 暴击与格挡

```text
levelCoefficient = 1.12 * combatLevel
if combatLevel > 45:
  levelCoefficient = 0.48 * (combatLevel - 45) + 50.4

critDifference = sourceCrit - targetAntiCrit
critRate = clamp((2 * critDifference + 45 * levelCoefficient)
                 / (critDifference + 180 * levelCoefficient), 0.05, 0.75)

pierceDifference = sourcePierce - targetBlock
pierceRate = clamp((1.5 * pierceDifference + 135 * levelCoefficient)
                   / (pierceDifference + 180 * levelCoefficient), 0.25, 1)
blockRate = 1 - pierceRate

critMultiplier = clamp(sourceCritDamage - targetCritDamageReduction, 1.25, 2.5)
blockMultiplier = 0.3
```

“先格挡、再暴击”是资料中的【推断】。只有用户显式选择这一策略时，概率加权模型才可采用：

```text
P(block) = blockRate
P(crit) = (1 - blockRate) * critRate
P(normal) = (1 - blockRate) * (1 - critRate)

expectedEventMultiplier = P(block) * 0.3
                        + P(crit) * critMultiplier
                        + P(normal)
```

这不是已证实的服务器事件顺序。带有“普通 / 暴击 / 格挡”明确标签的实测跳字可以分别对照分支；没有事件标签的样本不得自动归为普通或用于反证事件顺序。暴击率与穿刺率的分母分别要求 `critDifference + 180 * levelCoefficient > 0`、`pierceDifference + 180 * levelCoefficient > 0`；分母非正时资料未定义函数。

### 百分比乘区与最终项

```text
suppressionMultiplier = campBaseMultiplier
                      * max(0, 1 + sourceSuppression - targetResistance)
increaseMultiplier = max(0, 1 + comboBonus + sourceDamageIncrease - targetDamageReduction)
deepeningMultiplier = max(0, 1 + sourceDamageDeepening - targetDamageMitigation)
crossTypeMultiplier = max(0, 1 + sourceCrossTypeIncrease - targetCrossTypeImmunity)
weaknessMultiplier = 1 + targetWeakness
monsterCorrection = (1 + targetBossWeakness) * sourceAttackCorrection * targetDefenseCorrection

finalFixedDelta = sourceFinalDamageBonus - targetFinalDamageResistance
coreResolvedDamage = baseDamage * allApplicableMultipliers * eventMultiplier
resolvedDamage = coreResolvedDamage + finalFixedDelta
finalDamage = max(resolvedDamage, baseDamage * 0.005, 1)
displayDamage = round(finalDamage)
```

`campBaseMultiplier` 的数据表未恢复；资料将木桩暂按 1 处理，并标为【待定】。`1x` 只能作为界面可见的实验假设，不能静默当作已知中性事实。

跨类倍率需要伤害类型、目标类别和双方跨类输入；弱点要求目标弱点值（已知域不低于 `-100%`）；怪物修正要求首领弱点、攻防修正和目标情境，且不能用于玩家或建筑。条件缺失时，绝对分支应标为未建模/禁用，而不是把未知值默认成 `1x`。

资料第 8 页直接给出“目标数系数”：命中目标数不超过技能满伤目标数时为 `1`；超过时为 `技能满伤目标数 ÷ 实际命中数`，最低 `0.08`。单体命中时“实际命中目标数=1、技能满伤目标数=1”是该动作的快照条件，不是其它动作也为 `1x` 的依据；范围、多目标、弹射、分摊和追加命中仍须记录各自动作的满伤目标数和实际命中计数。

## 面板与实际结算的边界

| 面板数据 | 含义 | 计算器处理 |
| --- | --- | --- |
| 攻击 | 物理攻击下限与上限的均值显示 | 输入必须录下限、上限；不可只录中值 |
| 防御率、破防率、暴击率、格挡率、穿刺率 | 假设对方对应属性为 0 的“对空气”展示百分比 | 不参与实战结算；实战用双方对抗函数 |
| 基础数值、百分比加成、固定附加 | 词条面板的三部分来源 | `panelValue = baseValue * (1 + percentBonus) + fixedAddition`；已有面板最终值时不得再次叠加 |
| 标准玩家、标准首领表 | 客户端同等级基准模板 | 仅作预设与相对词条比较，不视为真实对象平均值 |
| 木桩候选属性 | 外部候选值 | 作为实验假设快照；隐藏专防、抵抗、修正等不可视为已知 |

第 20、21 页模板表的“生命”列因列宽不足而换行，例如 `3883` / `5694` 应读作一个连续的 `38,835,694`，不是两个对象的生命值。类似换行数字在导入模板时必须先按原表列结构复原，不能按视觉行数拆成两条记录。

## 可复用基础分支与具名动作校准

当前“不加载通用技能公式”应解释为：不为任意未知主动技能自动加载系数、等级和技能专属基础值；这不等于永久删除技能增强字段，也不妨碍为具名动作保存专属证据或同快照经验校准。第 16 页的录屏支持条目明确写出“平 A 也吃技能增强”，但没有给出平 A 的确切乘区/系数；因此该字段应保留为**待校准开关**，不能直接套用主动技能公式。

以下主动技能项是有来源的候选结构，但只对资料明确覆盖的具名动作，或同一动作/命中段/快照的经验校准可用：

```text
技能系数 * 技能等级 * 120 * 技能增强倍率
技能增强倍率 = clamp(1 + 0.025 * (技能增强 - 技能抵挡) / 战斗等级, 0.05, 2.5)
```

普通攻击是否有等于 `1` 的普通攻击系数，资料没有直接证明。比较模式可以使用 `1x` 作为共同倍率基准，但绝对跳字必须将其设为待校准参数或专属证据，不能默认为事实。

经验校准的最小绑定键为：动作名、命中段、伤害类型、攻击方与目标方完整面板、目标类型、受影响目标数、所有 Buff/状态、事件标签、条件乘区状态和取整假设；**仅在输出概率加权结果时**才需要采用的事件策略。反推必须枚举攻击区间内的整数值，并以含最终固定项、保底和显示取整的完整分支函数搜索系数可行集合；保底或负固定项附近不能以线性除法反推。

## 已更正的资料错误

- 资料第 10 页 `4.4 治疗暴击率` 写有治疗暴击率的换算，但用户已确认游戏内**治疗不会暴击**。该条目在本项目中标为错误资料：不实现为公式、不作为实验假设，也不纳入任何治疗扩展分支。

## 结果语义

- 第 6 页区分了基础伤害、结算伤害、最终伤害与显示跳字：最终伤害为 `max(结算伤害, 基础伤害 * 0.5%, 1)`，显示跳字为最终伤害四舍五入到整数。
- 第 11-12 页的推荐期望伤害用攻击区间中点和事件概率作统计近似，并明确“不适合预测某一击的数字”。它只用于收益比较，必须省略跨类、弱点、目标数系数和怪物修正，且不能拿来与单次跳字或实际扣血直接做差。
- 如需“概率加权的单次最终伤害”，必须先在普通/暴击/格挡分支中各自应用保底，再按已选事件策略加权；不能先加权未保底分支再做一次保底。该结果也不等于推荐期望伤害。
- 第 6、15 页只确认最终伤害应用顺序为“先扣护盾，再扣生命”。护盾吸收、溢出、护盾破裂效果和中间取整没有完整公式，必须作为实测字段保存。

## 不能当公式的内容

- 68 级战士、技能 15 级、标准首领或木桩的伤害演示：是公式代入示例，木桩还存在未见词条/修正。
- “归一一步”数值：是推荐系统的策划等价值，不是装备成长率和伤害系数。
- 等级模板表：是离散配置数据，不可线性拟合成角色等级公式。
- 五维当前样本：不能由一个角色快照反推出通用转换率。
- 自走棋、生命比例、固定扣血、反弹、首领反击等特殊分支：不适用于当前物理主链或具名动作校准。

## 剩余实验问题

1. 普通攻击系数及攻击区间端点/随机分布。
2. 战斗等级映射的完整表与是否总取双方较小值。
3. 服务器每一个中间阶段的取整点。
4. “先格挡后暴击”是否为真实事件顺序。
5. 阵营基础倍率表、木桩隐藏专防/抵抗、攻击修正、防御修正、弱点。
6. 保底与最终固定项在负值、护盾、取整情境下的精确优先级。
7. 跨类、每个具名动作的满伤目标数/实际命中计数语义与建筑专属规则；建筑在确认前不得继承玩家绝对预测。
8. 同一具名技能在不同命中段、目标数、Buff/状态与攻防快照下的可迁移性；经验系数必须以这些条件失效。
