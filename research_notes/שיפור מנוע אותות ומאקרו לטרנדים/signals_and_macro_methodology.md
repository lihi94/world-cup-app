# Trend-intelligence scan: review of the statistical methodology (A: unusual moves, B: earnings and fundamentals, C: macro sensitivity)

_Evidence note: sources were found with web search. Most academic items were checked only at abstract or summary level, because the full texts are paywalled. The session network blocked direct page fetches for anderson-review.ucla.edu and eventstudytools.com, so details from those two sites come from search-result summaries. Numbers marked **own simulation** come from a Monte Carlo written for this review: Python, 20,000 to 40,000 paths per scenario, set up exactly like the scan (252-session estimation window ending 21 sessions before the last date; 5- and 21-day CARs; 104-week regressions). They are not published results._

---

## 1. Part A, stock-level unusual moves: estimation window and gap, market+sector model, σ√k versus forecast-error variance, fat tails and volatility clustering, calibration of |z| ≥ 2.5, robust tests, and the "expected by chance" line

### Takeaway
The structure is standard event-study practice: a market model plus a sector spread, a 252-session estimation window that ends 21 sessions before the test window, and CAR z-scores. The calibration is not. For single stocks, fat tails, volatility clustering and earnings days push the real false-flag rate of |z| ≥ 2.5 to roughly 1.5–3× the nominal 1.24%. The screen's "expected by chance" number is understated by the same factor: about 2.5–3.5 chance flags in a 45-stock run, not 1.1. The fixes:
- set α = 0 and use a σ that reacts to the current volatility regime;
- call a move "unusual" only at |z| ≥ 3, and show 2.5–3 as "notable";
- route flags from windows that contain an earnings date to Part B;
- calibrate the chance count on each stock's own last ~3 years.

