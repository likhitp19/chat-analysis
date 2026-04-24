# Riya Chat Analytics

A Streamlit dashboard for analysing conversation data from Riya — an AI English tutor. Covers session statistics, conversation depth, scenario performance, user behaviour, and on-demand LLM-powered topic analysis using Google Gemini.

---

## Pages

| Page | What it shows |
|---|---|
| **Overview** | KPIs (sessions, messages, averages), daily trend, hourly distribution, voice vs chat split |
| **Session Depth** | Message-count histogram, longest sessions, drop-off analysis |
| **Scenario Analysis** | Per-scenario session counts, avg messages, drop-off rate, suggestion chip usage |
| **User Behavior** | Opening messages, single-word replies, common phrases, question rate, script type (English / Hinglish / Devanagari) |
| **Conversation Quality** | Riya response length, suggestion rate, repeated-message loop detection |
| **Topic Explorer** | Batch Gemini analysis — topic tagging, stall detection, Riya gap identification, master synthesis report |

---

## Setup

**Requirements:** Python 3.10+

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**API key** — create a `.env` file in the project root:

```
GOOGLE_API_KEY=your_key_here
```

The key is used only by the Topic Explorer page and is never sent anywhere except the Gemini API.

---

## Running

```bash
streamlit run dashboard.py
```

Opens at `http://localhost:8501`.

---

## Data

| File | Description |
|---|---|
| `merged_sessions_messages.csv` | Raw message-level data — one row per message |
| `generate_data.py` | Pre-aggregates the CSV into `dashboard_web/data.js` for the static web dashboard |

Expected CSV columns: `session_id`, `scenario_title`, `scenario_id`, `mode`, `started_at`, `timestamp`, `sender`, `text`, `message_id`, `message_count`, `message_type`, `suggestions`

---

## Topic Explorer

The Topic Explorer page runs Gemini analysis in two stages:

1. **Per-session analysis** — each qualifying free-chat session is sent to Gemini independently (parallel, 3 workers). Returns: topic label, user intent, energy peak turn, stall turn, stall reason, Riya gap.

2. **Master analysis** — after per-session results are collected, a second Gemini call synthesises all results into a plain-text report covering top themes, stall patterns, Riya's gaps, and 3–5 actionable recommendations.

Results persist in Streamlit session state and are cleared when filters change.

---

## Project Structure

```
dashboard.py          # Streamlit app (6 pages)
generate_data.py      # CSV → dashboard_web/data.js pipeline
dashboard_web/        # Static web dashboard (HTML/JS)
requirements.txt
.env                  # API key (git-ignored)
.gitignore
```
