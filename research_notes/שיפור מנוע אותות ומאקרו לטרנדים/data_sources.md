# Free data sources for real US economic data and company fundamentals/earnings, and how to map economic releases onto investment themes (status as of 9 Nov 2026)

> **Research-method caveat for the report writer.** In this session, direct page fetches of `finnhub.io`, `fred.stlouisfed.org`, `www.bls.gov` and `www.sec.gov` failed because those hosts are not in the session's network allowlist. Facts attributed to those official pages come from search-engine extracts of them, cited by their URL. Everything else comes from third-party pages, which are flagged as secondary. Re-check any number the code depends on (rate limits, units, which tier an endpoint is in) against the live docs or a live response before relying on it. Free-tier rules change often, so dates are given wherever a source dated itself.

---

## 1. Free official US economic-data APIs: FRED/ALFRED, BLS v2, BEA, EIA, Treasury Fiscal Data, Federal Reserve Board (keys, limits, vintages, release calendars)

### Takeaway
FRED/ALFRED should be the backbone. It needs one free key and allows about 120 requests a minute. It provides real-time vintages, a machine-readable release calendar that includes future dates, and, since Nov 2025, a v2 bulk endpoint that returns a whole release. Go to the source agencies only for detail FRED lacks: BLS v2 for CPI and jobs components, BEA for NIPA detail, EIA v2 for power and energy, Treasury Fiscal Data for the TGA and debt, and the Fed Board DDP for bulk H.15 and G.17 data. Any 2025–26 analysis must handle the October 2025 hole left by the 1 Oct–12 Nov 2025 shutdown.