### Cited Findings
- MacKinlay's survey says the usual choice, when feasible, is to use the period before the event window as the estimation window. — [MacKinlay 1997, "Event Studies in Economics and Finance" (PDF copy)](https://eclass.aueb.gr/modules/document/file.php/ODE289/%CE%91%CE%A1%CE%98%CE%A1%CE%91%20-%20%CE%94%CE%97%CE%9C%CE%9F%CE%A3%CE%99%CE%95%CE%A5%CE%A3%CE%95%CE%99%CE%A3/%CE%94%CE%99%CE%91%CE%9B%CE%95%CE%9E%CE%97%201%20-%202/EFFICIENT%20MARKET%20HYPOTHESIS%20MAC%20KINLAY%201997.pdf)
- The R `EventStudy` package documents the prediction-error SD of a market-model abnormal return as σ·√(1 + 1/m + (R_m,evt − mean R_m,est)² / SS_m), where m is the estimation-window length. It states that its OLS, AR and CAR formulas match MacKinlay. — [CRAN EventStudy, "Statistical Conventions and Formula Audit"](https://cran.r-universe.dev/EventStudy/doc/statistical-conventions.html)
- Brown & Warner (1985, JFE): daily data cause few problems for event studies of samples, and standard OLS market-model procedures are typically well-specified. However, individual securities' daily returns depart substantially from normality in a way monthly returns do not, and a rise in variance during the event period can cause too many rejections. — [Brown & Warner 1985 PDF](https://leeds-faculty.colorado.edu/bhagat/BrownWarner1985.pdf); [vLex summary](https://law-journals-books.vlex.com/vid/single-firm-event-studies-645707329)
- A course text notes that parametric tests behave well under non-normality once a sample holds at least about 5 securities. The averaging across firms is what rescues them, which does not help a single stock. — [Testing in Event Studies (course text)](https://mike-data-analysis.share.connect.posit.cloud/testing-in-event-studies.html)
- Gelbach, Helland & Klick (2013, American Law & Economics Review): standard inference is generally invalid in single-firm, single-event studies. In simulations on 2000–2007 CRSP data the standard approach did poorly on both Type I and Type II error. They propose the "SQ" test, which uses sample quantiles of the pre-event fitted excess returns and has correct asymptotic size. — [RAND listing](https://www.rand.org/pubs/external_publications/EP68377.html); [EconPapers](https://econpapers.repec.org/RePEc:oup:amlawe:v:15:y:2013:i:2:p:495-541); [Truth on the Market commentary](https://truthonthemarket.com/2009/11/11/gelbach-helland-and-klick-on-single-firm-single-event-studies/)
- Baker & Gelbach (2020, JLFA) use the SQ test because abnormal returns are considerably non-normal. — [Baker & Gelbach PDF](https://andrewcbaker.netlify.com/publication/baker_gelbach_jlfa/Baker_Gelbach_JLFA.pdf)
- The Corrado (1989, JFE) rank test is nonparametric and valid for skewed or leptokurtic returns. It was designed for single-day event returns; for multi-day windows, Campbell & Wasley (1993) cumulate ranks. Corrado & Zivney (1992) modified it for volatility changes around the event. — [EconPapers, Corrado 1989](https://econpapers.repec.org/RePEc:eee:jfinec:v:23:y:1989:i:2:p:385-395); [Ataullah, Song & Tippett, "A modified Corrado test"](https://oro.open.ac.uk/50863)
- Kolari & Pynnönen (2010, RFS): when event dates cluster, even low cross-correlation of abnormal returns causes serious over-rejection. Their adjusted BMP statistic handles cross-correlation and event-induced volatility, and it extends to multi-day CARs. — [SSRN abstract](https://papers.ssrn.com/abstract=1830364); [EconPapers](https://econpapers.repec.org/RePEc:oup:rfinst:v:23:y:2010:i:11:p:3996-4025)
  - A follow-up article cites their Table 2: an average cross-correlation of about 0.05 already biases tests toward material over-rejection. — [follow-up article (JRFM 15(4):149, mirror)](https://p.gyb.elementfx.com/1911-8074/15/4/149)
  - In the R implementation, the adjustment scales the statistic by the average pairwise correlation of standardized estimation-window residuals. — [R `EventStudy::KolariPynnonenTest`](https://rdrr.io/cran/EventStudy/man/KolariPynnonenTest.html)
- Welch (2022, Critical Finance Review) gets better market betas in two ways:
  - "slope winsorization": clip daily stock returns at −2× and +4× the contemporaneous market return;
  - exponential age decay of 2/252 per trading day, a half-life of about 90 trading days (~4 months).
  The parameters are fixed and not tuned per stock. — [NBER w26105](https://www.nber.org/papers/w26105); [CFR published PDF](https://cfr.ivo-welch.info/published/papers/welch2022simply.pdf)
- MSCI's USE4 model builds specific risk from daily stock-specific returns, with a Bayesian adjustment. Its "volatility regime adjustment" reduces under-prediction of risk when markets enter a higher-volatility regime, and over-prediction when they leave one. — [MSCI, Barra US Equity Model (USE4)](https://www.msci.com/documents/10199/242721/Barra_US_Equity_Model_USE4.pdf)

### Inferences
- **Own simulation: false-flag rate per test when nothing happened.** σ̂ is the SD of 252 residuals ending 21 sessions before the last date. The nominal rate is 2·(1−Φ(2.5)) = 1.24%.

| Residual process | 5d \|z\|≥2.5 | 21d \|z\|≥2.5 | 5d \|z\|≥3 | 21d \|z\|≥3 | σ = max(σ252, σ63), \|z\|≥2.5 (5d / 21d) | own-history quantiles, 3y (5d / 21d) | own-history quantiles, 1y (5d / 21d) |
|---|---|---|---|---|---|---|---|
| iid normal | 1.29% | 1.21% | 0.34% | 0.30% | 1.09 / 1.01% | 1.74 / 2.68% | 2.70 / 6.41% |
| iid Student-t(4) | 2.05% | 1.86% | 0.84% | 0.70% | 1.72 / 1.59% | 1.63 / 3.07% | 2.75 / 7.03% |
| GARCH(1,1) α=.06 β=.92, t(5) shocks | 2.88% | 2.72% | 1.50% | 1.34% | 2.17 / 1.91% | 2.00 / 3.24% | 3.36 / 7.57% |
| Same, plus 1 earnings day per 63 sessions at 4× σ | 3.98% | 3.71% | 2.38% | 1.98% | 2.94 / 2.38% | 2.40 / 4.14% | 4.03 / 8.54% |

  In the last row, 31% of 5-day flags and 55% of 21-day flags fell in windows that contain an earnings day. Such windows are only 8% and 34% of all windows.
- **What the table means for the screen:**
  - For 45 stocks, the current formula says 45 × 2 × 1.24% ≈ 1.1 chance flags. Realistic chance flags are about 2.5–3.5 per run.
  - At |z| ≥ 3, the rate is close to what |z| ≥ 2.5 promises: 1.3–1.5% per test in the GARCH case, so 45 × 2 × 1.42% ≈ 1.3 flags.
  - A regime-aware σ, max(σ252, σ63), helps but is not enough alone: 1.9–2.9% at 2.5.
- **The forecast-error term (σ√k versus the full formula) is second-order.** For a k-day CAR, estimating α and β inflates the variance by about (1 + k/L). That is +8% variance (+4% SD) for k=21, L=252, and about +1% SD for k=5. Include it, since it costs nothing, but it matters far less than tails and clustering.
- **The intercept (α) causes a real bias.** The market-model α̂ estimated on the prior year contains the stock's past idiosyncratic trend. Subtracting α̂·k penalizes momentum winners and flatters losers.
  - Example: a stock that beat its benchmark by +50% (log 0.405) in the estimation year has α̂ ≈ 0.16% per day. That subtracts about 3.4% from a 21-day CAR, roughly 0.4 z at 1.75% daily idiosyncratic volatility.
  - Recommendation: set α = 0 (adjust for market and sector through β only) or shrink α̂ toward 0. Risk-model "specific returns" likewise carry no stock-specific time-series intercept.
- **Is the "expected by chance" line fair?**
  - By linearity of expectation, the expected count Σp_i stays correct despite overlapping 5/21-day windows and cross-stock correlation. The real error is the per-test p, which the table shows is 1.5–3× too low.
  - Overlap and within-theme correlation make the count over-dispersed: zero on most days, clusters on news days. So "expected 1.1, observed 4" is weaker evidence than a Poisson comparison suggests (in the spirit of Kolari & Pynnönen).
  - Count each stock once (union of its windows), and treat same-day flags inside one theme as one theme event.
- **Best calibration: backtest the detector on each stock's own history.**
  - Run the exact rolling 252/21 detector daily over the last ~756 sessions to get a per-stock base rate p̂_i for the union of the 5/21-day flags.
  - Show "expected by chance ≈ Σp̂_i", with a 90% range taken from the historical distribution of daily flag counts.
  - This absorbs fat tails, clustering, earnings and cross-correlation without modelling any of them. It is cheap: 45 stocks × 756 small OLS fits per on-demand run.
- **Empirical quantiles (the SQ idea) are well-sized only for short windows with long history.** They work for 1-day or 5-day windows with at least 3 years of residuals.
  - For 21-day CARs, tail quantiles from the stock's own history at the 0.6% level are badly mis-sized: 6.4–8.5% with 1 year and 2.7–4.1% with 3 years. A year holds only about 12 independent 21-day windows, too few to estimate a 1-in-160 tail.
  - For 21 days, use parametric z with a conservative σ and |z| ≥ 3.
- **Robust tests, translated for a single stock and for themes:**
  - For one stock, Corrado's rank test reduces to the percentile of the event residual among all residuals. Present it as "largest 5-day residual move in N months."
  - The generalized sign test suits the theme level, for example "6 of 7 members had positive residuals versus a ~50% base rate."
- **Handle earnings days in the estimation window:**
  - Either drop ±1 day around past earnings from the estimation window, which gives a cleaner σ and β, or Welch-winsorize the window.
  - Then route flags whose window contains an earnings date to Part B, labelled "earnings-driven", and leave them out of the Part A chance count.
- **σ that reacts to the regime:** use σ_eff = max(σ_252 excluding earnings days, σ_63 most recent), or an EWMA with a half-life of about 63–90 sessions (Welch/USE4 spirit). Keep the higher threshold anyway, since σ alone does not fix the tails.
- **Caution on sector ETFs:** cap-weighted sector SPDRs can be dominated by a few megacaps. Regressing a megacap on an ETF it dominates partly regresses it on itself and shrinks its residual. For such names, consider equal-weight sector or narrower industry ETFs, or drop the sector term when the stock's ETF weight is large (check current holdings).

### Gaps
- MacKinlay's own wording on multifactor and industry models could not be checked here. The commonly quoted view is "limited gains except when sample firms share an industry." Nor could his 250-day estimation-window example be checked; read the PDF.
- No published calibration was found for single-stock 5- and 21-day CAR z-tests on 2024–2026 US large caps. The rates above come from simulation; the proposed backtest would measure the real ones.
- eventstudytools.com (exact test formulas) could not be fetched because the host was blocked.

---

## 2. Abnormal volume measures and thresholds, and the 52-week-high literature with how to present it

### Takeaway
"Mean of the last 5 ÷ median of the prior 50 ≥ 2" is a sensible heuristic, and the academic "high-volume" definition also uses a ~50-day window. But it has three problems:
- it is biased by scale (a mean set against the median of a skewed series);
- it is not adjusted for market-wide volume;
- its chance rate is unknown.

Switch to log volume (Campbell–Wasley style), subtract the market's or universe's own abnormal volume, and set thresholds as percentiles of the stock's own history. Present 52-week highs as a continuous "nearness" measure (George–Hwang) plus a "first new high in N weeks" event (Huddart–Lang–Yetman), not as a buy signal.

### Cited Findings
- Campbell & Wasley (1996, Review of Quantitative Finance and Accounting) compared parametric and nonparametric tests of abnormal daily volume on NYSE/ASE and NASDAQ samples. The nonparametric test was more powerful in both. — [IDEAS](https://ideas.repec.org/a/kap/rqfnac/v6y1996i3p309-26.html); [working paper](https://econwpa.ub.uni-muenchen.de/econ-wp/fin/papers/9610/9610002.html)
- The log-volume measure attributed to Campbell & Wasley is log(100 × shares traded ÷ shares outstanding + 0.000255). Abnormal volume is the event-day log volume minus the stock's mean log volume over the estimation period. This comes from a secondary description. — [eventstudytools volume event study](https://eventstudytools.com/volume-event-study)
- Gervais, Kaniel & Mingelgrin (2001, JF) classify stocks on the 50th day of each 50-day interval. A stock is "high volume" if its formation-day (or week) volume is in the top decile of the 50 daily volumes. Stocks with extremely high volume over a day or a week go on to positive excess returns, and low-volume stocks to negative ones. The authors' explanation is investor recognition, i.e. visibility. — [EconPapers](https://econpapers.repec.org/RePEc:bla:jfinan:v:56:y:2001:i:3:p:877-919); [Gervais page](https://sites.duke.edu/sgervais/?p=64); [Wharton working paper](https://rodneywhitecenter.wharton.upenn.edu/wp-content/uploads/2014/04/9901.pdf)
- The effect is not universal: a 2025 study finds the opposite, a low-volume return premium, in Korea. — [arXiv 2512.14134](https://arxiv.org/pdf/2512.14134v1)
- **Practitioner definitions of unusual volume:**
  - "Unusual volume" usually means relative volume (RVOL): current volume ÷ a trailing average over a stated window. Baselines vary, for example a 50-day average or the average at the same time of day. — [thetrading.tools](https://www.thetrading.tools/concepts/unusual-volume); [StockCharts ChartSchool: RVOL](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-volume-rvol)
  - MarketInOut's NYSE/Nasdaq "unusual volume" list requires at least 5× the 50-day average volume and excludes penny and illiquid stocks. — [MarketInOut](https://www.marketinout.com/stock-screener/unusual-volume)
- George & Hwang (2004, JF), using all CRSP stocks 1963–2001: nearness to the 52-week high (price ÷ 52-week high) predicts future returns better than past returns do. It works whether or not stocks had extreme past returns, and unlike other momentum it does not reverse in the long run. The authors attribute it to anchoring. — [George & Hwang PDF](https://www.bauer.uh.edu/tgeorge/papers/gh5-paper.pdf); [Quantpedia summary](https://quantpedia.com/Screener/Details/88)
- Huddart, Lang & Yetman (2009, Management Science): volume jumps in the week a price crosses its 52-week high or low and stays elevated for several weeks. The jump is larger the longer since the extreme was last reached, for smaller firms, and where individual-investor interest and valuation ambiguity are higher. — [EconPapers](https://econpapers.repec.org/RePEc:inm:ormnsc:v:55:y:2009:i:1:p:16-31); [SSRN copy](https://www.evidenceinvestor.com/wp-content/uploads/2022/10/SSRN-id353749.pdf)
  - A secondary summary reports next-week abnormal returns for the smallest-quartile stocks of about 5% after 52-week lows and about 0.6% after highs. These figures were not checked against the paper. — [CXO Advisory](https://www.cxoadvisory.com/technical-trading/trading-after-52-week-highs-and-lows/)
- Later work in JFQA finds that household investors intensify both the volume and the momentum-like returns at the 52-week high. — [JFQA, "Investor Behavior at the 52-Week High"](https://resolve.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/investor-behavior-at-the-52week-high/5D1C7CA21396521F3B41D91B06A25BE1)

### Inferences
- **Mean-versus-median bias.** Daily volume is right-skewed. For a log-normal series the mean exceeds the median by exp(σ²/2), about 5–20% for daily log-volume SDs of 0.3–0.6 (illustrative). So "mean₅ ÷ median₅₀ ≥ 2" is really about "≥ 1.7–1.9× like-for-like". Comparing geometric means of log volume on both sides removes this.
- **Suggested measure:**
  - AV₅ = mean of ln V over the last 5 sessions − mean of ln V over the prior 60 sessions.
  - z_vol = AV₅ ÷ (SD of the rolling 5-day-mean log volume over the past year).
  - Adjust for the market by subtracting the universe median AV₅, or SPY's. Otherwise market-wide days (index rebalances, quarterly expirations, macro shock weeks) flag every stock at once.
  - Flag at z_vol ≥ 2, or equivalently at the stock's own 95th percentile. That gives a 5% base rate per stock, so about 2 flags per 45-stock run by construction; say so on screen.
  - The readable translation "≥ 2× normal" is exp(0.69) on the log scale.
- **Context tags matter more than the exact threshold.** Tag earnings windows, 52-week crossings (which by themselves raise volume, per Huddart–Lang–Yetman) and index events.
  - Volume without a price residual (|z_CAR| < 1) means attention without news.
  - Volume together with a price residual corroborates the move, in line with Gervais–Kaniel–Mingelgrin's visibility story.
- Use only complete sessions; the existing partial-day guard already handles this.
- **How to present 52-week highs and lows:**
  - Show nearness as close ÷ 52-week high (0–100%), plus distance from the 52-week low.
  - Add an event: "new 52-week high/low, the first in at least N weeks". Older extremes draw a bigger volume response.
  - Avoid predictive language. George & Hwang's evidence is a cross-sectional ranking over 1963–2001, and a 30–60-stock universe is too small to rank on.

### Gaps
- No verified public definition of unusual-volume thresholds was found for Bloomberg, Koyfin or Nasdaq.
- No post-2010 evidence was found on how strong the 52-week-high effect or the high-volume premium is in US large caps.

---

## 3. Part B, earnings: scaling the analyst surprise and small denominators, revenue surprises, reaction windows, announcement return (EAR) versus SUE, the current evidence on PEAD, and what "beat and fell" reflects

### Takeaway
(A − E)/|E| is the practitioner "surprise %", and it is the weakest way to scale. It blows up when |E| is near zero, and it is not comparable across firms.
- **Surprise:** standardize against the firm's own history of surprises (SUE-style), add a version scaled by price, and floor the denominator.
- **Reaction window:** the 3-session window with explicit before-open/after-close timing is right. Judge the reaction against the stock's own earnings-day volatility, not normal-day σ.
- **"Beat and fell":** this is common. About 40% of announcements react against the sign of the surprise, usually because of guidance, revenue or margin detail, or expectations already in the price.
- **Drift since:** present it as description only. Whether PEAD still exists in large caps is contested: Martineau (2022) says it is gone, and papers from 2025–26 push back.

### Cited Findings
- Lerman, Livnat & Mendenhall (2007, FAJ): most SUE studies measure the surprise against a time-series forecast, deflated by price or by past earnings variability. — [CFA Institute, FAJ 2007](https://rpc.cfainstitute.org/research/financial-analysts-journal/2007/double-surprise-into-higher-future-returns)
- Livnat & Mendenhall (2006, JAR): drift is significantly larger when the surprise is defined from analyst forecasts and I/B/E/S actuals than from a time-series model on Compustat data. Restatements and special items do not explain the gap. — [EconPapers](https://econpapers.repec.org/RePEc:bla:joares:v:44:y:2006:i:1:p:177-205)
- Cheong & Thomas (2011, JAR): analysts' EPS forecast errors and their dispersion do not grow with firm scale or share price. The authors attribute this to managers smoothing EPS; sales and cash flows show no such pattern. — [EconPapers 2011](https://econpapers.repec.org/RePEc:bla:joares:v:49:y:2011:i:2:p:359-401)
- Cheong & Thomas (2018, Management Science): unmanaged errors would be larger for high-price firms, but managers compress them toward the size seen at low-price firms. — [EconPapers 2018](https://econpapers.repec.org/RePEc:inm:ormnsc:v:64:y:2018:i:9:p:4277-4301)
- **Revenue surprises:**
  - Jegadeesh & Livnat (2006): the announcement-day price reaction is significantly related to both current and past revenue surprises, and firms with large revenue surprises show abnormal returns after the announcement. — [NYU working paper](https://pages.stern.nyu.edu/~jlivnat/JAE%20submission.pdf)
  - In the FAJ 2006 version, drift is stronger when the revenue and earnings surprises have the same sign. — [FAJ 2006](https://rpc.cfainstitute.org/research/financial-analysts-journal/2006/post-earnings-announcement-drift-the-role-of-revenue-surprises)
  - Chiu & Haight: gross-profit surprises largely absorb the predictive power of revenue surprises. — [LMU PDF](https://cba.lmu.edu/media/lmucollegeofbusinessadministration/undergrad/Gross%20Profit%20Surprises.pdf)
- **Announcement return (EAR) versus SUE:**
  - Brandt, Kishore, Santa-Clara & Venkatachalam (2008, working paper "Earnings Announcements Are Full of Surprises") study drift in portfolios formed on the price reaction around announcements (EAR). — [Quantpedia PEAD entry](https://quantpedia.com/strategies/post-earnings-announcement-effect/)
  - Novy-Marx (2015): earnings surprises, measured both by SUE and by the 3-day announcement CAR, largely absorb the power of price momentum. — [NBER w20984](https://www.nber.org/papers/w20984)
- **Timing of the reaction:**
  - More than 40% of earnings announcements come after hours. For these, the volume and price reaction appears one trading day after the date in Compustat or I/B/E/S. — [University of Auckland study](https://researchspace.auckland.ac.nz/handle/2292/9833)
  - About 48% of after-hours announcements are made before the open. These are followed by elevated abnormal volatility for at least 4 trading days. — [Lyle 2018, Columbia](https://business.columbia.edu/sites/default/files-efs/imce-uploads/LYLE%20LRSY_April_18_2018.pdf)
  - Prices settle faster after post-close releases than after pre-open ones. — [Kellogg Insight](https://insight.kellogg.northwestern.edu/article/traders-are-surprisingly-slow-to-respond-to-off-hours-earnings-announcements)
  - The stock jumps in more than 90% of after-hours sessions that contain an earnings release (Christensen, Timmermann & Veliyev, JFE, as cited). — [arXiv 2601.08962](https://arxiv.org/pdf/2601.08962)
- **Current evidence on PEAD:**
  - Martineau (2022, Critical Finance Review): drift began disappearing from non-microcap stocks in 2001 and was gone by 2006. It has only recently disappeared for microcaps (the working paper says since about 2016). — [Now Publishers](https://nowpublishers.com/article/Details/CFR-0122); [CFR PDF](https://cfr.ivo-welch.info/published/papers/martineau2021rest.pdf)
  - Push-back, per a UCLA Anderson brief: Dickerson, Julliard & Mueller ("The Co-Pricing Factor Zoo", JFE, in press) conclude that earnings drift remains a major priced factor. Subrahmanyam (2025, SSRN 5930255) argues that the disagreement reflects research-design choices. — [UCLA Anderson Review brief](https://anderson-review.ucla.edu/is-post-earnings-announcement-drift-a-thing-again)
  - Da, Wang & Zeng (working paper, March 2026): PEAD earned 4.1% a year under Democratic presidencies versus 14.9% a year under Republican ones, which they link to tax-related variation in earnings. — [Presidential Cycles in PEAD](https://accounting.wharton.upenn.edu/wp-content/uploads/2026/04/Presidential_PEAD-Mar-2026.pdf)
- **What "beat and fell" reflects:**
  - Johnson & Zhao (2012): in about 40% of more than 230,000 quarterly announcements, the price reacted opposite to the sign of the surprise. These "contrarian" cases show little drift afterwards. — [University of Iowa record](https://iro.uiowa.edu/esploro/outputs/journalArticle/Contrarian-Share-Price-Reactions-to-Earnings/9984962552002771)
  - The price penalty for guiding earnings down is larger than the premium for meeting or beating forecasts (Rees & Twedt, as indexed). — [IDEAS](https://ideas.repec.org/a/taf/acctbr/v41y2011i2p95-118.html)
  - Retail investors trade against surprises (sell after positive, buy after negative), which contributes to drift. — [NBER w34086](https://www.nber.org/papers/w34086)

### Inferences
- **Surprise: compute three numbers and flag on the robust one.**
  1. **Own-history standardized surprise (SUE_hist):** SUE_hist = (A − E) ÷ SD of the firm's last 8–12 quarterly surprises in cents. It has no scale problem.
     - "Big beat/miss" when |SUE_hist| ≥ 2.
     - "Beat" when SUE_hist ≥ +1, or when the surprise is above the firm's own median surprise. Habitual small beats are normal for managed EPS (see Cheong & Thomas).
  2. **Surprise in basis points of price:** (A − E) ÷ P × 10⁴, for comparing stocks (the academic convention).
  3. **(A − E)/|E| for display only.** Show cents instead when |E| < $0.10 or |E| < 0.25% of price. Never flag "big" from it when E is near zero or negative.
- **Persist every scan's actual and estimate in the database.** That builds the 8–12 quarter history, since the history depth of Finnhub's free tier is unverified (see Gaps).
- **Judge the reaction against earnings-day volatility.** Earnings-day variance is a multiple of normal-day variance, so z ≤ −2 against normal-day σ will flag many ordinary reports.
  - Use z_earn = CAR[0,+2] ÷ RMS of the stock's last 8–12 earnings CAR[0,+2].
  - Until that history exists, fall back to the non-event σ√3 with a cut of |z| ≥ 3.
  - "Fell" means z_earn ≤ −1, roughly the bottom 16% of the stock's own reactions; or show the percentile directly.
- **Timing logic.** Keep the current rule: a before-open report makes the same session day 0, an after-close report makes the next session day 0.
  - If the hour field is missing or ambiguous, widen the window to [−1, +2] around the stated date.
  - Start "drift since" at day +3 so it does not overlap the reaction window.
- **"Beat and fell" should show context, not a verdict:**
  - sign of the revenue surprise (Jegadeesh–Livnat);
  - direction of guidance, from news or the transcript;
  - pre-announcement run-up CAR[−20, −1] ("already priced in");
  - margin versus a year earlier;
  - the EAR itself, treated as the market's own surprise measure.

  When SUE and EAR agree in sign, label it "confirmed". When they disagree, label it "contrarian", with the note "about 40% base rate; little drift historically".
- **"Drift since" is description only.** For a large-cap universe, Martineau implies no reliable continuation. Mark it "contested", citing Dickerson–Julliard–Mueller and Da et al., and avoid predictive wording.

### Gaps
- Not verified here: how many past quarters of EPS surprises the Finnhub free tier returns, whether revenue estimates and actuals are free, and how reliable its before/after-market "hour" field is.
- Typical S&P 500 beat rates and average surprise sizes (e.g., FactSet Earnings Insight) were not retrieved. They would anchor the "habitual beat" baseline.
- The full Brandt et al. comparison of EAR and SUE drift, and the full Rees & Twedt citation, were not retrieved.
- The UCLA Anderson page could not be fetched (blocked host). Details on Dickerson–Julliard–Mueller and Subrahmanyam come from search summaries only.

---

## 4. Fundamental momentum and acceleration, margin expansion as a signal, and the pitfalls of comparing quarterly YoY with TTM YoY

### Takeaway
Fundamental momentum (earnings surprises and earnings acceleration) is among the better-documented return predictors, so "acceleration" is a sound concept. The current rule, "quarterly YoY − TTM YoY ≥ 5pp", has three weaknesses:
- it is a damped measure of acceleration, roughly ¾ of the gap between this quarter's YoY growth and the average of the prior three quarters;
- it is prone to base effects and M&A distortions;
- the fixed 5pp ignores how fast the company is growing and how noisy its revenue is.

Comparing margin with its 5-year average describes a level, not momentum. Profitability mean-reverts at about 38% a year, so a margin "well above average" tends to fall back.

### Cited Findings
- He & Narayanamoorthy (2020, JAE): earnings acceleration, the quarter-over-quarter change in earnings growth, has significant explanatory power for future excess returns. The predictability comes from investors missing what acceleration implies for earnings growth two to three quarters ahead. It is robust to PEAD and time-series momentum. — [IDEAS](https://ideas.repec.org/a/eee/jaecon/v69y2020i1s0165410119300333.html); [SSRN](https://papers.ssrn.com/abstract=3057632)
  - A secondary summary gives the sample as 1972–2015 and the top-minus-bottom-decile market-adjusted returns as 1.8% over one month and 3.4% over one quarter. — [ETF.com (Swedroe)](https://www.etf.com/sections/index-investor-corner/swedroe-momentum-rooted-earnings)
- Novy-Marx (2015): earnings momentum (SUE and CAR3) largely subsumes price momentum. Controlling for past performance in earnings-momentum strategies lowers their volatility and removes their crashes. — [NBER w20984](https://www.nber.org/papers/w20984); [EconPapers](https://econpapers.repec.org/RePEc:nbr:nberwo:20984)
- Soliman (2008, The Accounting Review): the DuPont components, profit margin and asset turnover, carry different information. Investors and analysts use them, but incompletely, which leaves predictable forecast errors and future abnormal returns. Changes in asset turnover are positively related to future changes in earnings. — [DOI 10.2308/accr.2008.83.3.823](https://www.sciencegate.app/document/10.2308/accr.2008.83.3.823)
- Fama & French (2000, Journal of Business): profitability mean-reverts at about 38% a year. Reversion is faster when profitability is below its mean and when it is further from the mean in either direction, which makes earnings changes predictable. — [IDEAS](https://ideas.repec.org/a/ucp/jnlbus/v73y2000i2p161-75.html); [CXO summary](https://www.cxoadvisory.com/fundamental-valuation/classic-research-mean-reversion-in-corporate-profitability/)
- Chiu & Haight: surprises in gross profit carry most of the information in revenue surprises. This suggests gross margin is an informative line to watch. — [LMU PDF](https://cba.lmu.edu/media/lmucollegeofbusinessadministration/undergrad/Gross%20Profit%20Surprises.pdf)

### Inferences
- **What "qYoY − TTM YoY" actually measures (algebra).** TTM YoY growth is the base-weighted average of the last four quarterly YoY rates. When year-ago quarters are of similar size:
  - qYoY − TTM YoY ≈ ¾·(g_q − mean(g_{q−1}, g_{q−2}, g_{q−3})).
  - Numerical check: quarterly YoY rates of 10, 12, 14 and 30% give a TTM of 16.5%, a difference of 13.5pp, and 0.75 × 18pp = 13.5pp.
  - So the 5pp rule really demands about 6.7pp of acceleration versus the prior three-quarter average, and one spike quarter can trigger it.
- **Pitfalls:**
  1. **Base effects:** a weak year-ago quarter (an easy comparison) looks like acceleration. Check 2-year stacked growth, (1 + g_q)(1 + g_{q−4}) − 1, or compare with g_{q−1}.
  2. **Accounting events:** M&A and divestitures, FX, 53-week fiscal years and fiscal-calendar shifts.
  3. **Growth level:** 5pp means something very different at 4% growth than at 60% growth.
  4. **Vendor TTM lag:** vendor TTM figures can trail the latest quarter.
- **Recommended acceleration rule (by analogy with He–Narayanamoorthy, applied to revenue):**
  - Use Δg = g_q − g_{q−1}, where both are YoY rates.
  - Flag "accelerating" if either:
    - Δg ≥ max(3pp, 0.25·|g_{q−1}|) for two quarters in a row; or
    - Δg ≥ max(5pp, 0.5·|g_{q−1}|) in a single quarter, with 2-year stacked growth also rising.
  - Show an 8-quarter sparkline of YoY growth, not only a badge.
- **Recommended margin rule:**
  - Replace "TTM versus 5-year average ±3pp" with the YoY change in TTM operating margin, standardized by the stock's own SD of that change over 5 years. Flag at |z| ≥ 1.5.
  - Keep the 5-year comparison as context only, with a note: "margin 4pp above its 5-year average; historically such gaps narrow" (Fama–French).
  - Watch for one-offs such as impairments and restructuring, which distort GAAP operating margin. Also show gross margin (Chiu–Haight) and the trend in asset turnover (Soliman).

### Gaps
- No direct academic test was found of revenue acceleration (as opposed to earnings acceleration), or of "margin versus its 5-year average" as a return signal. The recommendations here are by analogy.
- Finnhub's field definitions were not verified, e.g. whether its TTM-YoY and quarterly-YoY growth fields use the same fiscal calendar.

---

## 5. Part C, multiple testing across ~60–100 correlated theme × factor tests: BH, BY or Holm; Harvey–Liu–Zhu's "t > 3"; the value of the split-half filter; whether to show "moderate" links; and how to state expected false discoveries

### Takeaway
With about 60 tests at |t| ≥ 2, roughly 3 links are expected from chance alone. The first run's 3 "moderate" links are therefore indistinguishable from noise. Its one "strong" link, the bitcoin theme against BTC, is true by definition: a sanity check, not a discovery.

For m = 60–100 tests, every standard multiplicity rule lands near Harvey–Liu–Zhu's "t > 3":
- Holm: |z| ≥ 3.3–3.5;
- BH at q = 0.10: |z| ≥ 3.1–3.3 for the first discovery;
- BY: |z| ≥ 3.6–3.7.

The split-half filter is not a multiplicity correction. Under a clean null it removes only about 10% of false hits at |t| ≥ 3. Its real value is catching links driven by one episode, and it wrongly suppresses newly emerging links. Hide or fade "moderate" links, and state the expected false count explicitly.

### Cited Findings
- Harvey, Liu & Zhu (2016, RFS): because of extensive data mining, a new factor needs t > 3.0. Most claimed findings in financial economics are likely false. Their multiple-testing framework allows for correlated tests. — [NBER w20592](https://www.nber.org/papers/w20592); [EconPapers](https://econpapers.repec.org/RePEc:oup:rfinst:v:29:y:2016:i:1:p:5-68.)
- Contested by Jensen, Kelly & Pedersen (2023, JF): with a Bayesian model and a new dataset of 153 factors in 93 countries, most factors replicate, survive joint modelling and hold up out of sample. — [NBER w28432](https://www.nber.org/papers/w28432); [JF publisher version (CBS)](https://research-api.cbs.dk/ws/portalfiles/portal/95651880/theis_ingerslev_jensen_et_al_is_there_a_replication_crisis_in_finance_publishersversion.pdf)
- Benjamini & Yekutieli (2001, Annals of Statistics):
  - BH still controls the false discovery rate under positive regression dependency (PRDS), for example multivariate-normal test statistics with positive correlations.
  - Under arbitrary dependence, replace α with α / Σ_{i=1}^{m} 1/i.

  — [Project Euclid](https://projecteuclid.org/euclid.aos/1013699998)
- Romano & Wolf (2005, Econometrica): a bootstrap stepdown procedure that captures the joint dependence of the test statistics. It controls the familywise error rate asymptotically, with more power to detect true effects. — [Romano & Wolf (PDF, University of Zurich)](https://uzh.ch/cmsssl/econ/dam/jcr:ffffffff-935a-b0d6-ffff-ffffa286d4d1/etca.pdf)
- Venn (Two Sigma) uses a Lasso regression to pick a parsimonious subset of factors for each portfolio "to guard against false positives". — [Two Sigma factor selection methodology](https://help.venn.twosigma.com/metrics/two-sigma-factor-selection-methodology)

### Inferences
- **Own simulation: split-half filter and chance counts.**
  - Setup: T = 104 weekly observations, t(5) errors, a factor correlated 0.3 with SPY.
  - Definitions: "strong" = |t| ≥ 3, the same sign in both halves, and |t| ≥ 1 in each half. "Moderate" = |t| ≥ 2 and the same sign in both halves.
  - **Under the null:**
    - P(strong) = 0.29% and P(moderate) = 4.6%.
    - For 60 tests: E[strong] = 0.20, E[moderate] = 2.55, E[either] = 2.76.
    - P(at least 3 links by chance) ≈ 52% if the tests were independent.
  - **Share of |t| ≥ 3 hits that pass the split-half filter:**

    | Scenario | Pass rate |
    |---|---|
    | Clean null | 90% (the filter barely filters) |
    | Null plus one week with a joint 6-SD move in theme and factor (here P(\|t\| ≥ 3) itself jumps to 43%) | 30% (the filter catches most; still 13% "strong" and 33% "moderate" of such cases) |
    | True, stable beta (power ≈ 48% at \|t\| ≥ 3) | 95.5% |
    | Beta present only in the second half (an emerging link) | 50% (the filter wrongly drops half) |

- **Cut-offs implied by each rule** (normal approximation; df ≈ 100 adds about 0.05):

  | Rule | m = 60: p | m = 60: \|z\| | m = 100: \|z\| |
  |---|---|---|---|
  | Holm/Bonferroni first step (FWER 5%) | ≤ 0.00083 | ≥ 3.34 | ≥ 3.48 |
  | BH, q = 0.10 (k-th of k discoveries needs p ≤ 0.10·k/m) | ≤ 0.00167 | ≥ 3.14 | ≥ 3.29 |
  | BY, q = 0.10 (c = 4.68 at m = 60; 5.19 at m = 100) | ≤ 0.00036 | ≥ 3.57 | ≥ 3.73 |

  All of these sit close to Harvey–Liu–Zhu's "t > 3" for this many tests.
- **Recommended procedure:**
  1. Compute p-values from HAC/small-sample inference (section 6).
  2. Apply BH at q = 0.10 across all theme × factor tests in a run, and display q-values. Positive dependence is plausible, since themes share the market and factors co-move. Fall back to BY if many factor pairs are negatively correlated (e.g., dollar versus gold).
  3. Exclude definitional pairs (bitcoin theme versus BTC; a China-internet theme versus KWEB) from the multiplicity count, and show them as "calibration checks".
  4. Show only links that pass BH as findings, and put the rest in a faded, collapsed list. Venn likewise fades insignificant factors.
- **Example header:** "60 theme–factor pairs tested. At |t| ≥ 2, about 3 would appear by chance alone. Shown: links with a false discovery rate of 10% or less, meaning on average at most 1 in 10 of them is a false lead."
- **A placebo run beats analytic counts.** Shift each factor's weekly series in a circle by a random offset of at least 8 weeks, recompute every t-statistic, and repeat about 200 times.
  - The shift keeps each series' autocorrelation and the correlations among factors, but breaks their alignment with the themes.
  - The result gives an empirical "expected count at |t| ≥ 2 or ≥ 3" and a distribution of the maximum |t| (Romano–Wolf in spirit).
- **Use stability as a label, not a gate.** Report a formal interaction test (second-half β − first-half β, with a HAC t) or the split-half signs. Add an "emerging" label for links that are significant only in the last 52 weeks. Under Jensen–Kelly–Pedersen's Bayesian view, display effect sizes with 90% confidence intervals, or shrink them (e.g., multiply by max(0, 1 − 1/t²)), rather than as point estimates.

### Gaps
- No study was found that evaluates split-half stability filters as a multiple-testing device. The assessment above rests on the simulation.
- Whether theme × factor t-statistics satisfy PRDS is not established, given mixed-sign factor correlations.

---

## 6. Inference with 104 weekly observations: HAC/Newey–West errors, outlier weeks, bootstrap, regime instability (e.g., the 2021–2022 stock–bond correlation flip), rolling or EWMA windows, and break tests

### Takeaway
With T = 104, the binding problems are outlier weeks and regime change, not autocorrelation. A single extreme week can produce t > 3: the simulation gave a 43% rate under a null with one joint 6-SD week. The remedies:
- HAC standard errors with small-sample critical values (fixed-b, or the EWC estimator);
- robust or winsorized regression, with leave-one-week-out diagnostics;
- an EWMA or 52-week estimate shown alongside the 104-week one.

Treat rate betas as dependent on the regime. The stock–bond correlation changed sign with the inflation regime in 2022.

### Cited Findings
- Lazarus, Lewis, Stock & Watson (2018, JBES):
  - If Newey–West is used, set the truncation lag to S = 1.3·T^{1/2} and use nonstandard fixed-b critical values.
  - Alternatively, use the equal-weighted cosine (EWC) estimator with ν = 0.4·T^{2/3} cosine terms and t_ν critical values.
  - The guidance assumes persistence no greater than an AR(1) with ρ = 0.7.

  — [LLSW 2018 PDF](https://scholar.harvard.edu/sites/scholar.harvard.edu/files/stock/files/lazarus_lewis_stock_watson_har_inference_recommendations_for_practice_jbes_2018.pdf)
- In their rejoinder, Newey–West with fixed-b has an edge when testing several restrictions at once, and EWC degrees of freedom can be capped at 20. — [LLSW rejoinder](https://discovery.ucl.ac.uk/10160487/1/LLSW_har_JBES_Rejoinder_v3.pdf)
- Venn applies a Newey–West adjustment to its factor t-statistics and fades factors with |t| < 1.96. — [Venn: understanding factor analysis output](https://help.venn.twosigma.com/en/articles/7136452-understanding-factor-analysis-output); [Venn: what is factor exposure](https://help.venn.twosigma.com/en/articles/1075640-what-is-factor-exposure-and-how-is-it-computed)
- Welch (2022): winsorizing relative to the market and decaying observations exponentially (half-life about 4 months for daily market betas) improve beta forecasts. — [Critical Finance Review](https://nowpublishers.com/article/Details/CFR-0108)
- **The stock–bond correlation depends on the regime:**
  - AQR decomposes it into growth and inflation shocks. Growth shocks move stocks and bonds in opposite directions, inflation shocks in the same direction, and inflation uncertainty is the swing factor. — [AQR Quick Take 2Q22](https://www.aqr.com/Insights/Quick-Takes/2Q22-QC); [Alpha Architect on AQR's "Changing Stock–Bond Correlation"](https://alphaarchitect.com/stock-bond-correlation/)
  - The US stock–bond correlation was about 0.35 in 1970–1999 and about −0.31 in 2000–2022. Baele & Van Holle find it positive in high-inflation regimes regardless of monetary-policy stance (as summarized by Swedroe). — [Evidence Investor (Swedroe)](https://www.evidenceinvestor.com/?p=21662)
  - The timing of the 2022 flip depends on the measure. On one account it was mostly negative in the first half of 2022; on 60-day rolling windows it turned decisively positive in 2022–23. — [IPE](https://www.ipe.com/comment/viewpoint-where-now-for-the-stock/bond-correlation/10060488.article); [Hrčak paper](https://hrcak.srce.hr/file/492482)
- MSCI's USE4 uses longer half-lives for correlations than for volatilities, keeping the covariance matrix well conditioned while letting risk respond quickly. It also applies a volatility-regime adjustment. — [MSCI USE4](https://www.msci.com/documents/10199/242721/Barra_US_Equity_Model_USE4.pdf)

### Inferences
- **Small-sample critical values at T = 104:**
  - Newey–West: lag S ≈ 13 (b = S/T ≈ 0.127) with fixed-b critical values. My unverified approximation from the Kiefer–Vogelsang polynomial puts the 5% value near 2.3 rather than 1.96.
  - EWC: ν = 0.4 × 104^{2/3} ≈ 8.85, so about 9 degrees of freedom.
  - The difference in tail probabilities:

    | \|t\| at least | Under t₉ (EWC) | Under t₁₀₁ |
    |---|---|---|
    | 2 | 7.7% | 4.8% |
    | 2.5 | 3.4% | 1.4% |
    | 3 | 1.5% | 0.34% |

  - So cut on p-values from the correct reference distribution, not on raw |t|.
  - Weekly-return autocorrelation is usually small, so heteroskedasticity-robust HC3 errors with t₁₀₁ are an acceptable simpler baseline. HAC is cheap insurance for level-like proxies such as VIX and spreads, whose weekly changes can be autocorrelated.
- **Outlier weeks:**
  1. Winsorize weekly theme excess returns and factor changes at ±3 robust SDs (MAD-based), or use Huber M-estimation.
  2. Run a jackknife: recompute t dropping each week in turn, and report "minimum |t| when one week is left out". Flag links whose significance hinges on one week; crisis weeks such as early April 2025 fall inside a 104-week window ending November 2026.
  3. Bootstrap the p-values with a moving-block bootstrap (blocks of 4 weeks) or a wild bootstrap.
- **Regime instability:**
  - Show the 104-week beta next to an EWMA beta (half-life 52 weeks), or next to a last-52-week beta. The cost is small: within 104 weeks, a 52-week half-life leaves an effective sample of about 90 weeks, and a 26-week half-life about 66.
  - Label "changed sign" when the two estimates differ significantly (interaction t ≥ 2).
  - Formal tests for an unknown break date (sup-F) have little power at T = 104; a rolling chart communicates better.
- **Rates in particular.** Express sensitivity to the real-yield component (DFII10) and the breakeven component (T10YIE) separately. Following AQR's decomposition, the sign of an equity–nominal-yield link depends on whether growth or inflation is moving yields.

### Gaps
- The exact fixed-b critical value for a Bartlett-kernel Newey–West test at b ≈ 0.13 was not retrieved; the ≈2.3 figure needs verification.
- No source was found on how often the macro betas of equity themes or industries change sign between 2-year windows.

---

## 7. Model specification: separate per-factor regressions versus one joint fit, collinearity, whether separately estimated betas can be summed for the "implied week", style and sector controls, and better free proxies

### Takeaway
Running ten separate regressions and adding up their betas is not valid. Each separate beta absorbs the effects of correlated factors, so the sum double-counts shared variance, and the "unexplained z" inherits that error. Instead:
- fit one joint model on the selected factors, after orthogonalizing them in a fixed hierarchy (Venn's approach);
- add style controls, so that growth or size exposure is not labelled "rates";
- switch to cleaner free proxies where available: FRED's T10YIE, DFII10, T10Y2Y and DTWEXBGS, and the high-yield OAS.

### Cited Findings
- Two Sigma's factor lens (used in Venn):
  - It has 18 factors, built from broad, liquid asset-class proxies.
  - Less liquid macro factors are residualized against more liquid ones; for example, the emerging-markets factor is stripped of equity, rates, credit and commodity effects.
  - Equity style factors are constructed to be market-neutral.
  - A Lasso step selects factors, then OLS produces the displayed betas.

  — [Venn factor interpretation guide](https://help.venn.twosigma.com/en/articles/7854937-venn-factor-interpretation-guide); [Two Sigma, "Introducing the Two Sigma Factor Lens"](https://www.twosigma.com/articles/introducing-the-two-sigma-factor-lens/); [Venn: orthogonal factors](https://www.venn.twosigma.com/vennsights/orthogonal-factors)
- In Two Sigma's own tests on five representative institutional portfolios, the lens explained more than 90% of total variation. — [Venn: holistic factors](https://www.venn.twosigma.com/insights/holistic-factors)
- **Ken French Data Library:**
  - The Fama/French 3 factors are available daily and weekly; momentum is listed as daily and monthly, with no weekly series confirmed.
  - Since the January 2025 release, US returns are built from the CRSP CIZ file format.
  - A description page showed weekly coverage only through March 31, 2026, so releases lag the present. — [Data library](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html); [F-F factors description](https://mba.tuck.dartmouth.edu/pages/faculty/Ken.French/Data_Library/f-f_factors.html)
  - A third-party package note says weekly frequency exists only for the 3-factor model. — [rdrr: JFE::getFrench.Factors](https://rdrr.io/cran/JFE/man/getFrench.Factors.html)
- **FRED series:**
  - T10YIE, the 10-year breakeven (10-year nominal yield minus 10-year TIPS yield), is daily. — [FRED T10YIE](https://fred.stlouisfed.org/graph/?g=B42S)
  - T10Y2Y, the 10-year minus 2-year constant-maturity spread, is daily. — [FRED graph with T10Y2Y](https://fred.stlouisfed.org/graph/?g=pQU2)
  - ICE BofA high-yield OAS (BAMLH0A0HYM2): starting April 2026, FRED carries only 3 years of observations. The full history from December 1996 is held by ICE. — [FRED series](https://fred.stlouisfed.org/series/BAMLH0A0HYM2); [eco3min](https://eco3min.fr/en/credit-spreads-recession-risk-dataset/)

### Inferences
- **Why summing separate betas fails (omitted-variable algebra).** In the separate regression of y on [1, SPY, f_j]:
  - b_j,sep = b_j + Σ_{k≠j} b_k · Cov(f̃_j, f̃_k) / Var(f̃_j), where f̃ is each factor after removing SPY.
  - Example: if a theme loads only on real yields, and ^TNX and TIP/IEF changes each correlate about 0.6 with real yields, then all three show up "significant", and the implied week counts the real-yield move three times.
  - The SPY coefficient c also differs across the ten regressions.
- **Recommended specification:**
  1. **Orthogonalize in a fixed order.** Rank factors by liquidity and importance, then residualize each weekly factor change on SPY and on all earlier factors (Gram–Schmidt):
     - SPY;
     - 10-year nominal yield change, or real yield (DFII10) plus breakeven (T10YIE);
     - broad dollar (DTWEXBGS);
     - WTI;
     - credit (change in HY OAS, or HYG/IEF);
     - gold;
     - copper;
     - VIX log change;
     - BTC;
     - KWEB.

     Per-factor tests on the orthogonalized factors are then additive.
  2. **Select, then refit jointly.** Select factors by BH on HAC p-values, then compute the implied week from one joint OLS over the selected factors. This is the analogue of Venn's Lasso-then-OLS.
  3. **Compute the unexplained z from the joint model:** z = (actual − implied) ÷ [σ_joint · √(1 + h)], where h is the leverage of this week's factor vector. Flag at |z| ≥ 2.5, roughly 1–2% per theme-week under fat tails, and state the chance count (number of themes × that rate).
- **Keep the joint model small.** With 104 weeks and at most 3 selected factors, plus SPY and an intercept, the joint model keeps about 98 degrees of freedom, which is fine. Do not fit all 10 factors jointly: the rates, dollar, TIP/IEF and credit proxies are collinear and would inflate variances. Report variance inflation factors, and drop TIP/IEF when T10YIE is available.
- **Style controls.** Add 2–3 market-neutral style spreads, which Yahoo provides up to the current day:
  - size: IWM − SPY;
  - value: IVE − IVW (or VTV − VUG);
  - momentum: MTUM − SPY;
  - or growth/tech: QQQ − SPY.

  Alternatively, use the Fama–French weekly factors for history and the ETF spreads for the most recent weeks. Report "macro beyond style" betas. Otherwise a theme of long-duration growth names shows a spurious "10-year yield" link that is really growth versus value.
- **Sector control (optional).** For themes concentrated in one sector, also report the beta beyond that sector's ETF, so that an energy theme's oil sensitivity is not presented as news.
- **Better proxies:**
  - Prefer FRED's DGS10, DFII10, T10YIE, T10Y2Y and DTWEXBGS over ^TNX, DX-Y.NYB and TIP/IEF. DXY is heavily euro-weighted, and TIP/IEF adds duration and convexity noise.
  - The change in HY OAS is a cleaner credit measure than HYG/IEF, which embeds equity beta and rate duration. FRED now holds only 3 years of it: enough for 104 weeks, not for long backtests. Keep HYG/IEF as the fallback.
  - Align everything to Friday-close weekly bars. Bitcoin trades 24/7, and FRED series are published with a lag, so line up the timestamps.
- **Effect display.** β × sd(factor) is good practice, close to Venn's. Add:
  - a 90% confidence interval;
  - the partial R², the share of theme variance the factor explains;
  - "this week's contribution" = β · Δf, with the contribution bars summing to the implied move.

### Gaps
- No public documentation was found on how MSCI's macro-factor products (as distinct from its fundamental Barra equity models) estimate equity macro sensitivities.
- The 2024–2026 weekly correlations among ^TNX, DXY, TIP/IEF and HYG/IEF were not measured here. The collinearity argument is structural; compute the variance inflation factors in-app.

---

## 8. How professional tools (Bloomberg, Koyfin, MSCI, Two Sigma Venn) define and present unusual movers and macro sensitivities

### Takeaway
Retail and professional screeners define "unusual" as a move measured in units of the stock's own recent volatility, without market adjustment:
- Barchart: price change ÷ the SD of the last 20 sessions;
- volume: multiples of relative volume, e.g., at least 5× the 50-day average.

Institutional risk models (MSCI) measure stock-specific returns against a forecast of specific risk that adjusts to the volatility regime. Factor-lens vendors (Venn) show macro exposures as betas from a Lasso-selected, orthogonalized multifactor model, with:
- Newey–West t-statistics;
- insignificant factors faded;
- a residual;
- contributions to risk and to return.

The app's design is already closer to the institutional approach than to the retail one. What it lacks is the institutional calibration: risk that adjusts to the regime, one joint orthogonalized model, and robust t-statistics.

### Cited Findings
- Barchart's "Price Surprises" ranks stocks by how many standard deviations they moved:
  - the latest change ÷ the SD of returns over the last 20 sessions (annualized historical volatility ÷ √252);
  - weekly and monthly versions divide by the 20-week or 20-month SD;
  - standardizing keeps naturally volatile stocks from always topping the list;
  - it calls a 2.47-SD move unusual and says a 3-SD move has roughly a 1% chance.

  — [Barchart Price Surprises](https://www.barchart.com/stocks/price-surprises)
- For volume, RVOL multiples and lists of names at least 5× their 50-day average are the norm (see section 2). — [MarketInOut](https://www.marketinout.com/stock-screener/unusual-volume); [StockCharts RVOL](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-volume-rvol)
- MSCI's USE4 uses daily specific returns, Bayesian-adjusted specific risk, a volatility-regime adjustment, and longer half-lives for correlations than for volatilities. — [MSCI USE4](https://www.msci.com/documents/10199/242721/Barra_US_Equity_Model_USE4.pdf)
- Venn:
  - betas come from Lasso followed by OLS, with Newey–West t-statistics, and factors with |t| < 1.96 are faded;
  - the residual covers alpha, missing factors and noise, and "not all residual is alpha";
  - presentations pair each factor's contribution to risk with its contribution to return.

  — [Venn: understanding factor analysis output](https://help.venn.twosigma.com/en/articles/7136452-understanding-factor-analysis-output); [Venn: five analyses for IC and board presentations](https://venn.twosigma.com/resources/five-venn-analyses)
- Koyfin: the search results did not surface its definitions of relative volume, "% off 52-week high" or surprise %. — [Koyfin data dictionary](https://www.koyfin.com/help/koyfin-data-dictionary/amp/)

### Inferences
- Barchart's "3 SD ≈ 1% chance" is not the Gaussian figure, which is 0.27% two-sided. In practice it acknowledges fat tails, and it matches the simulation (|z| ≥ 3 gives about 1.3–1.5% under GARCH with t shocks). It is a good wording model for the app: "a move this large happens about 1 in 70 windows for this stock" (backtest-based).
- For section C, adopt Venn's visual grammar:
  - links that pass BH drawn solid, others faded;
  - the residual's share of variance;
  - this week's contribution bars (β·Δf) summing to the implied move, with the gap labelled "theme's own news".
- For section A, adopt MSCI's idea: a σ that responds to the regime (EWMA or regime-adjusted), with z presented as "a stock-specific move in risk units".

### Gaps
- No public documentation was found for the exact definitions behind Bloomberg terminal functions (most-active or unusual-volume screens; macro sensitivities in PORT).
- Koyfin's formulas were not found.

---

## 9. Which specific changes, with parameter values, should be made, in priority order (synthesis)

### Takeaway
Ranked by effect on what the owner sees (fewer false alarms, honest "chance" statements), the top three changes are:
1. recalibrate the stock flags and their chance count;
2. replace summed separate betas with one joint, orthogonalized macro model using HAC p-values and FDR control;
3. standardize earnings surprises and reactions against each stock's own history.

All of these work with Yahoo, FRED and the Finnhub free tier, run on demand.

### Cited Findings
- Event-study calibration and single-stock inference. — [Gelbach, Helland & Klick 2013](https://econpapers.repec.org/RePEc:oup:amlawe:v:15:y:2013:i:2:p:495-541); [Brown & Warner 1985](https://leeds-faculty.colorado.edu/bhagat/BrownWarner1985.pdf); [Welch 2022](https://cfr.ivo-welch.info/published/papers/welch2022simply.pdf); [MSCI USE4](https://www.msci.com/documents/10199/242721/Barra_US_Equity_Model_USE4.pdf)
- Multiplicity and HAC. — [Harvey, Liu & Zhu 2016](https://www.nber.org/papers/w20592); [Benjamini & Yekutieli 2001](https://projecteuclid.org/euclid.aos/1013699998); [Lazarus, Lewis, Stock & Watson 2018](https://scholar.harvard.edu/sites/scholar.harvard.edu/files/stock/files/lazarus_lewis_stock_watson_har_inference_recommendations_for_practice_jbes_2018.pdf)
- Specification. — [Venn factor interpretation guide](https://help.venn.twosigma.com/en/articles/7854937-venn-factor-interpretation-guide)
- Earnings. — [Livnat & Mendenhall 2006](https://econpapers.repec.org/RePEc:bla:joares:v:44:y:2006:i:1:p:177-205); [Jegadeesh & Livnat 2006](https://rpc.cfainstitute.org/research/financial-analysts-journal/2006/post-earnings-announcement-drift-the-role-of-revenue-surprises); [Johnson & Zhao 2012](https://iro.uiowa.edu/esploro/outputs/journalArticle/Contrarian-Share-Price-Reactions-to-Earnings/9984962552002771); [Martineau 2022](https://nowpublishers.com/article/Details/CFR-0122)

### Inferences
1. **Part A, σ and threshold:**
   - set α = 0;
   - use σ_eff = max(σ_252 excluding earnings ±1 day, σ_63 most recent), or an EWMA with a half-life of 63–90 sessions;
   - multiply by √(1 + k/252) for the forecast-error term;
   - call a move "unusual" at |z| ≥ 3.0 and "notable" at 2.5–3.0;
   - send windows containing earnings to Part B.
2. **Part A, chance line:**
   - backtest each stock's base rate over 756 sessions, using the union of its windows;
   - show "expected ≈ Σp̂ (90% range a–b)";
   - count stocks, not windows, and merge same-day flags within a theme into one theme event.
3. **Part C, joint model:**
   - orthogonalize factors in the fixed hierarchy;
   - select with BH (q = 0.10) on HAC p-values: Newey–West with 13 lags and fixed-b critical values, or EWC with ν ≈ 9;
   - refit jointly for the implied week;
   - compute the unexplained z with the leverage correction and flag at |z| ≥ 2.5.
4. **Part C, presentation:**
   - drop "moderate" as a finding category;
   - show "m pairs tested; about 0.048·m expected by chance at |t| ≥ 2; shown: FDR ≤ 10%";
   - list definitional pairs as sanity checks;
   - add an "emerging (52-week)" label, a stability label from the interaction t, and a jackknife "depends on one week" warning.
5. **Part C, controls and proxies:**
   - add 2–3 style spreads (IWM−SPY, IVE−IVW, MTUM−SPY);
   - use FRED DFII10, T10YIE, T10Y2Y, DTWEXBGS and HY OAS (3-year limit), with ETF fallbacks;
   - winsorize weekly data at ±3 robust SDs;
   - show 104-week and EWMA (52-week half-life) betas side by side.
6. **Part B, surprise:**
   - use SUE_hist over 8–12 quarters (store the history in the database);
   - show the surprise in basis points of price;
   - suppress the % surprise when |E| < $0.10 or < 0.25% of price;
   - "beat" = SUE_hist ≥ 1; "big" = |SUE_hist| ≥ 2.
7. **Part B, reaction:**
   - z_earn against the RMS of the stock's own last 8–12 earnings CAR[0,+2];
   - "beat and fell" = SUE_hist ≥ 1 and z_earn ≤ −1;
   - a context panel with revenue surprise, guidance, run-up CAR[−20,−1] and EAR;
   - "drift since" from day +3, labelled descriptive and contested.
8. **Fundamentals:**
   - acceleration Δg = g_q − g_{q−1} (YoY rates), confirmed over two quarters or with a 2-year stacked check, with thresholds scaled by growth level;
   - margin flag on the YoY change in TTM margin with |z| ≥ 1.5 against the stock's own history;
   - the 5-year average shown as context, with a mean-reversion note.
9. **Volume and 52-week:**
   - market-adjusted log-volume z ≥ 2 (the stock's own 95th percentile), with context tags;
   - nearness % plus "first new 52-week high in N weeks".
10. **Self-calibration:** log every flag and its later outcome, to measure real hit rates and false-alarm rates over time.

### Gaps
- Every threshold above is a recommendation derived from the cited methods plus simulation. None has been validated on the owner's actual universe; the first step should be the 3-year backtest of each flag's base rate, using the scan's own Yahoo history.
