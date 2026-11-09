# On-request LLM / multi-agent event-to-theme impact analysis: evidence, methods, recommended design, and event-detection sources (as of Nov 2026)

## 1. Evidence on LLMs analyzing news/events for asset returns and macro reasoning: where they over/under-perform, and how calibrated their probabilities are

### Takeaway
LLMs pull directional information out of text well. Wrapped in retrieval, independent sampling, aggregation and statistical recalibration, they now approach or match strong human forecasters on general judgmental questions. They still trail liquid markets. Their raw stated probabilities are miscalibrated in both directions depending on the task: overconfident on question-answering, hedged toward 50% and "acquiescent" on forecasts. Backtests on events before a model's training cutoff are contaminated by memorization. The documented news-to-returns edge is concentrated in small caps, negative news and 1-day horizons, and it shrinks as LLM adoption spreads. For theme-level, multi-week questions about large US stocks, the LLM's comparative advantage is structured mechanism-mapping and synthesis, not beating prices.

### Cited Findings

#### News to returns (the canonical result and its decay)
- Lopez-Lira & Tang (arXiv 2304.07619, revised several times, latest Oct 2025): ChatGPT labels each headline good/bad/neutral for the firm. The scores are significantly positively related to next-day returns and outperform traditional sentiment methods. GPT-1, GPT-2 and BERT fail, which the authors read as an emergent capability of larger models — [arXiv v5](https://arxiv.org/abs/2304.07619v5)
- The predictability is stronger for **small stocks and after negative news**. The authors attribute it to limits-to-arbitrage and underreaction — [arXiv v5](https://arxiv.org/abs/2304.07619v5)
- v5 headline: a daily long-short on GPT-4 recommendations earns about 38 bps/day **before transaction costs** — [arXiv v5 PDF](https://arxiv.org/pdf/2304.07619v5.pdf)
- (Revision) Later versions add a model with information-capacity constraints and LLM adoption, predicting that wider LLM use makes prices more efficient. They report strategy returns **declining as LLM adoption rises** — [arXiv v5](https://arxiv.org/abs/2304.07619v5). Based on search-engine extracts of the abstract; full text not read.

#### Look-ahead bias and memorization (affects any historical validation)
- Lopez-Lira, Tang & Zhu, "The Memorization Problem" (Apr 2025): GPT-4o recalls S&P 500 levels near-exactly before its Oct-2023 training cutoff, along with unemployment and GDP figures — [arXiv 2504.14765v1](https://arxiv.org/html/2504.14765v1)
- Same paper:
  - Explicit instructions to respect historical boundaries do **not** stop recall-level accuracy.
  - **Masking fails**, because models reconstruct masked entities and dates from minimal context.
  - There is no recall after the cutoff, where directional accuracy was about 40% on a small sample.
  - Any measured memorization is a lower bound.
  - [arXiv 2504.14765v2](https://arxiv.org/html/2504.14765v2); [SSRN 5217505](https://papers.ssrn.com/abstract=5217505)
- Gao, Jiang & Yan (CUHK), "Detecting Lookahead Bias in LLM Forecasts":
  - Proposes a LAP statistic and a regression test, where a positive LAP×forecast interaction indicates contamination.
  - Memorization "substantially amplifies the apparent predictive power" of LLM forecasts.
  - Contamination is task-specific: it depends on domain, target, model and prompt.
  - The aim is to measure what predictability survives, not to discard LLM forecasts.
  - [arXiv 2512.23847](https://arxiv.org/pdf/2512.23847)
- MemGuard-Alpha (2026) treats memorization-driven look-ahead as a serious validity threat for LLM alpha signals — [arXiv 2603.26797](https://arxiv.org/pdf/2603.26797.pdf)

#### "LLMs as financial analysts" evaluations
- Kim, Muhn & Nikolaev (Chicago Booth, May 2024, revised Feb 2025): GPT-4, given standardized and anonymized financial statements, outperforms analysts at predicting the **direction** of next-period earnings changes, even without narrative or industry context — [arXiv 2407.17866v2](https://arxiv.org/html/2407.17866v2). A secondary newsletter puts analysts' directional accuracy around 53%; this was not verified against the paper — [LLMQuant](https://llmquant.substack.com/p/can-large-language-models-replace)
- FinanceBench (Patronus AI, Nov 2023; **older, superseded by newer models**):
  - GPT-4-Turbo with shared-vector-store retrieval answered incorrectly or refused **81%** of a 150-question sample.
  - With long context, GPT-4-Turbo failed 21% and Claude-2 failed 24%.
  - When given the correct passage directly, GPT-4-Turbo reached about 85% accuracy.
  - [arXiv 2311.11944](https://arxiv.org/abs/2311.11944v1); [Patronus announcement](https://patronus.ai/announcements/patronus-ai-launches-financebench-the-industrys-first-benchmark-for-llm-performance-on-financial-questions)
  - A 2026 blog (secondary) attributes the 81% to the shared-store setup, reporting about 50% correct and 39% refused with per-document stores — [Beancount research log](https://beancount.io/es/bean-labs/research-logs/2026/05/12/financebench-open-book-financial-qa-benchmark)
- Vals AI Finance Agent Benchmark:
  - The 2025 paper (with Stanford) found models struggled to exceed 50% accuracy on real-world financial research tasks — [alphaXiv 2508.00828](https://alphaxiv.org/abs/2508.00828)
  - **Newer:** the v2.1 leaderboard (Oct 19, 2026) has Claude Opus 5.5 top at 67.85%, then Gemini 4 Argon at 67.66%; each task has a 2-hour limit — [Vals AI](https://www.vals.ai/benchmarks/fabv2-1)

#### Macro reasoning
- Faria-e-Castro & Leibovici (St. Louis Fed Review, 2024): PaLM's retrospective inflation forecasts beat the Survey of Professional Forecasters on mean-squared error in most years and at nearly every horizon over 2019–23. They also reverted more slowly to the 2% anchor. The authors frame this as a cheap complement — [St. Louis Fed](https://www.stlouisfed.org/publications/review/2024/nov/artificial-intelligence-and-inflation-forecasts)
- (Revision flag) The 2025 memorization evidence shows that models recall pre-cutoff macro values, so in-sample retrospective comparisons like this one cannot separate forecasting from recall — [arXiv 2504.14765v2](https://arxiv.org/html/2504.14765v2)

#### Judgmental forecasting, aggregation, calibration systems
- Halawi et al. (UC Berkeley, Feb 2024): a retrieval → reasoning → aggregation pipeline, plus fine-tuning on reasoning that beat the crowd.
  - On 914 test questions it scored a Brier of **0.179 vs the crowd's 0.149**, and 71.5% vs 77.0% accuracy.
  - It **beats the crowd when allowed to choose which questions to forecast**.
  - Zero-shot LMs without retrieval did poorly; only the GPT-4 and Claude-2 series beat random.
  - It was relatively better where the crowd was uncertain, and combining it with the crowd improved the Brier score.
  - [arXiv 2402.18563](https://arxiv.org/html/2402.18563v1); [ar5iv](https://ar5iv.labs.arxiv.org/html/2402.18563)
- Schoenegger et al., "Wisdom of the Silicon Crowd" (Science Advances, Nov 2024): a 12-LLM ensemble forecast 31 binary questions against 925 human forecasters.
  - The LLM crowd beat a no-information benchmark and was **statistically indistinguishable from the human crowd**.
  - It showed **acquiescence bias**: mean predictions were significantly above 50% despite a nearly even split of resolutions.
  - Showing GPT-4 and Claude 2 the human median improved their accuracy, but **simply averaging human and machine forecasts was more accurate**.
  - [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11800985/); [arXiv 2402.19379](https://arxiv.org/abs/2402.19379)
- ForecastBench (Forecasting Research Institute, FRI):
  - Superforecasters score a difficulty-adjusted Brier of 0.081 vs 0.101 for the best baseline LLM (GPT-4.5). FRI extrapolated parity around Nov 2026 (95% CI Jan 2026–Nov 2027) — [FRI](https://forecastingresearch.substack.com/p/llms-are-closing-the-gap-on-human)
  - A later FRI post says an AI system ranked above superforecasters on market questions for the first time — [FRI](https://forecastingresearch.substack.com/p/ai-models-have-likely-reached-parity)
  - **Contested:** Good Judgment says superforecasters remain much more accurate on market questions — [Good Judgment](https://goodjudgment.substack.com/p/what-superforecasters-actually-said)
  - The comparison depends on difficulty adjustment, because the human panel was last surveyed in 2024 on a different question set — [Lightning Rod](https://blog.lightningrod.ai/p/ai-reaches-human-superforecaster-range)
- AIA Forecaster (Bridgewater AIA Labs, Nov 2025):
  - Three components: agentic search over **high-quality news sources**; a **supervisor agent** that reconciles disparate forecasts, running extra searches instead of taking a simple mean; and **statistical calibration** to counter LLM biases.
  - On ForecastBench it is statistically indistinguishable from superforecasters, with a better point estimate.
  - On MarketLiquid (liquid prediction markets) it **trails market consensus**, but an ensemble of AIA plus consensus **beats consensus alone**.
  - These are the authors' claims and are not independently verified — [arXiv 2511.07678](https://arxiv.org/html/2511.07678v1)
  - Appendix and section titles include "LLMs Attenuate Forecasts", "Platt Scaling is Generalized Log Odds Extremization", "Simple Averaging Is a Strong Baseline" and "Supervisor Agents Resolve Disagreements" — [arXiv PDF](https://arxiv.org/pdf/2511.07678)
- Human + LLM: Schoenegger, Park, Karger, Trott & Tetlock (991 participants).
  - The preprint reported 24–28% accuracy gains from either a high-quality GPT-4-Turbo assistant or a deliberately overconfident, base-rate-neglecting one; a later revision reported 23%.
  - The **2025 ACM TiiS published version is more cautious**: the data "do not consistently support" the hypotheses, and there are outlier effects.
  - [arXiv 2402.07862](https://arxiv.org/pdf/2402.07862); [LSE](https://researchonline.lse.ac.uk/id/eprint/127059)

#### Calibration of stated (verbalized) probabilities
- Xiong et al.: vanilla verbalized confidence is significantly **overconfident** and predicts failures poorly; calibration improves with scale — [arXiv 2306.13063](https://arxiv.org/pdf/2306.13063)
- "Overconfidence is Key" tested GPT-4, GPT-3.5, LLaMA-2-70b and PaLM 2, and proposed a net calibration error metric that shows the direction of miscalibration — [arXiv 2405.02917](https://arxiv.org/html/2405.02917v1)
- Prompt design can substantially improve calibration: large models averaged an expected calibration error (ECE) of about 0.07 under combined methods — [alphaXiv 2412.14737](https://alphaxiv.org/overview/2412.14737v1)
- For reasoning models, supervised fine-tuning and reinforcement learning can improve verbalized calibration, but findings are mixed and prompt-sensitive — [arXiv 2504.06564](https://arxiv.org/pdf/2504.06564)
- Apr 2026 mechanistic study: identifiable internal circuits inflate verbalized confidence, and post-training may strengthen this (hypothesis) — [arXiv 2604.01457](https://arxiv.org/html/2604.01457)
- DiNCo: overconfidence partly reflects suggestibility; it normalizes confidence across self-generated distractors — [arXiv 2509.25532](https://arxiv.org/html/2509.25532v1)
- For **forecasts** the bias runs the other way: LLMs attenuate toward 50% ([AIA](https://arxiv.org/pdf/2511.07678)) and show above-50% acquiescence ([Schoenegger](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11800985/)).

#### Industry context
- CFA Institute survey (fielded Feb 2024, released Aug 2024, 200 firms):
  - About 85% say the industry needs AI standards and ethical guidelines.
  - 47% say their organization is not well prepared for regulatory change.
  - 70% call AI compliance and risk training preferred or essential.
  - No 2025 edition was found — [CFA Institute](https://www.cfainstitute.org/about/press-releases/2024/AI-in-investment-sector-survey)

#### Older findings that newer evidence revises (flag list)
- **FinanceBench 2023** (81% failure with retrieval) is superseded by Vals 2026 (top about 68% on harder agentic tasks) — [Vals AI](https://www.vals.ai/benchmarks/fabv2-1)
- **Halawi 2024** (below the crowd) is followed by AIA 2025, which matches superforecasters on ForecastBench but still trails markets — [arXiv 2511.07678](https://arxiv.org/html/2511.07678v1)
- **The ForecastBench 2024 gap** (0.081 vs 0.101) moved to claimed parity in 2025–26, which is disputed — [FRI](https://forecastingresearch.substack.com/p/ai-models-have-likely-reached-parity); [Good Judgment](https://goodjudgment.substack.com/p/what-superforecasters-actually-said)
- **Lopez-Lira & Tang 2023** predictability is reported to decay with adoption in later versions — [arXiv v5](https://arxiv.org/abs/2304.07619v5)
- **The PaLM-beats-SPF result (2024)** is undercut by the 2025 memorization critique of pre-cutoff tests — [arXiv 2504.14765v2](https://arxiv.org/html/2504.14765v2)
- **The AI-assisted forecasting gains (2024 preprint)** were stated more cautiously in the 2025 published version — [LSE](https://researchonline.lse.ac.uk/id/eprint/127059)

### Inferences
- Do not present the department as a return predictor. Its measurable products are (i) explicit mechanisms and (ii) probabilistic directional calls on theme **excess return vs SPY** at stated horizons, which can be scored (see Q3).
- **Where LLMs over-perform:** reading and synthesizing many documents, enumerating transmission channels, applying a rubric consistently, proposing analogs, and selective forecasting (abstaining when evidence is thin, per Halawi).
- **Where they under-perform:**
  - multi-step numeric finance (about 68% at best on agentic finance tasks), so all numbers should be computed in code;
  - out-predicting liquid prices;
  - raw calibration;
  - resisting user framing (Q2).
- Calibration error changes sign by task: overconfident on question-answering, attenuated or acquiescent on forecasts. Don't hard-code a correction. Learn it from the system's own logged record (Q3).
- Replaying famous past events (2018 tariffs, 2020 COVID, 2022 invasion, 2025 tariff shocks) is fine for demos and regression-testing the pipeline. It is **not evidence of skill**, because the model has memorized the outcomes. Skill evidence comes only from live, timestamped calls made after deployment, or on events after the model's cutoff.
- Market-implied information should be both an input (prior) and an ensemble partner. AIA plus market consensus beat consensus, and human-plus-machine averaging beat either alone (Schoenegger, Halawi).
- For large-cap US themes at weekly-plus horizons, the 1-day small-cap headline edge is not the relevant one. The plausible "edge" is slow-diffusing second-order channels (Q2), and the main value is disciplined thinking for the owner.

### Gaps
- Full texts for arXiv and Substack sources could not be fetched in this session: arxiv.org and forecastingresearch.substack.com are outside the session's network allowlist and must be allowed to verify. Figures above come from search-engine extracts of abstracts and HTML pages.
- AIA's ablation magnitudes (how much the supervisor and the calibration each add) were not retrieved.
- No study was found that evaluates LLMs mapping macro or geopolitical events to sector/theme returns at multi-week horizons with post-cutoff scoring.
- No Claude-specific study of calibration on financial forecasts was found.
- Glasserman & Lin (2023), on look-ahead bias and the "distraction effect" of company names, was not checked.
- No published critique applying the memorization test specifically to Kim et al. was verified.

## 2. Structured methods that improve impact analysis (causal chains, first- vs second-order effects, base rates/analogs, "already priced in" checks, red teaming/pre-mortems, superforecasting practice, horizons, scenarios)

### Takeaway
The best-supported practices come from forecasting research:
- start from the outside view (base rates and comparison classes) before case details;
- decompose the question;
- aggregate independent estimates;
- calibrate and score explicitly.

Finance evidence adds a crucial asymmetry. First-order macro and announcement news is priced within minutes, while second-order (linked-firm, supply-chain) effects diffuse over weeks to months. Multi-agent "debate" as such is not reliably better than self-consistency or averaging. A "department" should spend its budget on independent evidence, heterogeneous models, and targeted reconciliation and red-team checks, not on chat rounds.

### Cited Findings

#### Superforecasting practices (outside view, training, teams, aggregation)
- Good Judgment Project (GJP):
  - A roughly one-hour training module on probabilistic reasoning, the outside view and bias avoidance produced lasting gains (at least one year).
  - Using comparison classes correlated with accuracy, while some content such as post-mortem analysis was associated with **lower** accuracy.
  - Teaming helped somewhat.
  - Official forecasts used performance-weighted aggregation and then **extremizing** (pushing toward 0/1). How much to extremize depends on the forecaster pool, and the practice is still controversial.
  - Selecting strong forecasters had the largest effect.
  - [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
- Tetlock credits teams with process gains from viewpoint diversity and dynamic debate — [Tetlock slides, Nomura conference](https://www.nomura.com/events/10th-annual-global-quantitative-investment-strategies-conference/resources/upload/How_much_better_can_we_get_Tetlock.pdf)
- Comparison-class reasoning was among the top correlates of forecaster accuracy (Karvetski et al., 2022, as cited in a 2026 paper) — [alphaXiv 2606.30987](https://www.alphaxiv.org/abs/2606.30987.md)
- ForecastBench's LLM prompt asks for the best reference class and a base rate that ignores case-specific factors, then adjusts — [ForecastBench paper](https://arxiv.org/pdf/2409.19839). Forecast-Dojo uses a similar instruction — [arXiv 2609.28876](https://arxiv.org/pdf/2609.28876). These are instructions, not controlled tests.

#### "Already priced in": first-order announcement effects are absorbed in minutes
- Council of Economic Advisers (CEA) analysis of 2021–23 US data releases: Treasury and equity futures react "within minutes (and in some cases, seconds)", with "virtually no statistically significant" market reactions after 5 minutes — [CEA](https://www.whitehouse.gov/wp-content/uploads/2024/02/CEA-PFEI-Analysis.pdf)
- Australian interest-rate futures: the majority of the reaction is complete within 30 seconds — [vLex abstract](https://law-journals-books.vlex.com/vid/impact-of-macroeconomic-announcements-855683252)
- On liquid prediction markets, even a state-of-the-art AI forecaster trails market consensus — [AIA, arXiv 2511.07678](https://arxiv.org/html/2511.07678v1)

#### Second-order effects diffuse slowly (where analysis can add value)
- Cohen & Frazzini (Journal of Finance, 2008):
  - Investors with limited attention price news about economically linked firms with a lag.
  - A customer-momentum long-short strategy earns **1.55%/month (18.6%/yr)** abnormal returns.
  - The result is robust to the three-factor model, liquidity, own-firm, industry and cross-industry momentum.
  - The customer accounts for about 20% of the supplier's sales on average.
  - [RePEc](https://ideas.repec.org/a/bla/jfinan/v63y2008i4p1977-2011.html); [AQR](https://www.aqr.com/Insights/Research/Journal-Article/Economic-Links-and-Predictable-Returns)
- Ali & Hirshleifer (NBER working paper, 2018): shared analyst coverage is a stronger proxy for fundamental links, and momentum spills over across such links — [NBER w25201](https://www.nber.org/system/files/working_papers/w25201/w25201.pdf)
- 2026 preprints (not peer-reviewed):
  - Text signals propagate down supply-chain graphs, attributed to investor inattention; a secondary write-up reports a long-short Sharpe ratio of about 0.86 — [arXiv 2606.29290](https://arxiv.org/abs/2606.29290); [write-up](https://letsdatascience.com/news/paper-demonstrates-networked-llm-embeddings-predict-returns-ce634771)
  - Embedding similarity captures *topical* rather than *causal* links. Having an LLM classify edges as competitor, supply-chain or complement, and down-weighting spurious ones, gives more reliable portfolios — [arXiv 2604.19476](https://arxiv.org/html/2604.19476)
  - LLMs plus web-search snippets can build supply-chain knowledge graphs — [arXiv 2605.27845](https://arxiv.org/html/2605.27845v1)

#### Base rates for geopolitical shocks
- Caldara & Iacoviello (American Economic Review, 2022):
  - Higher geopolitical risk (GPR) depresses investment and stock returns.
  - Industry exposures are estimated from daily returns.
  - The 2017 working paper describes the stock drop as "significant but short-lived".
  - [GPR page](https://www.matteoiacoviello.com/gpr.htm); [paper](https://www.matteoiacoviello.com/gpr_files/GPR_PAPER.pdf)
- AI-GPR (Iacoviello & Tong, 2026, preliminary): a daily index from 1960 to 2026. It shows a stronger and more precisely estimated negative effect of GPR innovations on stock returns than the keyword-based index — [AI-GPR](https://www.matteoiacoviello.com/ai_gpr.html); [Federal Reserve note](https://www.frbsf.org/research-and-insights/publications/board-of-governors/2026/03/the-ai-gpr-index-measuring-geopolitical-risk-using-artificial-intelligence/)

#### Debate vs ensembling; red team; pre-mortem
- Zhang et al. (2025), testing 5 multi-agent debate (MAD) methods on 9 benchmarks with 4 models: MAD **fails to reliably beat chain-of-thought or self-consistency**, even with extra compute. **Model heterogeneity helps** (Heter-MAD) — [arXiv 2502.08788](https://arxiv.org/abs/2502.08788)
- AIA: "Simple averaging is a strong baseline". The supervisor adds value by resolving **substantial divergences** with targeted searches — [arXiv 2511.07678](https://arxiv.org/pdf/2511.07678); [secondary summary](https://accelxr.substack.com/p/automated-oracle-how-forecasting)
- Pre-mortem: Klein (Harvard Business Review) cites Mitchell, Russo & Pennington (1989). Prospective hindsight, imagining the outcome already happened, raises the ability to identify reasons for future outcomes by about 30%. This measures reasons generated, not forecast accuracy — [HBR article PDF](https://wiki.duraspace.org/download/attachments/104563925/ProjectPremortem.pdf?api=v2)

#### Framing and sycophancy (a pitfall, because the owner writes the event in free text)
- UK AI Security Institute (AISI), testing GPT-4o, GPT-5 and Claude Sonnet 4.5:
  - First-person framing ("I believe…") triggers more sycophancy than third-person framing.
  - The more committed the user seems, the more the model agrees.
  - Asking without stating an opinion reduces the effect.
  - [AISI](https://www.aisi.gov.uk/blog/ask-dont-tell-reducing-sycophancy-in-large-language-models-2)
- User-suggested answers shift model answers, by up to 30% for GPT-4.1-nano and 8% for GPT-4o — [arXiv 2506.10297](https://arxiv.org/html/2506.10297v1). Sycophancy appears in single and multi-turn settings, and its intensity correlates with argument strength — [EMNLP 2025 Findings](https://preview.aclanthology.org/author-page-yu-wang-polytechnic/2025.findings-emnlp.1241.pdf)

### Inferences — recommended pipeline (steps and structure)
**Core idea:** split the problem into **event → macro-factor shocks** (LLM judgment) and **factor shocks → theme impact** (code, using measured sensitivities). Then let the LLM add non-factor and second-order channels on top, and state disagreements with the computed numbers explicitly.

0. **Intake and neutralization** (cheap model or code)
   - Turn the owner's free text into an *Event Card*: what, who, where, type, status and t0.
     - Type is one of: scheduled macro release, monetary policy, fiscal/trade policy, regulation, geopolitical/military, commodity/supply shock, tech/industry, company-specific.
     - Status is one of: rumor, announced, enacted, ongoing.
     - t0 is the first public timestamp, confirmed via the news timeline in step 1.
   - Rewrite the event in **neutral third person, without the owner's opinion**, to counter sycophancy per AISI. Keep the original text for display.
1. **Context pack** (code only, no LLM)
   - (a) Dated news cluster and attention/tone timeline (Q4).
   - (b) **Market reaction since t0**: each of the 10 factors' move in σ units, and each theme's excess return vs SPY.
   - (c) **"Already-in-price" estimate**: for each theme, Σ β(theme, factor) × realized Δfactor since t0, compared with the realized theme move.
   - (d) **Analog stats** for owner- or LLM-proposed analog dates. Compute the median theme excess return over +5, +20 and +60 trading days, the hit rate and the interquartile range (IQR), using current constituents and flagging composition and survivorship bias. Take outcomes from price data, never from the LLM's memory.
   - (e) Market-implied probability of the event's next step (prediction markets) and scheduled catalysts within the horizon (calendars).
   - (f) The top 5–8 RAG book passages, each with an ID.
2. **Event → factor translation** (strong model)
   - Outside view first: what analogs and base rates say, including how geopolitical shocks usually fade (GPR evidence).
   - Then, for each of the 10 factors: expected sign, magnitude bucket (0, small, medium or large in σ), probability, horizon, and a causal chain of at most 3 steps with evidence IDs.
   - Then a "remaining shock" = expected − already realized since t0.
   - Plus "non-factor channels": direct exposures such as tariffs on specific inputs, sanctions, industry regulation, or a supply-chain node.
   - Use **scenarios** (base / escalation / de-escalation with probabilities summing to 1, anchored to prediction-market odds where they exist). Each scenario is its own factor-shock vector.
3. **Factor → theme impact** (code)
   - implied_forward(theme) = Σ_scenarios p × Σ_f β × remaining_shock.
   - Map |implied| / σ_theme to provisional strength 1–3.
   - Derive a confidence prior from beta strength labels and analog dispersion.
   - Themes with negligible implied impact and no direct channel go into a "no measured link" bucket.
4. **Theme analysts** (strong model; K independent samples, ideally from **heterogeneous models**)
   - For each theme: direction (up/down/mixed), strength 1–3, mechanism labelled **1st-order** (via factor betas) or **2nd-order** (customers/suppliers/competitors/policy), horizon, confidence 0–1, priced-in status, what to watch (dated catalysts plus thresholds), and evidence IDs.
   - They must **reconcile with step 3**: agree, or disagree with a stated reason.
5. **Red team / pre-mortem** (cheaper model, separate instructions)
   - Prompt: "It is H later and the call on theme X was wrong: give the 2 most likely reasons."
   - Checklist: already priced in, reflexive policy response, short-lived geopolitical base rate, ambiguous sign across constituents, crowding, unstable betas, data errors.
   - Output: confidence adjustments and flags.
   - This is cheap and generates reasons (Klein). Its accuracy benefit for LLMs is unproven, so keep it short.
6. **Supervisor** (strong model)
   - Aggregate the K samples: median probability and majority direction.
   - Only if the samples diverge materially, run 1–3 targeted retrievals or searches restricted to high-quality domains (AIA pattern).
   - Fold in the red-team flags, enforce the evidence rules (Q3), and emit the final JSON.
   - Optional **new-theme suggestion**, only if all hold: the event creates a multi-quarter driver; at least 5 liquid US names with *evidenced* revenue exposure exist; there is low overlap with existing themes. Label it exploratory.
7. **Calibrate, validate, render** (code plus cheap model)
   - Apply the learned calibration map (Q3).
   - Run a schema and evidence-ID validator.
   - Render to Hebrew: enum values stay English in JSON, Hebrew goes in text fields, and numbers and tickers are inserted from data.
8. **Ledger**: store every theme call as a scoreable forecast (Q3). Resolution is pure computation, run when the owner opens the page or on the next request, so it stays consistent with "no scheduled runs".

**Horizons:** use 1 week (5 trading days), 1 month (21) and 3 months (63).
- Given minutes-level pricing of first-order news, 1-week calls mostly test "priced in / overreaction".
- 1–3-month calls test second-order diffusion, the monthly-scale effect in Cohen & Frazzini.

**Short pass vs full department:**
- Short pass = steps 0, 1, 3 and 7, plus **one** strong-model call combining steps 2 and 4 with a 3-line built-in pre-mortem.
- Full department = all steps with K = 3.

### Gaps
- No direct evidence was found that LLM pre-mortems or red-team prompts improve forecast *accuracy*. Human evidence concerns generating reasons, and GJP even found post-mortem training content associated with lower accuracy.
- No controlled test of outside-view or base-rate prompting for LLMs was found; it is supported only indirectly, through human comparison-class evidence.
- No published evidence was found on optimal horizons or σ-bands for theme-level event calls; they must be set and then validated on the owner's own log.
- Analog base rates for the owner's themes don't exist off the shelf and must be computed. Theme composition drift makes historical analogs approximate.

## 3. Grounding the LLM in measured sensitivities, evidence-citation rules, events with no measured link, and keeping confidence calibrated over time

### Takeaway
Numbers should flow from computation into the LLM, never the other way.
- Compute factor-implied impacts, priced-in ratios and analog statistics in code.
- Make the LLM cite evidence IDs for every claim and explicitly reconcile any contradiction with the measured betas.
- Treat "no measured link" as a valid, scored outcome.
- Keep a forecast ledger with explicit horizons, scored against realized theme excess returns vs SPY: ranked probability score (RPS) for ordered up/mixed/down, Brier for binary.
- Benchmark against a "factor-model-only" baseline, and recalibrate stated confidence (Platt scaling / extremizing) once enough calls have resolved.

### Cited Findings
- Retrieval quality dominates. With the right passage supplied, GPT-4-Turbo reached about 85% accuracy on FinanceBench; with naive shared-store retrieval it failed or refused 81% (2023) — [arXiv 2311.11944](https://arxiv.org/abs/2311.11944v1); [Patronus](https://patronus.ai/announcements/patronus-ai-launches-financebench-the-industrys-first-benchmark-for-llm-performance-on-financial-questions). Zero-shot LMs without retrieval forecast poorly — [Halawi et al.](https://arxiv.org/html/2402.18563v1)
- Claude API mechanics relevant to enforcing structure:
  - `output_config.format` constrains responses to a JSON schema — [Anthropic: structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
  - The native Citations feature returns `cited_text` with character or page locations for supplied documents, but per Anthropic's API reference it is **incompatible with `output_config.format`** (400 error) — [Anthropic: citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- Calibration techniques:
  - AIA uses statistical calibration against LLM attenuation, framing Platt scaling as "generalized log-odds extremization" — [arXiv 2511.07678](https://arxiv.org/pdf/2511.07678)
  - GJP extremized aggregated forecasts, with the degree depending on the forecaster pool — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
  - LLM ensembles show above-50% acquiescence — [Schoenegger et al.](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11800985/)
- Scoring rules:
  - The Brier score treats categories as unordered.
  - The ranked probability score (RPS) works on cumulative probabilities, so it respects order and is proper for ordinal outcomes. For two categories RPS equals Brier.
  - A ranked probability skill score (RPSS) against a climatology baseline above 0 means the forecasts beat the baseline.
  - [scoringrules docs](https://scoringrules.readthedocs.io/en/latest/theory.html); [Galdran, arXiv 2309.08701](https://arxiv.org/pdf/2309.08701)
- Reference scale: ForecastBench superforecasters score a difficulty-adjusted Brier of about 0.081, vs 0.101 for the best baseline LLM — [FRI](https://forecastingresearch.substack.com/p/llms-are-closing-the-gap-on-human)
- Only post-cutoff, live forecasts validate skill: instructions and masking do not stop recall of pre-cutoff data — [arXiv 2504.14765v2](https://arxiv.org/html/2504.14765v2). Contamination can be diagnosed with the LAP test — [arXiv 2512.23847](https://arxiv.org/pdf/2512.23847)
- Combining with market consensus adds information — [AIA](https://arxiv.org/html/2511.07678v1). Averaging human and LLM forecasts beat either alone — [Schoenegger et al.](https://arxiv.org/abs/2402.19379)
- Governance: about 85% of surveyed firms want AI standards — [CFA Institute](https://www.cfainstitute.org/about/press-releases/2024/AI-in-investment-sector-survey). This supports an auditable evidence trail and "research, not advice" labelling.

### Inferences — evidence rules, output schema, scoring protocol
**Evidence rules** (enforced by prompt plus a code validator)
- **E1 Provenance tags.** Every claim carries IDs:
  - `[F#]` factor beta or label from the scan
  - `[P#]` computed price reaction or priced-in ratio
  - `[A#]` analog statistic
  - `[N#]` news item (URL plus timestamp)
  - `[K#]` 8-K or filing
  - `[M#]` prediction-market price
  - `[R#]` RAG passage (book plus chunk or page)
  
  Untagged sentences must be labelled "judgment". Use these custom IDs rather than native Citations, because Citations can't be combined with JSON-schema output in the same call.
- **E2 Precedence:** measured data > market prices > dated news facts > RAG frameworks > model prior knowledge. RAG books supply *mechanisms and historical precedent*, never current facts or numbers.
- **E3 No invented numbers.** Every number in the output must exist in the evidence pack. The validator regex-checks numbers against the pack and rejects or repairs violations.
- **E4 Contradiction rule.** If the LLM's direction contradicts the sign of the factor-implied impact for a theme whose betas are labelled strong:
  - it must name the overriding channel (idiosyncratic, regulatory, second-order);
  - confidence is capped (e.g., ≤ 0.6) unless an analog or filing supports the override;
  - the UI shows "the model disagrees with the data, because…".
- **E5 No-measured-link default.** If no factor has strength of at least "moderate" and no direct channel is evidenced, output "no material measured effect" (scored as the "flat" category) with a short note. Do not write a forced narrative. The list of unaffected themes is itself useful output.
- **E6 Priced-in disclosure.** Report realized/implied since t0.
  - If ≥ ~0.8, mark "largely priced in"; forward calls must then rest on persistence or second-order arguments.
  - If the theme moved opposite to the implied move, flag a possible over-reaction or another driver.
- **E7 Abstention allowed.** Use "insufficient evidence" when retrieval is thin. Selective forecasting improved Halawi's results.
- **E8 Separate facts from judgment** in the rendered Hebrew text, using visual labels; this is research, not advice.

**Per-theme output JSON** (English keys and enums, Hebrew strings):
`{theme_id, direction: up|down|mixed|none, strength: 1-3, horizon_days: 5|21|63, p_up, p_flat, p_down, confidence, mechanism_order: first|second|both, mechanism_he, factor_reconciliation: agree|disagree|n/a, disagreement_reason_he, priced_in_ratio, priced_in_flag, watch: [{what_he, date, threshold}], evidence_ids: [...], judgment_only: bool}`

**Scoring protocol**
- *Outcome definition:* theme excess return vs SPY from the call-time close to close + H days.
  - "up" if > +0.5·σ_H, "down" if < −0.5·σ_H, otherwise "flat/mixed", where σ_H is the theme's own H-day excess-return volatility.
  - Strength bins ≈ 0.5–1σ / 1–2σ / >2σ.
  - These thresholds are design choices to tune.
- *Scores:* RPS on (p_down, p_flat, p_up); Brier on the binary "direction correct"; mean absolute strength error.
- *Two baselines:*
  - (i) climatology: each theme's historical up/flat/down frequencies;
  - (ii) a **factor-only model**: the sign and bins of the step-3 implied impact with fixed confidence.
  
  The LLM department "adds value" only if its ranked probability skill score (RPSS) vs the factor-only baseline is > 0 over a meaningful sample.
- *Calibration upkeep:*
  - Reliability table by confidence bins.
  - Until about 50–100 resolved calls, apply no learned map, but clip directional confidence to roughly 0.5–0.85. The direction of LLM miscalibration varies by task, so don't assume it.
  - After that, fit Platt scaling on logit(confidence), which AIA frames as generalized extremizing, and refit periodically on request.
  - Show the owner a running "track record" panel.
- *Statistical caution:* themes within one event, and events clustered in time, are correlated. Count effective sample size per event, not per theme.

### Gaps
- No published contradiction rates between LLM narratives and measured data in finance were found; rules E4–E6 are design inferences.
- No source gives the minimum sample size for stable Platt recalibration in this setting; the 50–100 figure is a heuristic.
- The thresholds for "priced in" (0.8) and the ±0.5σ flat band have no literature basis found; they need empirical tuning.

## 4. Event detection and context sources (GDELT 2.0, free news APIs, SEC 8-K feeds, central-bank/economic calendars) and whether automatic detection is worth it

### Takeaway
For an on-request system, automatic event detection is low-value as a *trigger*, but high-value as *request-time context enrichment*. When the owner submits an event, fetch:
1. a dated news cluster, to pin down facts and t0;
2. attention/tone and geopolitical-risk indices, to size the event against history;
3. market-implied probabilities and scheduled catalysts, for "priced in" and "what to watch".

GDELT (free, 15-minute updates, global) is noisy, at about 55% key-field accuracy with about 20% redundancy. Use it for volume and tone timelines, not as a fact source. Finnhub (free at 60 calls/min, ticker-linked news) and SEC EDGAR (8-K, free, 10 requests/s) are the most practical ticker-linked feeds. NewsAPI and GNews free tiers are development or non-commercial use only, with 12–24 hour delays.

### Cited Findings

#### GDELT
- GDELT 2.0 Events and the Global Knowledge Graph (GKG) both update **every 15 minutes** — [GDELT blog](https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/)
- Event date fields are daily, so use DATEADDED for 15-minute resolution — [Event codebook V2.0](http://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf)
- Other references: [GKG 2.1 codebook](http://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf); [master file list](http://data.gdeltproject.org/gdeltv2/masterfilelist.txt). Some 15-minute intervals are missing, so pipelines must check for gaps — [gdeltPyR](https://github.com/iLtc/gdeltPyR)
- DOC 2.0 API:
  - Free full-text search of GDELT news, with article lists, volume/tone timelines and tone charts — [Jentic overview](https://jentic.com/apis/api.gdeltproject.org/gdelt.md); [GDELT blog](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
  - Article-list modes cover roughly the **last 3 months**. Timeline modes reach further back; the GDELT blog says back to Jan 1, 2017, but the date of that change is unclear and sources disagree — [GDELT blog](https://blog.gdeltproject.org/doc-2-0-updates-1-5-year-searching-and-updated-mobile-interface/)
  - No API key is needed. A third-party tool documents a daily tone average on a −100..+100 scale — [cyanheads GDELT MCP](https://lobehub.com/mcp/cyanheads-gdelt-mcp-server)
- Quality:
  - A 2025 hand-check found **key-field accuracy around 55% and redundancy near 20%** (English sources about 56%, non-English about 53%) — [MDPI Data 2025](https://www.mdpi.com/2306-5729/10/10/158); [DOAJ](https://doaj.org/article/8b06dbbde8ac4947bb9f91a9da2e99d7)
  - Compared with POLECAT, GDELT is weaker on redundancy and domain accuracy; POLECAT is smaller with fewer false positives — [GDELT vs POLECAT](https://www.citedrive.com/en/discovery/evaluating-automated-event-databases-for-event-forecasting-a-comparative-analysis-of-gdelt-and-polecat/)
  - False positives come from coding background material in articles; filtering on the root-event flag cuts them with little information loss — [Beieler 2013](https://johnbeieler.org/blog/2013/10/28/noise-and-gdelt/)
  - A deduplication method exists to reduce overcounting — [JCSS 2025](https://ideas.repec.org/a/spr/jcsosc/v8y2025i3d10.1007_s42001-025-00409-4.html)
  - The UK Office for National Statistics (ONS) calls GDELT experimental, with unclear quality assurance — [ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/methodologies/globaldatabaseofeventslanguageandtonegdeltdataqualitynote)
  - Low-confidence source: a protest-data audit found only about 21% of valid protest URLs described true protests — [tagteam/Harvard feed](https://tagteam.harvard.edu/hub_feeds/2011/feed_items/359354)

#### Free news APIs
- **Finnhub:**
  - The official pricing page lists the free plan at **60 API calls/minute** — [Finnhub pricing](https://finnhub.io/pricing)
  - Free endpoints include `/company-news?symbol=` and `/news?category=general` — [Jentic Finnhub](https://jentic.com/apis/finnhub.io/finnhub.md); [MCP Finnhub README](https://glama.ai/mcp/servers/@NimbleBrainInc/mcp-finnhub/tree)
  - Third-party sources report that company news covers about 1 year, that the economic calendar requires **premium** access, and that the free key is for personal, non-commercial use — [QVeris comparison](https://qveris.ai/guides/financial-news-api-for-ai-agents?lang=en)
- **Marketaux:** a free plan of about 100 requests/day with entity (ticker) tagging and sentiment; the FAQ says no payment details are needed — [Marketaux FAQ](https://www.marketaux.com/faq); [FreeAPIHub](https://freeapihub.com/apis/marketaux)
- **NewsAPI.org Developer (free):** about 100 requests/day, with articles delayed about 24 hours (one source says 12), reportedly for development or testing only and not staging or production. These are secondary sources — [API Cost Calc](https://apicostcalc.com/newsapi.html); [Thunderbit comparison](https://thunderbit.com/cs/blog/best-news-apis-compared)
- **GNews free:** 100 requests/day, up to 10 articles per request, at most 1 request/second, non-commercial or development use; delay reported at 12 hours, with one source saying 30 minutes — [GNews](https://gnews.io); [cloro.dev](https://cloro.dev/blog/news-api-free/)
- **SEC EDGAR:**
  - The Latest Filings RSS can be filtered by form type, e.g., 8-K — [SEC RSS](https://www.sec.gov/about/secrss.shtml)
  - Structured-disclosure RSS feeds update every 10 minutes, Mon–Fri 6am–10pm Eastern — [SEC structured RSS](https://www.sec.gov/structureddata/rss-feeds)
  - The fair-access limit is ≤10 requests/second per user — [SEC developer](https://www.sec.gov/developer)
  - No official refresh interval was found for the general 8-K feed.

#### Calendars, market-implied probabilities, risk indices
- **FRED API:**
  - `/releases/dates` and `/release/dates` endpoints, with a key required.
  - Release dates are published by the data sources, and the endpoint can exclude future dates by default (verify the `include_release_dates_with_no_data` option).
  - FRED also keeps a web release calendar.
  - [FRED releases/dates](https://fred.stlouisfed.org/docs/api/fred/releases_dates.html); [FRED release/dates](https://fred.stlouisfed.org/docs/api/fred/release_dates.html); [FRED blog](https://fred.stlouisfed.org/blog/2023/11/mark-your-fred-data-release-calendar)
- **BLS 2026 schedule:**
  - Employment Situation for October 2026 on Fri Nov 6; October CPI on Tue Nov 10; November CPI on Dec 10.
  - BLS notes dates may change after an earlier lapse in government services.
  - [BLS 2026](https://www.bls.gov/schedule/2026/home.htm); [Nov list](https://www.bls.gov/schedule/2026/11_sched_list.htm); [Dec list](https://www.bls.gov/schedule/2026/12_sched_list.htm)
- **FOMC 2026 meetings** (third-party listing; verify on federalreserve.gov): Jan 27–28, Mar 17–18, Apr 28–29, Jun 16–17, Jul 28–29, Sep 15–16, Oct 27–28, Dec 8–9 — [fedratecalc](https://fedratecalc.com/fomc-meeting-schedule/)
- **Prediction markets:**
  - Kalshi's public market-data endpoints need no key (`api.elections.kalshi.com/trade-api/v2`), and prices on a 0–1 scale read as probabilities. Its WebSocket needs a key — [Kalshi docs](https://docs.kalshi.com/getting_started/quick_start_market_data)
  - Polymarket's CLOB and Data APIs are readable without authentication, at about 10 requests/second (verify) — [pm.wiki](https://pm.wiki/uk/learn/polymarket-api); [PredictionHunt](https://www.predictionhunt.com/blog/polymarket-api-complete-guide)
  - Third-party sources say Kalshi's terms restrict commercial redistribution.
- **Geopolitical Risk (GPR) index:**
  - The daily "Recent GPR" (10 newspapers, from 1985) is updated every Monday; the latest values are preliminary — [GPR](https://www.matteoiacoviello.com/gpr.htm)
  - Daily AI-GPR — [AI-GPR](https://www.matteoiacoviello.com/ai_gpr.html)

### Inferences
- **Automatic detection is not worth it as a trigger.** It conflicts with the on-request constraint, adds noise (GDELT is about 55% accurate), and the owner already names the event. **Do build request-time context fetchers**:
  - GDELT DOC timeline (volume and tone) for t0, attention level vs baseline, and decay;
  - Finnhub general and company news for theme tickers since t0 − 3 days;
  - EDGAR 8-Ks of theme constituents since t0 (direct-exposure disclosures);
  - Kalshi/Polymarket odds of the next policy step (scenario weights and "how much is priced");
  - BLS, Fed and FRED dates inside the horizon (for "what to watch");
  - daily GPR level vs history (size and base rate of geopolitical shocks).
- An optional on-request "suggested events" list (top stories overlapping theme tickers, or GPR spikes, computed when the owner opens the analysis box) is cheap and helps the owner pick events. Nothing needs to be scheduled.
- **Market-relevance filter:** require overlap with theme tickers or companies, or a large GDELT volume z-score, plus dedup and root-event filtering. Treat GDELT as attention and tone, not facts.
- **Source choice:**
  - Keep Finnhub as primary; the project's task log suggests a Finnhub adapter already exists.
  - Use Marketaux as an entity-tagged backup.
  - Skip NewsAPI free (dev-only, delayed).
  - GNews free fits only personal, non-commercial use and is delayed.
  - Prefer free official calendars (BLS, Fed, FRED) over Finnhub's premium calendar.

### Gaps
- Official NewsAPI and GNews terms and delays, the Marketaux per-request article cap, and the Finnhub calendar's premium status could not be verified on the vendors' own pages (fetching was blocked or JS-heavy). Re-check before building.
- No evaluation was found of GDELT volume or tone as a predictor of *sector/theme* returns, beyond the GPR literature.
- No official refresh interval was found for the general EDGAR "latest 8-K" feed.

## 5. Cost-aware design for $0.20–$1 per run (which steps need a strong model vs retrieval or plain computation)

### Takeaway
At current Anthropic list prices, the budget is comfortably met if retrieval, factor math, analogs, priced-in checks, validation and scoring are all done in code, and the LLM only does judgment.
- **Short pass:** one strong-model call over a cached evidence pack of about 25K tokens, roughly $0.10 (Sonnet 5.5) to $0.22 (Opus 5.5 at low/medium effort).
- **Full department:** about $0.80–0.90, made up of event→factor translation, 3 independent heterogeneous theme samples, a red team, a supervisor and Hebrew rendering.

The research says to spend the marginal dollar on independent samples, model heterogeneity and targeted reconciliation (AIA, Halawi, Schoenegger, Zhang et al.), not on multi-round debate.

### Cited Findings
- **List prices** (Anthropic first-party; per Anthropic's Claude API reference as bundled with Claude Code, cached 2026-10-06 — verify live):
  - Claude Opus 5.5: $4 input / $20 output per MTok; 5-minute cache writes $5; 1-hour cache writes $8; cache reads $0.20; batch $2 / $10.
  - Claude Sonnet 5.5: $2 / $10, cache reads $0.20.
  - Claude Haiku 5.5: $0.10 / $0.50 for prompts up to 100K tokens ($0.50 / $2.50 beyond).
  - Claude Fable 5.1: $10 / $50.
  - Web searches are $10 per 1,000 (figure from Anthropic's Managed Agents documentation; verify for the Messages API).
  - [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Caching:**
  - Prompt caching is a prefix match; the minimum cacheable prefix is 512–4096 tokens depending on model; the default TTL is 5 minutes, with a 1-hour option — [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  - Caches are model-scoped, so multi-model cascades forfeit cache reuse.
  - Anthropic advises measuring the most capable model at lower effort before building a multi-model cascade — [Anthropic cost optimization](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence)
- **Effort and thinking:**
  - Effort controls thinking depth and token spend. On Opus 5.5 the default effort is `medium` and thinking cannot be disabled — [Anthropic effort](https://platform.claude.com/docs/en/build-with-claude/effort)
  - Thinking is billed whether or not it is displayed — [Anthropic thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)
- **Batch processing** runs asynchronously at 50% cost — [Anthropic batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **Quality levers:**
  - Simple averaging is a strong baseline; the supervisor helps by resolving divergences — [AIA](https://arxiv.org/pdf/2511.07678)
  - Debate does not reliably beat self-consistency, while heterogeneity helps — [Zhang et al.](https://arxiv.org/abs/2502.08788)
  - Retrieval is essential — [Halawi et al.](https://arxiv.org/html/2402.18563v1)
  - The top model is about 68% on agentic finance tasks, so keep numerics in code — [Vals AI](https://www.vals.ai/benchmarks/fabv2-1)
  - Long-context, in-prompt evidence beat naive vector retrieval in FinanceBench (2023) — [Patronus](https://patronus.ai/announcements/patronus-ai-launches-financebench-the-industrys-first-benchmark-for-llm-performance-on-financial-questions)

### Inferences — cost arithmetic (estimates; measure with token counting in a dry run)
**Assumed evidence pack (about 25K tokens):**
- system prompt, rubric and JSON schema: about 4K
- event card: about 0.5K
- themes plus scan stats (about 8 themes × about 600 tokens): about 5K
- computed reaction, implied, analog and calendar tables: about 4K
- 10 dated news snippets: about 3–4K
- 6–8 RAG passages: about 5K
- prediction-market and GPR lines: <1K

**Short pass (target ≤ $0.20)**
| Step | Model | Tokens (in / out incl. thinking) | Est. cost |
|---|---|---|---|
| Intake + neutralize | Haiku 5.5 | 3K / 0.8K | ≈ $0.001 |
| Context, factor math, analogs, priced-in | code | — | $0 |
| Combined factor translation + theme calls + mini pre-mortem | Sonnet 5.5 | 25K / 6K | ≈ $0.05 + $0.06 = **$0.11** |
| (alt.) same on Opus 5.5, low/medium effort | Opus 5.5 | 25K / 6K | ≈ $0.10 + $0.12 = **$0.22** |
| Validator + Hebrew rendering | code + Haiku 5.5 | 6K / 4K | ≈ $0.003 |

**Full department (target ≤ $1)**
| Step | Model | Est. cost |
|---|---|---|
| Intake + neutralize | Haiku 5.5 | ≈ $0.001 |
| Event → factor translation + scenarios (writes the 25K-token pack to cache) | Opus 5.5 (effort high) | 25K × $5/M write ≈ $0.125 + 5K out × $20/M = $0.10 → **≈ $0.23** |
| Theme sample #1 (cache read) | Opus 5.5 | ≈ $0.005 read + 3K new in ≈ $0.012 + 6K out = $0.12 → **≈ $0.14** |
| Theme samples #2–#3 (heterogeneous; separate Sonnet cache) | Sonnet 5.5 | cache write ≈ $0.06 (assumes the 1.25× input rule; unconfirmed) + 2 × (6K out × $10/M = $0.06) → **≈ $0.19** |
| Red team / pre-mortem | Sonnet 5.5 | ≈ $0.005 read + 8K in $0.016 + 3K out $0.03 → **≈ $0.05** |
| Supervisor (+ up to 3 targeted web searches only on divergence) | Opus 5.5 | ≈ $0.005 + 20K new in $0.08 + 6K out $0.12 + searches $0.03 + result tokens ≈ $0.04 → **≈ $0.25–0.28** |
| Calibration map, validator, Hebrew rendering | code + Haiku 5.5 | ≈ $0.005 |
| **Total** | | **≈ $0.86–0.90** |

**Allocation principles**
- **Code (no LLM):** news, filings and market fetches; factor moves; implied impacts; priced-in ratios; analog stats; calendar lookups; RAG retrieval (embedding search); schema/number validation; calibration map; ledger scoring.
- **Cheap model (Haiku 5.5):** intake parsing, neutral rewrite, snippet dedup and summarization, JSON repair, possibly Hebrew rendering (test the quality first; otherwise let the supervisor write Hebrew directly).
- **Strong model (Opus 5.5):** event → factor translation, at least one theme sample, and the supervisor. These are the steps where causal judgment matters.
- **Mid model (Sonnet 5.5):** extra independent samples (heterogeneity) and the red team.
- Order the pack so the shared evidence is a stable cached prefix, with volatile per-step instructions after the cache breakpoint. All department calls run within the 5-minute TTL inside one GitHub Actions job.
- Set `effort` explicitly per step. Use low/medium for samples and red team; reserve high for translation and supervisor.
- Before committing to the cascade, A/B it against "Opus 5.5 alone at medium effort, K = 3", per Anthropic's guidance. One model means one cache namespace and may match the cascade's quality at similar cost.
- The Batch API's 50% discount suits only non-interactive work, such as re-running the factor-only baseline or bulk re-scoring explanations. It doesn't suit the on-request path.
- Cap web search with `max_uses` and restrict to high-quality domains (the AIA "high-quality news" pattern). Default to the pre-fetched pack.

### Gaps
- Real token counts depend on the number of themes, Hebrew tokenization (Hebrew may tokenize less efficiently than English; no source found) and thinking length. Measure them with a token-counting dry run.
- Prices to confirm: the cache-write price for Sonnet 5.5, the caching price for Haiku 5.5, and web-search pricing on the Messages API. Only Opus 5.5 write/read and Sonnet 5.5 read prices were confirmed.
- No public evidence quantifies the accuracy gain per extra dollar (K samples, supervisor) for this task type. AIA's Section 7 ablations, not retrieved, are the closest proxy.
- GitHub Actions runtime costs and limits were not researched.