### Cited Findings
**FRED / ALFRED (St. Louis Fed)**
- The rate limit is about **120 requests per minute per API key**, and going over returns HTTP 429. This comes only from secondary sources — [cors.dev FRED guide](https://cors.dev/guides/fred-api), [APIs.io FRED rate limits](https://apis.io/rate-limits/fred/fred-rate-limits/). **Conflict:** a third-party FRED MCP server's docs list **40 req/min for series observations** ([FRED MCP Server docs](https://fred-mcp-server.amorelli.tech/api-reference/overview)). The official limit text could not be fetched.
- Calling the API from browser JavaScript fails on CORS. The v1 key goes in the query string (`api_key=`), and keyless `fredgraph.csv` downloads also exist — [cors.dev FRED guide](https://cors.dev/guides/fred-api). (Calls from GitHub Actions are server-side, so CORS does not apply.)
- **API v2 (launched Nov 2025):** account holders can "retrieve observations for all FRED series in any release in bulk and obtain the entire history in JSON or XML" — [St. Louis Fed research news, Nov 2025](https://news.research.stlouisfed.org/2025/11/fred-launches-new-version-of-api/). Example call: `https://api.stlouisfed.org/fred/v2/release/observations?release_id=18&format=json`, with the key sent in an HTTP header — [FRED User Guide (federalreserve.gov)](https://www.federalreserve.gov/data/ddp-fred-user-guide.htm). The header form is `Authorization: Bearer <key>` — [FRED v2 API-key doc](https://fred.stlouisfed.org/docs/api/fred/v2/api_key.html). Pagination uses `has_more` and `next_cursor` — [FRED v2 release_observations doc](https://fred.stlouisfed.org/docs/api/fred/v2/release_observations.html). Third-party wrappers spell these field names differently, so check the official page.
- **Vintages (ALFRED):** `series/observations` accepts `realtime_start`/`realtime_end` or `vintage_dates`. `output_type` takes four values: 1 = observations by real-time period (default), 2 = by vintage date, all observations, 3 = by vintage date, new and revised observations only, 4 = **initial release only** — [FRED series/observations doc](https://fred.stlouisfed.org/docs/api/fred/series_observations.html).
- **Release calendar:** `fred/releases/dates` with `include_release_dates_with_no_data=true` also returns future scheduled dates (the default `false` excludes them). The `release_last_updated` attribute shows whether data were actually updated. Release dates are "published by data sources and do not necessarily represent when data will be available on the FRED or ALFRED websites" — [fredr reference for releases/dates](https://sboysel.github.io/fredr/reference/fredr_releases_dates.html), [FRED releases/dates doc](https://fred.stlouisfed.org/docs/api/fred/releases_dates.html).

**BLS Public Data API**
- **v2 (registered):** 500 queries/day, 50 series/query, 20 years/query. **v1 (no key):** 25 queries/day, 25 series/query, 10 years/query. Both versions are limited to 50 requests per 10 seconds. The key arrives by email after registration, registration must be renewed at least once a year, and v1 request signatures still work on v2 — [BLS API FAQ](https://www.bls.gov/developers/api_faqs.htm). A third-party guide claims "2000/day registered" ([DatasetIQ](https://datasetiq.com/blog/api-access-economic-data-guide)), which contradicts BLS; trust BLS.
- **Shutdown data hole:** appropriations lapsed from Oct 1 to Nov 12, 2025. BLS issued **no October 2025 CPI release** and no all-items or core estimate for October 2025. Where possible, October values for some series were published with the November data. The November release omitted 1-month changes where October was missing. CPI tables show a dash for missing October 2025 values, 2025 annual averages are computed from the 11 published values, and there were no October 2025 Real Earnings — [BLS CPI shutdown-impact page](https://www.bls.gov/cpi/additional-resources/2025-federal-government-shutdown-impact-cpi.htm), [BLS CPI shutdown FAQ](https://www.bls.gov/cpi/additional-resources/2025-federal-government-shutdown-impact-cpi-faq.htm), [BLS revised release dates](https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm). November 2025 CPI came out on Dec 18, 2025 — [Bloomberg Government](https://news.bgov.com/capital-markets/bls-axes-us-october-cpi-report-sets-dec-18-for-november-data).

**BEA API**
- A UserID is required. Limits are **100 requests, 100 MB and 30 errors per minute** — [Univ. of Alabama Libraries Scholarly API Cookbook (BEA)](https://ua-libraries-research-data-services.github.io/UALIB_ScholarlyAPI_Cookbook/overview/bea.html). This is secondary; the length of any lockout after a breach was not confirmed.

**EIA API v2**
- A free key is required. A response holds at most **5,000 rows (JSON) or 300 (XML)**. Larger requests return as many rows as fit plus a "parameter out of range" warning; page with `offset` or narrow the request with facets or `start`/`end` — [EIA API v2.1.0 documentation (PDF)](https://www.eia.gov/opendata/documentation/APIv2.1.0.pdf), [EIA API technical documentation, PUDL mirror (Aug 2025)](https://docs.catalyst.coop/pudl/en/latest/_downloads/ec4214f82f7635515842cc17d7eb01dd/eiaapi_technical_documentation_2025-08-26.html).
- EIA publishes no hard throttle. Its guidance is to keep the sustained rate under about **9,000 requests/hour** and bursts under **5/second** to avoid throttling or a temporarily disabled key — [EIA Open Data FAQ](https://www.eia.gov/opendata/faqs.php). The key "must always appear in the URL; it will not be detected in the HTTP headers" (EIA docs, quoted via the secondary [OilPriceAPI EIA guide](https://www.oilpriceapi.com/eia-api)). The shared `DEMO_KEY` is heavily limited; one scraper observed `X-Ratelimit-Limit: 10` — [Apify EIA scraper notes](https://apify.com/crawlerbros/eia-scraper.md) (observation only).

**Treasury Fiscal Data (Bureau of the Fiscal Service)**
- No registration, key or authentication is needed. Base host is `api.fiscaldata.treasury.gov`; requests are GET only and return JSON by default, and adding `format=csv` returns CSV. Datasets include Debt to the Penny, average interest rates, exchange rates, and the Daily and Monthly Treasury Statements — secondary sources: [Orthogonal guide](https://orthogonal.info/treasury-fiscaldata-api-national-debt-json-no-key/), [usfiscaldata API basics](https://cdn.jsdelivr.net/npm/@saibolla/ada@0.1.3/skills/usfiscaldata/references/api-basics.md), [DEV Community](https://dev.to/0012303/us-treasury-api-track-the-national-debt-in-real-time-with-python-no-api-key-4kmd). The official docs were not reached.

**Federal Reserve Board – Data Download Program (DDP)**
- The DDP gives flexible access to Board-produced data as CSV or XML (SDMX). SDMX is described as the easiest way to get all of a release's data at once. No login requirement surfaced — [Fed DDP help](https://www.federalreserve.gov/datadownload/help/).

### Inferences
- Budget is not a constraint for occasional scans. Even at the worst-case 40 req/min, 100–150 FRED series per scan takes a few minutes; the v2 bulk endpoint cuts that to one call per release (plus cursor pages).
- **Use first-release data for any event study or "surprise" work.** Use ALFRED `output_type=4`, or `vintage_dates` set to the release day. Revised data would leak hindsight into release-day analysis.
- Build the release calendar from `fred/releases/dates` (with `include_release_dates_with_no_data=true`) and store `release_last_updated` to confirm that a release actually landed.
- Treat October 2025 CPI-family values as **missing (NaN)**, not interpolated, in MoM/YoY and event-study code. The Oct–Dec 2025 release calendar is also abnormal and should be excluded or flagged in event studies.
- Mask the EIA key in GitHub Actions logs, because it has to travel in the URL. Add a yearly reminder to renew the BLS key.

| Source | Key? | Practical limits | Best use for this site |
|---|---|---|---|
| FRED v1/v2 + ALFRED | free key (v2: Bearer header) | ~120/min (secondary; 40/min claimed for observations) | backbone: macro series, vintages, release calendar |
| BLS v2 | free key, renew yearly | 500 queries/day, 50 series, 20 yrs, 50 req/10 s | CPI/PPI/jobs components not on FRED |
| BEA | UserID | 100 req, 100 MB, 30 errors per minute | NIPA detail (e.g., investment categories) |
| EIA v2 | free key in URL | 5,000 rows/response; <9k/hr, <5/s guidance | electricity demand, nuclear, fuels (theme indicators) |
| Treasury Fiscal Data | none | not found | TGA/DTS, debt, interest costs (liquidity) |
| Fed DDP | none | n/a (file downloads) | bulk H.15 rates, G.17 industrial production, etc. |

### Gaps
- FRED's official terms of use were not retrieved. These cover third-party copyright on some series, attribution, and per-application keys; the page title appeared, but its text could not be read.
- The official FRED rate-limit text was not retrieved, so the 120 vs 40 req/min conflict is unresolved.
- BEA's lockout duration after limit breaches (believed to be 1 hour from prior knowledge) is **unverified**.
- No official Treasury Fiscal Data rate limits were found, and its official docs were not reached.
- Whether FRED v2 has per-call size or row caps is unknown.

---

## 2. Free activity and survey indicators: ISM status and substitutes, regional Fed surveys, CFNAI, WEI, GDPNow, NY Fed Staff Nowcast, Cleveland Fed inflation nowcast, OECD CLI

### Takeaway
ISM data have been **off FRED since 2016** and are licensed. The practical free substitute is the five regional Fed manufacturing surveys (NY, Philadelphia, Richmond, Kansas City, Dallas), all strongly correlated with the ISM. Add the Fed nowcasts: the Dallas Fed WEI weekly (now Dallas-only; the "NY Fed WEI" label is outdated), Atlanta Fed GDPNow, the NY Fed Staff Nowcast, and the Cleveland Fed's daily inflation nowcast. The status of the OECD CLI is contested, so test it live before using it.

### Cited Findings
- **ISM:** in June 2016 FRED announced that "all 22 series from the Manufacturing ISM Report on Business and the Non-Manufacturing ISM Report on Business will be deleted" — [FRED news, June 2016](https://fred.stlouisfed.org/news/2016/06/institute-for-supply-management-data-to-be-removed-from-fred). A TradingView script still references `FRED:NAPM`, but that is secondhand and does not show the series was restored — [TradingView script](https://de.tradingview.com/script/Uy07gGv5-ISM-Manufacturing-PMI).
- **Regional Fed surveys:**
  - Philadelphia's Manufacturing Business Outlook Survey (MBOS) started in 1968 and is the longest-running regional Fed manufacturing survey — [Philadelphia Fed MBOS FAQ](https://www.philadelphiafed.org/surveys-and-data/regional-economic-analysis/mbos-faqs).
  - A Richmond Fed analysis (Apr 2024) found that all Reserve Bank surveys correlate strongly with the ISM PMI. New York has the strongest correlation (**0.834**), then Richmond (**0.808**). Only Philadelphia's headline index improved forecasts of the ISM PMI against a baseline model, and per the extract no regional index significantly improved forecasts of industrial-production growth. Richmond uses a composite index and asks quantitative price questions — [Richmond Fed, Regional Matters (Apr 2024)](https://www.richmondfed.org/region_communities/regional_data_analysis/regional_matters/2024/rm_04_04_24_regional_surveys_national_conditions).
  - Secondary: the Empire State survey is the earliest regional release each month (around the 15th), with Philadelphia a few days later. Richmond and KC are composites built from components, while NY, Philadelphia and Dallas are diffusion indexes — [ConvexTrade glossary](https://convextrade.com/glossary/empire-state-index). **Conflict:** the same source family claims Richmond and KC track the ISM more closely, which contradicts the Richmond Fed's correlation ranking above.
  - Official 2026 release calendars: [Kansas City Fed 2026 release dates](https://www.kansascityfed.org/surveys/manufacturing-survey/manufacturing-survey-release-dates/), [Richmond Fed release schedule](https://www.richmondfed.org/region_communities/regional_data_analysis/business_surveys/manufacturing/release_schedule).
- **Weekly Economic Index (WEI):**
  - Since **December 2023** only the Dallas Fed publishes it; it was co-published with the NY Fed from April 2020. It is the first principal component of 10 daily and weekly series covering consumer activity, the labor market and production, scaled to four-quarter GDP growth.
  - It updates Thursdays at or shortly after 10:30 a.m. CT, using data available up to 8 a.m. CT.
  - Latest reading at the time of research: **3.47% for the week ended Oct 31, 2026** (13-week MA 3.03%, Nov 5, 2026 update) — [Dallas Fed WEI](https://www.dallasfed.org/research/wei), [About the WEI](https://www.dallasfed.org/research/wei/about).
  - WEI is also a FRED/ALFRED release (rid 465, "Weekly Economic Index (Lewis-Mertens-Stock)") — [ALFRED release dates](https://alfred.stlouisfed.org/release/downloaddates?rid=465).
- **Cleveland Fed inflation nowcasting:** daily nowcasts of PCE and CPI inflation, built from daily oil prices, weekly retail gasoline prices and monthly CPI/PCE — [Cleveland Fed Inflation Nowcasting](https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting). Ahead of the October 2026 CPI (due **Tue Nov 10, 2026**), the nowcast stood at **+0.24% headline and +0.21% core** m/m — [TheStreet Pro, week ahead](https://pro.thestreet.com/market-commentary/the-week-ahead-cpi-and-equity-flows-test-a-shaken-market) (secondary).
- **GDPNow and NY Fed Staff Nowcast:** GDPNow was **3.44%** as of Nov 4, 2026, and the NY Fed Staff Nowcast was **2.94%** (up from 2.90%) — same [TheStreet Pro note](https://pro.thestreet.com/market-commentary/the-week-ahead-cpi-and-equity-flows-test-a-shaken-market) (secondary). The NY Fed nowcast launched in April 2016 with Friday 11:15 a.m. releases; that schedule is from 2016 and the current cadence is unverified — [Liberty Street Economics, Apr 2016](https://libertystreeteconomics.newyorkfed.org/2016/04/just-released-introducing-the-frbny-nowcast).
- **OECD CLI:**
  - The OECD's SDMX API is free of charge, subject to the OECD Terms and Conditions — [OECD API explainer (Sep 2024)](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html).
  - **Conflict:** one site claims the OECD retired the CLI dataflow (the SDMX endpoint returns 404) and that the series is frozen at January 2024 — [ConvexTrade OECD CLI (US)](https://convextrade.com/metrics/oecd-cli-us).
  - FRED's OECD CLI for the US shows observations only through Dec 2023, and many OECD-sourced FRED series are labeled "DISCONTINUED" — [ALFRED OECD search](https://alfred.stlouisfed.org/search?st=oecd), [AllThatStats FRED mirror](https://www.allthatstats.com/en/statistics/fred_32962/oecd-total/?page=1).

### Inferences
- **Free "ISM proxy":** average the z-scores of the five regional headline indexes. Each month the Empire State and Philadelphia releases give an early read on that month's national manufacturing direction.
- Real-activity tempo: weekly WEI, plus GDPNow and the NY Fed nowcast for the current quarter. Inflation tempo: the Cleveland daily nowcast. These also provide free "expectations" for surprise work (Section 3). To use them that way, the pipeline must **snapshot each nowcast just before each release**, because the nowcasts update continuously.
- Do not build on the OECD CLI until a live SDMX test confirms it is still updating. The FRED copies appear frozen.

### Gaps
- **CFNAI (Chicago Fed National Activity Index)** was not verified this session. From prior knowledge it is monthly and on FRED as `CFNAI`/`CFNAIMA3`, but that is unverified.
- FRED series IDs and update lags for the regional surveys were not verified.
- **S&P Global US PMI** (flash and final) free availability and licensing was not researched.
- Whether GDPNow, the NY Fed nowcast and the Cleveland nowcast provide downloadable archives of past nowcast vintages was not verified; this matters for backtesting surprises.
- Current official NY Fed Staff Nowcast and GDPNow update schedules were not verified.

---

## 3. Measuring economic "surprise" without paid consensus, and what the literature says about which releases move stocks and sectors

### Takeaway
There is no free official consensus. The free proxies are:
- (a) **model nowcasts**: actual minus the Cleveland, GDPNow or NY Fed nowcast;
- (b) **SPF medians**: quarterly and coarse;
- (c) **the market's own verdict on release day**: the sign and size of the 2-year Treasury yield change;
- (d) **statistical forecasts**.

The literature says scheduled announcement days carry an outsized share of the equity premium (11.4 vs 1.1 bp per day). Stocks drift up before FOMC meetings (+49 bp). The equity response to the same news flips sign with the business cycle. FOMC news has separate "target" and "path" components. Monetary surprises move cyclical industries most.

### Cited Findings
- **Citi Economic Surprise Index:** it measures actual releases against the median survey forecast and sits on institutional terminals. Free web versions are delayed reconstructions with different methods (low-quality secondary sources) — [FP Markets explainer](https://www.fpmarkets.com/education/trading-guides/what-is-the-citigroup-economic-surprise-index/), [Cbonds index page](https://cbonds.com/indexes/99130/), [Haver, "The Power of Surprises"](https://www.haver.com/articles/archive-economy-the-power-of-surprises).
- **Scotti / Fed IFDP 1093:** builds real-time surprise and uncertainty indexes for real activity using its own aggregation method, but still measures surprises against consensus expectations — [Fed IFDP 1093 (Scotti)](https://www.federalreserve.gov/pubs/ifdp/2013/1093/ifdp1093.pdf).
- **Survey of Professional Forecasters (Philadelphia Fed):** free per-variable Excel files with mean, median and individual (anonymized ID) responses, plus cross-sectional dispersion — [SPF data files](https://www.philadelphiafed.org/research-and-data/real-time-center/survey-of-professional-forecasters/data-files), [SPF documentation (PDF)](https://www.philadelphiafed.org/-/media/frbp/assets/surveys-and-data/survey-of-professional-forecasters/spf-documentation.pdf).
- **Savor & Wilson (2013), JFQA 48(2): 343–375.**
  - Sample 1958–2009, using CPI, PPI, employment and FOMC announcement days. Average excess market return is **11.4 bp on announcement days vs 1.1 bp on other days**, so over 60% of the cumulative annual equity premium is earned on about 13% of trading days, whose timing is known in advance.
  - Unscheduled FOMC days averaged **−89.2 bp** (15 days, 2001–2009) — [IDEAS/RePEc record](https://ideas.repec.org/a/cup/jfinqa/v48y2013i02p343-375_00.html).
  - A 2022 AEA paper disputes the interpretation, arguing that the CAPM fit on those days reflects high ex-post returns rather than special risk — [AEA 2022 preliminary paper](https://aeaweb.org/conference/2022/preliminary/paper/ktNibY2Y).
- **Lucca & Moench (2015), Journal of Finance 70(1):** since 1994 the S&P 500 has risen on average **49 bp in the 24 hours before scheduled FOMC announcements**. The effect is significantly weaker in 1980–1993 and absent before 1980, and the gains do not revert in later days — [NY Fed Staff Report 512](https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr512.html), [Liberty Street Economics, 2012](https://libertystreeteconomics.newyorkfed.org/2012/07/the-puzzling-pre-fomc-announcement-drift). (The search extract gave page numbers "29–37", which look wrong; omit pages.)
- **Andersen, Bollerslev, Diebold & Vega (2007), J. Int'l Economics 73(2): 251–277.**
  - Uses high-frequency futures on US, German and UK stocks, bonds and FX, and finds that news produces conditional mean jumps.
  - **Equity reactions depend on the state of the economy:** bad news has a *positive* effect in expansions and the expected negative effect in recessions. This helps explain the time-varying stock–bond correlation — [Fed IFDP 871](https://www.federalreserve.gov/pubs/ifdp/2006/871/ifdp871.htm), [NBER w11312](https://www.nber.org/papers/w11312.pdf).
- **Gürkaynak, Sack & Swanson (2005), IJCB:** FOMC announcements need two factors, a "current target" factor and a "future path" factor tied closely to FOMC statements. The path factor has the larger effect on long-term yields; per the search extract it has a smaller (negative) effect on equities than the target factor — [IJCB paper (MPRA copy)](https://mpra.ub.uni-muenchen.de/820/1/ijcb05q2a2.pdf), [Fed FEDS 2004 version](https://www.federalreserve.gov/econres/feds/do-actions-speak-louder-than-words-the-response-of-asset-prices-to-monetary-policy-actions-and-statements.htm).
- **Bernanke & Kuttner (2005), Journal of Finance.**
  - An unanticipated 25 bp cut in the fed funds target goes with roughly a **1% rise in broad stock indexes** (June 1989–Dec 2002).
  - Industry responses vary in line with CAPM. An earlier version found the greatest sensitivity in cyclicals such as construction and the smallest in mining and utilities.
  - Most of the effect works through expected equity risk premiums, not real rates — [NBER w10402](https://www.nber.org/system/files/working_papers/w10402/w10402.pdf), [Fed FEDS 2004](https://www.federalreserve.gov/econres/feds/what-explains-the-stock-market39s-reaction-to-federal-reserve-policy.htm).

### Inferences
- **Proxy ranking for a free pipeline:**
  1. **Release-day ΔDGS2** (2-year Treasury yield change, daily from FRED/H.15): free, covers every release, and is the market's own net verdict on the release. The cost is that a daily close mixes in other news; the cited studies use intraday windows, which are not free.
  2. **Actual minus nowcast:** CPI/PCE against the Cleveland nowcast, advance GDP against GDPNow or the NY Fed nowcast. This requires archiving the pre-release nowcast.
  3. **Actual minus SPF median** for quarterly variables (GDP, unemployment, CPI). Good for regime drift, too coarse for monthly surprises.
  4. **Actual minus a simple statistical forecast** (AR(1) or trailing trend), standardized by its historical error, in the spirit of Citi and Scotti.
- Combine available surprises into a homemade "surprise index" by z-scoring each one and averaging with exponential decay. Label it as model-based, not consensus-based.
- Expectations to set from the literature: market-wide release-day effects are around 10 bp per day. That is small against single-stock noise, so per-theme event studies on 4–8-stock baskets need many years of events and should be **conditioned on cycle state** (per ABDV) and on whether yields rose.

### Gaps
- Free archives of consensus expectations were not researched. Prediction-market data (e.g., Kalshi/Polymarket economic contracts) and their API terms are unchecked.
- Evidence on whether the pre-FOMC drift weakened after 2015 was not verified. One 2020 paper reportedly still finds profitable opportunities, which contradicts the "disappearing drift" narrative.
- The companion GSS (2005, AER) paper, "The Sensitivity of Long-Term Interest Rates to Economic News", was not retrieved.
- Work ranking which releases matter most (e.g., Gilbert, Scotti, Strasser & Vega 2017; Flannery & Protopapadakis 2002) was not retrieved. From prior knowledge payrolls ranks highest, but that is **unverified here**.

---

## 4. Methods to map economic developments onto the owner's themes: event studies, regime frameworks, theme-specific leading indicators

### Takeaway
Use three layers:
1. A **regime overlay** (Fidelity business-cycle phases, or the Merrill Lynch "Investment Clock" growth × inflation quadrant) to set each theme's prior.
2. **Release-day event studies** on each theme basket, split by surprise sign and cycle state.
3. **Theme-specific fundamental indicators**: EIA power demand and the STEO, Census data-center construction, FDA and ClinicalTrials catalysts, and similar.

### Cited Findings
- **Fidelity business-cycle approach:**
  - Phases are identified probabilistically to tilt sectors. Early cycle (lower rates, sharp recovery) favors consumer discretionary and industrials, and stocks averaged more than 20%/yr in this phase.
  - Mid-cycle lasts about 3 years on average and shows the smallest sector differentiation. Late cycle brings rising inflation pressure and a flat or inverted curve, favoring defensive, inflation-resistant sectors. In recession, rates and inventories fall.
  - Phases are not uniform and not always sequential. The exhibits use data from 1962–2010, with later editions through Mar 31, 2021 — [Fidelity, "The Business Cycle Approach to Equity Sector Investing" (PDF)](https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/fixed-income/Business_Cycle_Sector_Approach.pdf), [Fidelity Institutional](https://institutional.fidelity.com/advisors/insights/topics/portfolio-construction/the-business-cycle-approach-to-equity-sector-investing), [Fidelity Viewpoints](https://www.fidelity.com/viewpoints/investing-ideas/sector-investing-business-cycle).
  - Fidelity publishes a quarterly Business Cycle Update, with a Q4 2026 edition referenced — [Fidelity Institutional, Business Cycle Update](https://institutional.fidelity.com/app/item/RD_13569_40890/business-cycle-update.html).
- **Merrill Lynch Investment Clock:**
  - Four phases: Reflation, Recovery, Overheat, Stagflation. Each is set by whether growth is above or below trend (the output gap) and which way inflation is moving. Bonds, then stocks, then commodities, then cash take the lead in turn.
  - Sector map from a secondary write-up:
    - Reflation: financials, staples, healthcare, discretionary.
    - Recovery: telecom, tech, materials, discretionary.
    - Overheat: industrials, tech, materials, energy.
    - Stagflation: utilities, staples, healthcare, energy.
  - The clock can run backward or skip phases. An independent test found only slight outperformance against equal-weight sectors at longer horizons and underperformance at 1 year — [ML report copy (date unverified)](https://ks3-cn-beijing.ksyun.com/attachment/114caaf9991619a15e81a0a4b590837f), [Medium analysis](https://medium.com/@richardhwlin/how-does-investment-clock-work-c7d8fbbeb7bd), [Macro Ops](https://macro-ops.com/?p=4930).
- **AI data centers and power (EIA):**
  - The October 2026 STEO says commercial-sector electricity demand, which includes data centers, rose **5% y/y in Q3 2026** (partly a hot summer) and is forecast to grow **2.8% in 2027**. The STEO does **not** publish a data-center-only figure — [EIA STEO, Oct 2026 (PDF)](https://www.eia.gov/outlooks/steo/pdf/steo_full.pdf), [Utility Dive](https://www.utilitydive.com/news/energy-short-term-outlook-2026-load-demand-data-centers/807530/).
  - Record total US demand of **4,288 bn kWh (2026) and 4,356 bn kWh (2027)** per Reuters-based coverage ([BOE Report](https://boereport.com/2026/10/06/us-power-use-to-beat-record-highs-in-2026-and-2027-as-ai-use-surges-eia-says-7/)). **Conflict:** another write-up gives 4,268 and 4,391 ([Energies Media](https://energiesmedia.com/eia-us-electricity-demand-2026-2027-energy/)), so check the EIA PDF.
- **AI data centers (Census construction spending):**
  - The data-center category, a series starting Jan 2014, first passed **$50B SAAR in April 2026**, about 2.3% of all construction — [Bloomberg Law](https://news.bloomberglaw.com/new-york-brief/us-construction-spending-on-data-centers-eclipses-50-billion). April 2026 was up 28.7% y/y at $50.7B — [Electrical Marketing](https://www.electricalmarketing.com/economic-data/construction-industry/article/55383786/data-centers-still-sizzling-with-a-287-april-yoy-spending-increase-to-507-billion).
  - In December 2025 data centers ($37.1B) overtook general office ($35.8B). Census counts data centers *inside* its office category — [BD+C](https://www.bdcnetwork.com/home/news/55365223/data-center-construction-spending-outpaces-office-market-for-the-first-time).
  - September 2026 is reported at a preliminary **$96.5B SAAR**, from a single secondary source that is unverified — [FourWeekMBA](https://fourweekmba.com/ai-us-data-center-construction-hit-a-record-96-5b-rate/). The figures are nominal SAAR and get revised.
- **Drug themes (e.g., obesity):**
  - The FDA does **not** publish a PDUFA calendar. Dates come from company press releases and SEC filings, and they shift with extensions or major amendments — [Wikipedia: PDUFA date](https://en.wikipedia.org/wiki/PDUFA_date), [BiopharmaWatch](https://www.biopharmawatch.com/learn/what-is-a-pdufa-date).
  - openFDA has a free key. Without a key the limits are **240 req/min and 1,000/day per IP**; with a key, **240/min and 120,000/day** — [openFDA authentication](https://open.fda.gov/apis/authentication).
  - ClinicalTrials.gov API v2 is free with no key: `https://clinicaltrials.gov/api/v2/studies`, paginated with page tokens — [DEV Community](https://dev.to/ronin13/clinical-trials-data-has-a-free-json-api-every-study-on-clinicaltrialsgov-no-key-required-1pek) (secondary).
- **Industry sensitivity to monetary surprises** (Bernanke–Kuttner) and **state-dependence** (ABDV) are covered in Section 3.

### Inferences
**Event-study recipe per theme** (owner-curated baskets, 30–60 stocks across about 6–8 themes):
1. **Events:** CPI, Employment Situation, FOMC, GDP advance, PCE, retail sales, Empire State and Philadelphia surveys. Past dates come from FRED `releases/dates`; values are first releases from ALFRED.
2. **Abnormal return:** equal-weight theme basket minus SPY (or beta-adjusted) on day 0 and over the [0, +1] window. For FOMC, also measure the 24-hour pre-announcement window, per Lucca–Moench.
3. **Surprise sign:** the release-day ΔDGS2 sign, actual minus nowcast, or actual minus SPF (Section 3).
4. **Condition on regime:** expansion vs contraction, or the Fidelity/Clock phase, using WEI, the regional-survey composite and CPI-nowcast direction. ABDV shows the response sign can flip with the regime.
5. **Statistics:** mean abnormal return and hit rate by surprise tercile, with bootstrap confidence intervals. Require at least 20 events per bucket and shrink small samples toward zero. Show results as "historical tendency", not a forecast.

**Theme → candidate leading indicators.** Rows marked ✔ are verified in the findings above; ✖ are unverified candidates listed in Gaps.

| Theme | Indicators |
|---|---|
| AI data centers / power | ✔ EIA STEO commercial demand; ✔ Census data-center construction; ✖ EIA-930 hourly grid demand (PJM/ERCOT); ✖ Fed G.17 semiconductor industrial production |
| Nuclear energy | ✔ EIA demand outlook; ✖ NRC daily reactor status; ✖ uranium spot price sources |
| Cybersecurity | ✖ BEA software investment (NIPA); ✖ CISA KEV / NVD CVE counts |
| Obesity drugs | ✔ openFDA (labels, adverse events, approvals), ✔ ClinicalTrials.gov; ✔ PDUFA dates only via company filings (8-K, press releases) |
| Space & drones | ✖ Census defense capital-goods orders; ✖ USAspending.gov awards; ✖ FAA launch licensing data |
| Streaming | ✖ Nielsen "The Gauge" (press releases, no API); ✖ BLS CPI streaming/cable items |
| Institutional bitcoin | ✔ Treasury DTS (TGA) for liquidity; ✖ CFTC Commitments of Traders for CME bitcoin futures; ✖ 13F holdings of spot-BTC ETFs via EDGAR |

- **Regime priors:** long-duration growth themes (AI, space, streaming) should be checked for rate sensitivity: release-day ΔDGS2 against basket returns, and real-yield sensitivity. Bernanke–Kuttner's risk-premium channel suggests that is where macro news shows up.

### Gaps
- Historical regime-conditional performance for *these specific themes* exists nowhere free. It has to be computed from the owner's own price history.
- The full Fidelity sector-by-phase table (exact relative-return exhibits) was not extracted.
- The ✖ candidate indicators above were **not researched** this session: EIA-930, NRC, uranium price sources, BEA software investment, CISA/NVD, defense orders, USAspending, FAA, Nielsen Gauge, BLS streaming CPI, CFTC COT API, 13F.
- Census official series IDs and the release schedule for data-center construction were not verified. The September 2026 figure is single-sourced.

---

## 5. Finnhub free tier in 2026: endpoints, limits, units of /stock/metric fields, data-quality issues, terms

### Takeaway
The free tier allows **60 calls/min plus a 30 calls/s cap**, so the planned ~1.1 s pacing is compliant.
- **Appear free:** /stock/metric, /company-news (1 year history), /stock/earnings (last 4 quarters), /calendar/earnings (1 month of history plus upcoming).
- **Paid:** candles and the dedicated EPS/revenue estimate endpoints.

**Units are not formally documented.** Docs examples show `series` values as **fractions** (netMargin 0.2124), and market cap is in **USD millions** and can be fractional. Whether the TTM `metric` fields (grossMarginTTM, revenueGrowthTTMYoy, ...) are in percent **could not be confirmed**, so the code's percent assumption must be validated against a live response.

### Cited Findings
- **Rate limits:** the free tier allows 60 API calls per minute plus an internal cap of 30 calls per second (all secondary) — [Finnhub free-tier capabilities (2026), GitHub doc](https://github.com/RaquazaCode/Fintech-AI-SaaS-Using-Google-Antigravity-Skills-Stitch/blob/main/Finnhub%20API%20Free%20Tier%20Capabilities%20(2026).docx.md), [APICostCalc, Finnhub (2026)](https://apicostcalc.com/finnhub.html), [Nexla Finnhub connector docs](https://docs.nexla.com/user-guides/connectors/finnhub_api). The official rate-limit page could not be fetched.
- **Free vs premium** (secondary, partly conflicting):
  - Company news and basic fundamentals are free, with company news covering 1 year of history.
  - Candles appear premium: free keys get **403 "no access"** for OHLCV candles, financials, dividends, and FX/crypto rates. Another source says crypto is free — [GitHub 2026 capabilities doc](https://github.com/RaquazaCode/Fintech-AI-SaaS-Using-Google-Antigravity-Skills-Stitch/blob/main/Finnhub%20API%20Free%20Tier%20Capabilities%20(2026).docx.md), [Medium: "Why yfinance keeps getting blocked"](https://medium.com/@trading.dude/why-yfinance-keeps-getting-blocked-and-what-to-use-instead-92d84bb2cc01), [skills.rest Finnhub skill (tested free endpoints incl. stock/earnings)](https://skills.rest/skill/finnhub-martino17x).
- **Earnings endpoints:**
  - **Earnings calendar:** the free tier gets "1 month of historical earnings and new updates". A Finnhub staff reply on GitHub says a free account only has access to 1 month of earnings-calendar data — [Finnhub-API issue #459, "Earnings Calendar is empty"](https://github.com/finnhubio/Finnhub-API/issues/459), [Finnhub docs (search extract)](https://finnhub.io/docs/api/market-news). The `hour` field is `bmo` (before open), `amc` (after close) or `dmh` (during market hours).
  - **Earnings surprises (/stock/earnings):** the free tier returns the **last 4 quarters**; full history back to 2000 is paid.
  - The **Revenue Estimates and EPS Estimates endpoints are Premium** — [Finnhub docs (search extract)](https://finnhub.io/docs/api/market-news).
- **/stock/metric shape:**
  - The response has a `metric` key-value map plus `series` (annual and quarterly arrays of `{period, v}`). The docs example shows `netMargin` with `"v": 0.2124`, i.e. a **fraction** — [Finnhub docs (search extract)](https://finnhub.io/docs/api/market-news).
  - Series and TTM key names include grossMargin, netMargin, operatingMargin, roaTTM, roeTTM and roicTTM — [Robot Wealth, "Exploring the finnhub.io API"](https://robotwealth.com/finnhub-api/).
- **Market cap:** Finnhub reports `marketCapitalization` **in millions** — [PerennialBackend PR #87](https://github.com/Perennial-asian-boiz/PerennialBackend/pull/87). It can be a float (e.g., 38459.63), which broke int64-typed clients — [finnhub-go issue #1](https://github.com/Finnhub-Stock-API/finnhub-go/issues/1).
- **Data-quality issues:**
  - Units are unclear for other metric fields; for example, the unit of `3MonthAverageTradingVolume` is ambiguous — [Finnhub-API issue #337](https://github.com/finnhubio/Finnhub-API/issues/337).
  - Basic-financials responses are served with **Content-Type `text/plain`** — [Finnhub-API issue #280](https://github.com/finnhubio/Finnhub-API/issues/280).
  - Quarterly series are keyed by **fiscal-period end date with no publication date**, which creates look-ahead bias in backtests — [FinGPT issue #280](https://github.com/AI4Finance-Foundation/FinGPT/issues/280).
- **Terms:** the free key is for personal, non-commercial projects (secondary) — [APICostCalc](https://apicostcalc.com/finnhub.html), [GitHub 2026 capabilities doc](https://github.com/RaquazaCode/Fintech-AI-SaaS-Using-Google-Antigravity-Skills-Stitch/blob/main/Finnhub%20API%20Free%20Tier%20Capabilities%20(2026).docx.md).

### Inferences
**Code changes the findings justify (the integration is still unvalidated):**
- Parse the body as JSON regardless of Content-Type.
- Type `marketCapitalization` as a float and multiply by 1e6 for USD.
- Treat `series[*].v` margins as fractions.
- Add a **unit sniff** for TTM percent fields (Section 8). Do not hard-code "percent".

**Earnings data:**
- Use `/calendar/earnings` for upcoming dates and recently reported results (actual vs estimate within the 1-month window), and `/stock/earnings` for the last 4 quarters of EPS actual vs estimate.
- The free calendar may return empty or partial results (issue #459), so retry with a narrower symbol or date range.
- Expect no free revenue-estimate history.

**Call budget:** 60 stocks × 3 calls (metric, calendar, news) = 180 calls, about 3.3 minutes at 1.1 s spacing. That is within 60/min. Add /stock/earnings for another ~1.1 minutes.

**Personal, owner-only use** fits the reported personal-use license. Publicly redistributing Finnhub-derived numbers could violate the terms (official ToS text unverified).

### Gaps
- **No authoritative definition was found** for: grossMargin5Y / operatingMargin5Y (5-year average? of annual or quarterly values?), revenueGrowthQuarterlyYoy, epsGrowthTTMYoy, peNormalizedAnnual, or the differences between peTTM, peExclExtraTTM and peBasicExclExtraTTM.
- **The scale of top-level TTM percent fields is unverified.** The percent-style "78.63%" seen online is from a third-party site (ChartMill), not Finnhub.
- Whether the free `/calendar/earnings` actually populates `revenueEstimate` and `epsEstimate` is unconfirmed.
- The official Finnhub ToS wording (display, redistribution, attribution) was not retrieved, because finnhub.io was blocked in this session.
- No independent study of Finnhub metric accuracy or staleness was found.

---

## 6. SEC EDGAR XBRL APIs (companyfacts, companyconcept, frames): fair access, deriving quarterly/TTM revenue, YoY growth and margins, tooling

### Takeaway
EDGAR's XBRL APIs are free, keyless and authoritative, limited to **≤10 requests/s with a declared User-Agent** (company name plus email). They are the right ground truth for revenue, margins and growth. They need careful derivation: Q4 = FY − 9-month YTD, revenue-tag fallbacks, deduplicating restatements, and fiscal-calendar handling. The data arrive with 10-Q/10-K filings, after the earnings press release.

### Cited Findings
- **Fair access:** the SEC "reserves the right to limit request rates", currently a maximum of **10 requests/second**. Automated clients must declare a User-Agent with company name and admin contact email — [SEC, Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data). Third parties disagree on whether the limit is counted per IP or per user, and say it applies across all EDGAR hostnames — [TLDRFiling rate-limit guide](https://tldrfiling.com/blog/sec-edgar-api-rate-limits-best-practices), [DealCharts](https://dealcharts.org/blog/edgar-scraping-rate-limits-explained).
- **Endpoints on `data.sec.gov`** need no API key: submissions, companyconcept, companyfacts (`data.sec.gov/api/xbrl/companyfacts/CIK{10-digit CIK}.json`, all XBRL facts for one company) and frames — [TLDRFiling endpoint guide](https://tldrfiling.com/blog/free-sec-edgar-api-guide/), [EdgarScout EDGAR API](https://edgarscout.com/edgar-api/).
- **Derivation pitfalls** (practitioner guides, not SEC spec):
  - There is **no Q4 report**: Q4 = FY (10-K) − 9-month YTD (Q3 10-Q).
  - Divestitures, restatements and reclassifications between the Q3 10-Q and the 10-K produce a "Q4 that never happened".
  - 10-Q flows are often year-to-date, especially cash flow.
  - **Tags differ across companies and over time** (`Revenues`, `RevenueFromContractWithCustomerExcludingAssessedTax`, `SalesRevenueNet` …), so a single-tag pull leaves gaps.
  - Restated values sit alongside the originals, so pick the latest-filed value.
  - Non-December fiscal years and 52/53-week years shift period boundaries.
  - **Diluted EPS cannot be derived for Q4**, because share counts differ by quarter.
  - Check that Q1+Q2+Q3+Q4 = FY — [DEV, "There Is No Q4 Report"](https://dev.to/stockpearl/there-is-no-q4-report-3-traps-in-building-10-years-of-stock-history-from-sec-filings-54i9), [DEV, "Free Company Financials API … from SEC XBRL"](https://dev.to/fishinabowl95/free-company-financials-api-quarterly-revenue-eps-and-cash-flow-from-sec-xbrl-python-199e), [Ptole, "Revenue Is Not a Number"](https://ptole.my/blog/revenue-is-not-a-number/).
- **Tooling:** **edgartools** is a free, MIT-licensed Python library for XBRL statements (`income_statement()`, `balance_sheet()`, `cashflow_statement()`) and company facts (`facts.to_pandas("us-gaap:Revenues")`). It requires `set_identity("name@example.com")` to satisfy SEC rules — [edgartools docs](https://edgartools.readthedocs.io/), [edgartools on PyPI (v5.31.0)](https://pypi.org/project/edgartools/5.31.0/).
- Filing deadlines are summarized at [EdgarScout 10-Q guide](https://edgarscout.com/sec-forms/10-q/) (page not opened).

### Inferences
**TypeScript recipe** (no Node library verified; plain `fetch` is enough):
1. Fetch one companyfacts JSON per company per scan. Sixty companies take seconds even at ≤10 req/s; send `User-Agent: "<site name> <owner email>"`.
2. Revenue tag priority: `RevenueFromContractWithCustomerExcludingAssessedTax` → `Revenues` → `RevenueFromContractWithCustomerIncludingAssessedTax` → `SalesRevenueNet` (legacy). Choose per period, not once per company.
3. For each duration fact, compute `days = end − start`. Classify 80–100 days as a quarter, ~180 and ~270 as YTD, and 350–380 as annual.
4. Deduplicate by (start, end), keeping the latest `filed`.
5. Derive missing quarters by differencing: Q2 = 6M − Q1, Q3 = 9M − 6M, Q4 = FY − 9M.
6. Compute:
   - TTM = sum of the last 4 quarters.
   - **YoY = TTM / TTM four quarters earlier − 1**, and quarterly YoY = Q / Q(−4) − 1.
   - Gross margin = `GrossProfit`/revenue, or (revenue − `CostOfRevenue`)/revenue when GrossProfit is absent.
   - Operating margin = `OperatingIncomeLoss`/revenue.
   - Net margin = `NetIncomeLoss`/revenue.
7. Sanity check that Q1–Q4 sum to FY within 0.5%.

**Timing:** EDGAR XBRL is the "slow but true" layer. Use Finnhub or Alpha Vantage for the immediate post-earnings reaction, then reconcile against EDGAR once the 10-Q/10-K is filed.

### Gaps
- The official SEC page describing the `data.sec.gov` APIs could not be fetched. Unconfirmed points:
  - the frames period-alignment rule (believed: about 91 ± 30 days for `CY####Q#`, and an `I` suffix for instantaneous values);
  - update latency;
  - the nightly bulk `companyfacts.zip`/`submissions.zip` schedule;
  - the absence of CORS support.
- A known pitfall from prior knowledge is **unverified** this session: in companyfacts, `fy`/`fp`/`form` describe the *filing* a fact came from, not the fact's own period, so prior-year comparatives carry the newer filing's fy/fp. Use start/end dates, not fy/fp.
- The ticker→CIK mapping file (believed to be `www.sec.gov/files/company_tickers.json`) was not verified.
- Exact 10-Q/10-K deadlines were not extracted. From prior knowledge: 10-Q is due 40 days after quarter end for large accelerated and accelerated filers (45 for others); 10-K is due 60/75/90 days. Unverified here.
- No maintained Node/TypeScript companyfacts library was verified.

---

## 7. Other free fundamentals/earnings options and their 2026 limits and terms (FMP, Alpha Vantage, Tiingo, EODHD, Massive/Polygon, Nasdaq Data Link, Yahoo), and who offers free EPS/revenue consensus

### Takeaway
No free provider offers broad, terms-compliant **consensus estimates** at scale in late 2026. The closest are:
- **Finnhub**: estimates in the earnings calendar, plus 4 quarters of EPS surprises.
- **Alpha Vantage**: `EARNINGS` with estimated EPS and surprise, `EARNINGS_CALENDAR`, and the newer `EARNINGS_ESTIMATES` with EPS and revenue. Its free tier is only **25 calls/day**.

The others are fallbacks at best:
- **FMP:** 250 calls/day, US-only, many endpoints locked, possibly an 87-symbol cap.
- **Tiingo:** fundamentals for Dow 30 only on the free plan.
- **Massive (ex-Polygon):** 5 calls/min, financials on paid plans.
- **EODHD:** 20 calls/day.

**Yahoo** is unofficial, has no API terms, and breaks often.

### Cited Findings
**Financial Modeling Prep (FMP)** (all secondary trackers, Oct 2026)
- The free Basic plan allows **250 requests/day**, then returns 429 until the daily reset. A 500 MB trailing-30-day bandwidth cap also applies.
- Free coverage is **US-only** and end-of-day prices only, with 5 years of history. One tracker counts **143 of 269 endpoint rows "Not available"** on free, plus 93 restricted by symbol, date range or result count.
- One source says free keys are capped to a **fixed 87-symbol list** (single source). All plans are personal-use licences.
- Sources: [CostKite (Oct 2026)](https://costkite.com/tools/financial-modeling-prep), [Qveris FMP guide](https://qveris.ai/guides/financial-modeling-prep-api), [StockMarketStack](https://stockmarketstack.com/tools/financial-modeling-prep), [FMP how-to](https://site.financialmodelingprep.com/how-to/how-to-sign-up-and-use-a-free-stock-market-data-api). Paid prices differ by source ($19/$22/$29 Starter).

**Alpha Vantage**
- The free tier allows **25 requests/day**, with some sources also citing 5/min. The cap has fallen over time from 500 to 100 to 25 per day — [Macroption, AV limits](https://www.macroption.com/alpha-vantage-api-limits/), [Qveris AV pricing](https://qveris.ai/guides/alpha-vantage-pricing-alternative/?lang=en), [TradingToolsHub review 2026](https://tradingtoolshub.com/review/alpha-vantage/).
- Premium-only functions return a "premium" message instead of data — same sources.
- `EARNINGS_ESTIMATES` ("Earnings Estimates Trending", takes `symbol`) is in the official docs — [Alpha Vantage documentation](https://www.alphavantage.co/documentation/). Secondary sources say it returns annual and quarterly **EPS and revenue estimates**, analyst counts, high/low and revision history — [Qveris AV profile](https://qveris.ai/providers/alphavantage), [AnythingMCP AV guide](https://anythingmcp.com/guides/alpha-vantage-to-mcp).
- `OVERVIEW` includes fields such as `QuarterlyRevenueGrowthYOY` and `ProfitMargin`. Ratio fields appear to be **decimals**, e.g. `ReturnOnEquityTTM: "0.7369"`; this is indirect evidence — [Macroption, AV Company Overview](https://www.macroption.com/alpha-vantage-company-overview/), [AlphaVantage.jl fundamentals post](https://dm13450.github.io/2021/01/01/Fundamental-AlphaVantage.html).
- Earnings calendar reference: [Macroption, AV Earnings Calendar](https://www.macroption.com/alpha-vantage-earnings-calendar/).

**Tiingo**
- Official fundamentals page: the free plan covers **Dow 30 tickers only**, with 50 requests/hour, 1,000/day, 500 symbols/month and 1 GB/month. Plans are **"internal use only"** — [Tiingo Fundamental Data API](https://www.tiingo.com/products/fundamental-data-api).
- **Conflicts:** one source lists 500 unique symbols per *day* ([APIs.io Tiingo](https://apis.io/rate-limits/tiingo/tiingo-rate-limits/)). An older article says the free plan has no fundamentals at all ([QuantStart](https://www.quantstart.com/articles/evaluating-data-coverage-with-tiingo/)).

**EODHD**
- The free plan is **20 API calls/day**, per a third-party comparison — [FindMyMoat](https://www.findmymoat.com/free/alternatives/tiingo). Whether fundamentals are included on free is unverified.

**Massive (formerly Polygon.io)**
- The free "Stocks Basic" plan costs $0 and allows **5 calls/min**, 2 years of history, end-of-day data. Financials and ratios come with paid plans (Stocks Advanced) — [AlgoDataIndex (2026)](https://algodataindex.com/vendors/massive/), [Qveris Polygon pricing](https://qveris.ai/guides/polygon-pricing-optimized), [OptionToolStack (Oct 2026)](https://optiontoolstack.com/tools/massive/), [APIs.io Massive profile](https://apis.io/providers/massive-com/).

**Yahoo (unofficial)**
- The yahoo-finance2 README says the project is "neither created nor endorsed by Yahoo Inc.", that Yahoo "does not provide any official API", and "use at your own risk". The library manages the cookie and crumb flow; a crumb used with the wrong cookie jar gets 401 "Invalid Crumb" — [yahoo-finance2 README v4.0.2](https://cdn.jsdelivr.net/npm/yahoo-finance2@4.0.2/README.md), [npm](https://www.npmjs.com/package/yahoo-finance2).
- Endpoints, auth and response shapes change without notice — [YahooFinanceEx docs](https://yahoo-finance-ex.hexdocs.pm/YahooFinanceEx.epub). Users report 429s and crumb failures — [Apify Yahoo scraper notes](https://apify.com/memo23/yahoo-finance-scraper.md), [Medium, "Why yfinance keeps getting blocked"](https://medium.com/@trading.dude/why-yfinance-keeps-getting-blocked-and-what-to-use-instead-92d84bb2cc01).

### Inferences
**Free consensus, ranked for this use case:**

| Provider | Free consensus available | Volume note |
|---|---|---|
| Finnhub | `/calendar/earnings` estimates (upcoming plus 1 month back); `/stock/earnings` EPS estimate and surprise (4 quarters) | all 60 names, every scan |
| Alpha Vantage | `EARNINGS` (EPS estimate history), `EARNINGS_ESTIMATES` (EPS and revenue) | 25/day: rotate about 10–20 names per day, or cover only names reporting this week |
| Yahoo `quoteSummary` earningsTrend | (prior knowledge, unverified) | avoid: no terms, breakage |

- **Unit mismatch risk:** Alpha Vantage ratios appear to be decimals, while the Finnhub TTM fields are assumed to be percent. Normalize every provider to fractions internally.
- The site already pulls OHLCV from Yahoo (per the project's task list). The same terms and breakage risk applies there. If prices break, there is no strong free fallback (Massive is 5/min and EOD only; Tiingo EOD is limited per hour), so keep Yahoo isolated behind an adapter with graceful failure.
- For a 30–60-stock universe, FMP's free tier (possible 87-symbol cap, many endpoints locked) and Tiingo's Dow-30-only fundamentals are not viable primaries. Massive's free tier has no fundamentals.

### Gaps
- **Nasdaq Data Link** free tier and free datasets were not researched. From prior knowledge, Sharadar and Zacks fundamentals are paid; unverified.
- Whether **Alpha Vantage `EARNINGS_ESTIMATES` is available on the free key** (vs premium) is unverified.
- The exact unit of Alpha Vantage `ProfitMargin` and `QuarterlyRevenueGrowthYOY` was only shown indirectly (decimal).
- EODHD fundamentals on the free plan are unverified.
- Yahoo's current Terms of Service text, and any enforcement against the library, were not found.
- The FMP 87-symbol cap is single-sourced.

---

## 8. Recommended combination and validation checks for a 30–60 stock universe refreshed occasionally

### Takeaway
**Fundamentals:**
- **First:** Finnhub (`/stock/metric`, `/calendar/earnings`, `/stock/earnings`, `/company-news`) for convenience and speed, with SEC EDGAR companyfacts as **ground truth** for revenue, margins and growth, used to validate and override.
- **Second opinion:** Alpha Vantage at 25 calls/day for EPS estimates and surprises on names reporting soon.
- **Last resort:** FMP or Tiingo.

**Macro:**
- **First:** FRED (v2 bulk plus ALFRED vintages and the release calendar).
- **Source agencies** for detail: BLS v2, BEA, EIA v2, Treasury Fiscal Data and the Fed DDP.
- **Expectations and tempo:** the Fed nowcasts (Dallas WEI, GDPNow, NY Fed, Cleveland), the regional surveys and SPF.

Validate units, staleness and cross-source agreement on every run.

### Cited Findings
These are the facts that drive the design; details and sources are in Sections 1–7.
- Finnhub free tier: 60 calls/min and 30/s; earnings calendar has 1 month of history; surprises cover 4 quarters; estimates endpoints are premium; quarterly series lack publication dates — [Finnhub-API issue #459](https://github.com/finnhubio/Finnhub-API/issues/459), [FinGPT issue #280](https://github.com/AI4Finance-Foundation/FinGPT/issues/280), [APICostCalc](https://apicostcalc.com/finnhub.html).
- SEC: 10 req/s with a declared User-Agent — [SEC, Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data).
- Alpha Vantage: 25/day — [Macroption](https://www.macroption.com/alpha-vantage-api-limits/).
- FMP: 250/day, US-only, many endpoints unavailable on free — [CostKite](https://costkite.com/tools/financial-modeling-prep).
- BLS v2: 500 queries/day — [BLS API FAQ](https://www.bls.gov/developers/api_faqs.htm).
- EIA: 5,000 rows/response — [EIA API v2.1.0 docs](https://www.eia.gov/opendata/documentation/APIv2.1.0.pdf).
- FRED v2 bulk release observations — [St. Louis Fed news, Nov 2025](https://news.research.stlouisfed.org/2025/11/fred-launches-new-version-of-api/).

### Inferences
**Recommended stack.** Primary sources first, fallbacks after.

| Need | Primary | Fallback(s) | Notes |
|---|---|---|---|
| TTM revenue growth, margins (current) | SEC companyfacts (derived) | Finnhub `/stock/metric` | Finnhub is faster to wire up; SEC is authoritative but lags until the 10-Q |
| Valuation (P/E, P/S, market cap, beta) | Finnhub `/stock/metric` (+ price) | recompute from SEC TTM net income/revenue × own price | market cap: Finnhub millions → × 1e6 |
| Earnings dates + hour | Finnhub `/calendar/earnings` | Alpha Vantage `EARNINGS_CALENDAR`; company 8-K (Item 2.02) after the fact | free Finnhub window is 1 month back |
| EPS actual vs estimate (surprise) | Finnhub `/stock/earnings` (4 quarters) | Alpha Vantage `EARNINGS` | revenue estimates: Finnhub calendar fields if populated; AV `EARNINGS_ESTIMATES` if free |
| News | Finnhub `/company-news` (1 year) | — | dedupe by URL and headline |
| Macro series | FRED v1/v2 + ALFRED | BLS v2, BEA, EIA, Fiscal Data, Fed DDP | first-release vintages for event studies |
| Activity / expectations | Regional Fed surveys, WEI, GDPNow, NY Fed nowcast, Cleveland nowcast, SPF | — | snapshot nowcasts before each release |

**Validation checks to run each scan.** Store each flag next to the value.
1. **Unit sniff (critical):** compute SEC TTM gross margin as a fraction. If Finnhub `grossMarginTTM` / SEC is about 100, the field is percent; if about 1, it is a fraction; otherwise flag it. Apply the same test to `operatingMarginTTM`, `netProfitMarginTTM` and `revenueGrowthTTMYoy`. Fallback heuristic: if most profitable names show |margin| ≤ 1.5, the field is a fraction.
2. **Cross-source agreement:** flag |Finnhub revenueGrowthTTMYoy − SEC TTM YoY| > 3 percentage points, and gross margin differences > 2 pp.
3. **Staleness:** if Finnhub's latest `series` quarterly period is earlier than the latest SEC 10-Q period end, mark Finnhub as stale and prefer SEC. Record "as-of" dates, since Finnhub has no publication date.
4. **Market cap:** Finnhub `marketCapitalization` × 1e6 should be within ±5% of own price × shares outstanding (SEC cover-page shares or Finnhub profile).
5. **P/E sanity:** P/E is null or negative when TTM EPS ≤ 0. Recompute price / TTM diluted EPS: for EDGAR, use FY EPS plus the latest YTD values, or net income / diluted shares, because Q4 EPS cannot be derived. Flag differences > 10%. Do not mix `peTTM` with `peNormalizedAnnual` across names.
6. **Earnings-date agreement:** compare Finnhub and Alpha Vantage dates; after the event, confirm with the 8-K filing date (submissions API).
7. **Surprise recompute:** (actual − estimate)/|estimate| should match the provider's `surprisePercent`. Flag near-zero estimates, where a percent surprise is meaningless.
8. **Q-sum check (SEC):** Q1+Q2+Q3+Q4 = FY within 0.5%. Also flag tag switches between periods.
9. **Macro gaps:** keep October 2025 CPI-family values as missing and exclude Oct–Dec 2025 from event-study samples.
10. **Rate-limit hygiene:**
    - Finnhub at ≥1.05 s spacing, with backoff on 429.
    - SEC at ≤8 req/s with a User-Agent.
    - Alpha Vantage: a 25/day counter persisted between runs, since runs are on demand.
    - EIA: key masked in logs.

**Terms posture:** Finnhub (personal non-commercial), FMP (personal-use licences) and Tiingo ("internal use only") all point the same way. Owner-only pages are the safe configuration. Public pages that redisplay vendor data would need a terms review. SEC, FRED (subject to third-party series copyrights), BLS, BEA, EIA and Treasury data are government or public data and lower-risk, but FRED's terms text was not verified.

### Gaps
- **Live validation was not performed.** This session could not reach finnhub.io or sec.gov, so the unit sniff in check 1 must run in the owner's own environment (GitHub Actions) before trusting the percent assumption in the existing Finnhub adapter.
- The thresholds above (3 pp, 2 pp, ±5%, 10%, 0.5%) are judgment calls, not sourced standards.
- No free source was found for **historical** revenue consensus. Revenue-surprise analysis will probably be limited to recent quarters.
