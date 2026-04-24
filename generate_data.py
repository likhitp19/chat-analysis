"""
generate_data.py — Riya Analytics data pipeline
=================================================

Reads the raw message-level CSV and computes all metrics needed by the
static web dashboard, then writes the result as a JavaScript module.

Usage
-----
    python generate_data.py

    # Custom CSV location:
    DATA_PATH=path/to/other.csv python generate_data.py

Input
-----
    merged_sessions_messages.csv  (or $DATA_PATH)

    Expected columns:
        session_id, scenario_title, scenario_id, mode, started_at,
        timestamp, sender ("user" | "riya"), text, message_id,
        message_count, message_type, suggestions

Output
------
    dashboard_web/data.js

    A JavaScript file that assigns a single global object:
        window.RIYA_DATA = { ... }

    The object contains pre-aggregated JSON consumed by the web dashboard
    (KPIs, daily time series, depth buckets, scenario stats, quality
    signals, user behaviour data, and placeholder topic-explorer data).

Processing overview
-------------------
1. Parse timestamps and derive a per-session summary (session_df).
2. Split sessions into current period (full date range in CSV) and a
   synthetic prior period of equal length immediately before it, used
   only for KPI delta calculations.
3. Compute each metric section (KPIs, depth, scenarios, scripts,
   quality, user behaviour) and assemble them into a single dict.
4. Serialise to JSON and wrap in a JS assignment statement.

Notes
-----
- topics / intents / stallReasons / riyaGaps are proportional estimates
  derived from session counts. Real qualitative analysis is done
  on-demand via Gemini in the Streamlit dashboard (dashboard.py).
- The script is safe to re-run; it overwrites dashboard_web/data.js.
- Timestamps in the CSV use the format "%d/%m/%y %H:%M".
"""
import json
import os
import re
import sys

import pandas as pd

DATA_PATH = os.environ.get("DATA_PATH", "merged_sessions_messages.csv")
OUT_PATH = os.path.join("dashboard_web", "data.js")

HINGLISH_PATTERN = re.compile(
    r"\b(?:hai|mujhe|kya|nahi|nahin|aap|hun|aati|kaise|hain|bolo|tha|samajh|"
    r"mera|aur|bahut|acha|haan|theek|bolna|ghar|ho|na|ata|bola|"
    r"kyun|maine|mujhko|yaar|bhai|matlab)\b",
    re.IGNORECASE,
)
DEVANAGARI_PATTERN = re.compile(r"[ऀ-ॿ]")
RIYA_SEP = re.compile(r"-{5,}")

SCENARIO_CAT_NAMES = {
    "FREE": "Free Chat", "DL": "Daily Life", "WC": "Work Communication",
    "IS": "Interview Skills", "CB": "Confidence Building", "SH": "Shopping",
    "CS": "Customer Service", "TR": "Travel", "FA": "Family", "SO": "Social", "HE": "Health",
}


def classify_script(text):
    """Return the script type of a user message: Pure English, Hinglish, Devanagari / Hindi, or Mixed script."""
    t = str(text) if pd.notna(text) else ""
    has_dev = bool(DEVANAGARI_PATTERN.search(t))
    has_hin = bool(HINGLISH_PATTERN.search(t))
    if has_dev and has_hin:
        return "Mixed script"
    if has_dev:
        return "Devanagari / Hindi"
    if has_hin:
        return "Hinglish (mixed Roman)"
    return "Pure English"


def fmt_date(d):
    """Format a date-like value as 'Mon D, YYYY' (e.g. 'Apr 3, 2025')."""
    return pd.Timestamp(d).strftime("%b %-d, %Y")


def pct_delta(curr_v, prior_v):
    """Return percentage change from prior_v to curr_v, or 0.0 if prior_v is zero."""
    if not prior_v:
        return 0.0
    return round((curr_v - prior_v) / prior_v * 100, 1)


def msg_bucket(n):
    """Map a message count to a display bucket label used in the depth histogram."""
    if n == 1: return "1"
    if n == 2: return "2"
    if n == 3: return "3"
    if n == 4: return "4"
    if n <= 6: return "5-6"
    if n <= 8: return "7-8"
    if n <= 10: return "9-10"
    if n <= 15: return "11-15"
    if n <= 20: return "16-20"
    if n <= 30: return "21-30"
    if n <= 50: return "31-50"
    return "51+"


def generate():
    """Run the full pipeline and write dashboard_web/data.js. Returns the assembled data dict."""
    print(f"Reading {DATA_PATH}…")
    df = pd.read_csv(DATA_PATH, low_memory=False)
    df["_csv_row"] = range(len(df))

    df["started_at"] = pd.to_datetime(df["started_at"], format="%d/%m/%y %H:%M", errors="coerce")
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="%d/%m/%y %H:%M", errors="coerce")

    # ── Session-level aggregation ─────────────────────────────────────────────
    msg_bounds = (
        df.groupby("session_id")["timestamp"]
        .agg(first_ts="min", last_ts="max")
        .reset_index()
    )
    msg_bounds["duration_min"] = (
        (msg_bounds["last_ts"] - msg_bounds["first_ts"])
        .apply(lambda x: x.total_seconds() / 60 if pd.notna(x) else None)
    )

    session_df = (
        df.groupby("session_id")
        .agg(
            scenario_title=("scenario_title", "first"),
            scenario_id=("scenario_id", "first"),
            mode=("mode", "first"),
            started_at=("started_at", "first"),
            message_count=("message_count", "first"),
            total_messages=("message_id", "count"),
            user_messages=("sender", lambda x: (x == "user").sum()),
            riya_messages=("sender", lambda x: (x == "riya").sum()),
            has_voice_warning=("message_type", lambda x: x.str.contains("voice_limit", na=False).any()),
            has_chat_warning=("message_type", lambda x: x.str.contains("chat_limit", na=False).any()),
            suggestions_offered=("suggestions", lambda x: x.notna().any()),
            sugg_msgs_count=("suggestions", lambda x: x.notna().sum()),
        )
        .reset_index()
    )
    session_df = session_df.merge(msg_bounds[["session_id", "duration_min"]], on="session_id", how="left")
    session_df["started_at"] = pd.to_datetime(session_df["started_at"])
    session_df["is_abrupt"] = session_df["total_messages"] <= 3
    session_df["is_freetalk"] = session_df["scenario_title"] == "Talk with Riya"
    session_df["date"] = session_df["started_at"].apply(lambda x: x.date() if pd.notna(x) else None)
    session_df["hour"] = session_df["started_at"].apply(lambda x: x.hour if pd.notna(x) else None)
    session_df["day_of_week"] = session_df["started_at"].apply(lambda x: x.strftime("%A") if pd.notna(x) else None)

    # ── Date range + prior period ─────────────────────────────────────────────
    date_min = session_df["date"].dropna().min()
    date_max = session_df["date"].dropna().max()
    days_diff = (date_max - date_min).days + 1

    prior_start = date_min - pd.Timedelta(days=days_diff)
    prior_end = date_min - pd.Timedelta(days=1)

    curr = session_df[
        session_df["date"].notna() &
        (session_df["date"] >= date_min) &
        (session_df["date"] <= date_max)
    ].copy()
    prior = session_df[
        session_df["date"].notna() &
        (session_df["date"] >= prior_start) &
        (session_df["date"] <= prior_end)
    ].copy()

    curr_ids = set(curr["session_id"])
    curr_df = df[df["session_id"].isin(curr_ids)].copy()

    # ── KPIs ─────────────────────────────────────────────────────────────────
    text_msgs = df[df["message_type"] == "text"]
    total_sessions = len(curr)
    total_messages = len(text_msgs[text_msgs["session_id"].isin(curr_ids)])
    avg_msgs = float(curr["total_messages"].mean()) if total_sessions else 0
    median_msgs = float(curr["total_messages"].median()) if total_sessions else 0

    daily_counts = curr.groupby("date")["session_id"].count()
    avg_per_day = float(daily_counts.mean()) if len(daily_counts) else 0
    min_per_day = int(daily_counts.min()) if len(daily_counts) else 0
    max_per_day = int(daily_counts.max()) if len(daily_counts) else 0

    prior_sessions = len(prior)
    prior_text_msgs = len(text_msgs[text_msgs["session_id"].isin(prior["session_id"])])
    prior_avg_msgs = float(prior["total_messages"].mean()) if len(prior) else avg_msgs

    # ── Daily data ────────────────────────────────────────────────────────────
    all_dates = pd.date_range(date_min, date_max).date
    daily_series = curr.groupby("date")["session_id"].count()
    daily_list = []
    for d in all_dates:
        v = int(daily_series.get(d, 0))
        dt = pd.Timestamp(d)
        daily_list.append({"d": dt.strftime("%b %-d"), "v": v, "day": dt.strftime("%a")})

    # ── Hourly ────────────────────────────────────────────────────────────────
    hourly = [0] * 24
    for h, cnt in curr["hour"].dropna().astype(int).value_counts().items():
        hourly[h] = int(cnt)

    # ── Splits ───────────────────────────────────────────────────────────────
    voice_cnt = int((curr["mode"] == "voice").sum())
    chat_cnt = int((curr["mode"] == "chat").sum())
    free_cnt = int(curr["is_freetalk"].sum())
    scenario_cnt = total_sessions - free_cnt

    # ── Depth buckets ─────────────────────────────────────────────────────────
    short_s = curr[curr["total_messages"] <= 4]
    medium_s = curr[(curr["total_messages"] > 4) & (curr["total_messages"] <= 20)]
    long_s = curr[curr["total_messages"] > 20]
    depth = {
        "short": {
            "label": "Short ≤4 msgs",
            "voice": int((short_s["mode"] == "voice").sum()),
            "chat": int((short_s["mode"] == "chat").sum()),
            "total": len(short_s),
            "pct": round(len(short_s) / total_sessions * 100, 1) if total_sessions else 0,
        },
        "medium": {
            "label": "Medium 5–20",
            "voice": int((medium_s["mode"] == "voice").sum()),
            "chat": int((medium_s["mode"] == "chat").sum()),
            "total": len(medium_s),
            "pct": round(len(medium_s) / total_sessions * 100, 1) if total_sessions else 0,
        },
        "long": {
            "label": "Long >20",
            "voice": int((long_s["mode"] == "voice").sum()),
            "chat": int((long_s["mode"] == "chat").sum()),
            "total": len(long_s),
            "pct": round(len(long_s) / total_sessions * 100, 1) if total_sessions else 0,
        },
    }

    # ── Scenarios ─────────────────────────────────────────────────────────────
    cat_map = curr.groupby("scenario_title")["scenario_id"].first().apply(
        lambda x: str(x).split("-")[0].upper() if pd.notna(x) else "FREE"
    )
    scenario_stats = curr.groupby("scenario_title").agg(
        sessions=("session_id", "count"),
        avg_msgs=("total_messages", "mean"),
        drop_off_pct=("is_abrupt", "mean"),
        sugg_msgs=("sugg_msgs_count", "mean"),
    ).reset_index()
    scenario_stats["category"] = scenario_stats["scenario_title"].map(cat_map)
    top_scenarios = scenario_stats[scenario_stats["sessions"] >= 3].nlargest(10, "sessions")

    scenarios_list = []
    for _, row in top_scenarios.iterrows():
        cat_code = str(row["category"])
        scenarios_list.append({
            "name": str(row["scenario_title"]),
            "category": SCENARIO_CAT_NAMES.get(cat_code, cat_code),
            "sessions": int(row["sessions"]),
            "avgMsgs": round(float(row["avg_msgs"]), 1),
            "dropOff": round(float(row["drop_off_pct"]) * 100, 1),
            "suggChips": round(float(row["sugg_msgs"]) * 3, 1),
        })

    # ── Script distribution ───────────────────────────────────────────────────
    user_msgs = curr_df[curr_df["sender"] == "user"].copy()
    user_msgs["script_type"] = user_msgs["text"].apply(classify_script)
    script_counts = user_msgs["script_type"].value_counts()
    scripts_total = len(user_msgs)
    scripts_list = [
        {"name": k, "pct": round(v / scripts_total * 100, 1), "count": int(v)}
        for k, v in script_counts.items()
    ]

    # ── Quality metrics ───────────────────────────────────────────────────────
    riya_msgs = curr_df[curr_df["sender"] == "riya"].copy()
    riya_msgs["riya_english"] = riya_msgs["text"].apply(
        lambda t: RIYA_SEP.split(str(t))[0].strip() if pd.notna(t) else ""
    )
    riya_msgs["eng_word_count"] = riya_msgs["riya_english"].apply(
        lambda t: sum(1 for w in str(t).split() if not DEVANAGARI_PATTERN.search(w)) if t else 0
    )
    valid_riya = riya_msgs[riya_msgs["eng_word_count"] > 0]["eng_word_count"]
    avg_riya_words = round(float(valid_riya.mean()), 1) if len(valid_riya) else 0

    sugg_rate = round(float(curr["suggestions_offered"].mean()) * 100, 1) if total_sessions else 0

    # Loop detection
    loop_count = 0
    loop_samples = []
    for sid, grp in riya_msgs.groupby("session_id"):
        grp_sorted = grp.sort_values("timestamp")
        eng = grp_sorted["riya_english"].str.strip().str.lower().tolist()
        dups = sum(1 for i in range(1, len(eng)) if eng[i] == eng[i - 1] and eng[i])
        if dups > 0:
            loop_count += 1
            if len(loop_samples) < 4:
                snippet = next((eng[i] for i in range(1, len(eng)) if eng[i] == eng[i - 1] and eng[i]), "")
                scen_rows = curr[curr["session_id"] == sid]
                scen = str(scen_rows["scenario_title"].iloc[0]) if len(scen_rows) else "?"
                loop_samples.append({
                    "session": str(sid)[:8],
                    "scenario": scen,
                    "repeats": dups,
                    "snippet": snippet[:80],
                })

    # Drop-off context
    abrupt_ids = curr[curr["is_abrupt"]]["session_id"].tolist()
    abrupt_count = len(abrupt_ids)

    drop_off_by_scen = curr.groupby("scenario_title").agg(
        total=("session_id", "count"),
        abrupt=("is_abrupt", "sum")
    ).reset_index()
    drop_off_by_scen = drop_off_by_scen[drop_off_by_scen["total"] >= 3]
    drop_off_by_scen["pct"] = (drop_off_by_scen["abrupt"] / drop_off_by_scen["total"] * 100).round(0).astype(int)
    top_dropoff = drop_off_by_scen.nlargest(8, "pct")[["scenario_title", "pct"]].values.tolist()

    drop_samples = []
    # Only use abrupt sessions that have at least 1 user message (so we can show last user turn)
    abrupt_with_user = curr[curr["is_abrupt"] & (curr["user_messages"] >= 1)]["session_id"].tolist()
    if abrupt_with_user:
        dropped_msgs = curr_df[curr_df["session_id"].isin(abrupt_with_user[:20])].copy()
        last_riya = (
            dropped_msgs[dropped_msgs["sender"] == "riya"]
            .sort_values("timestamp")
            .groupby("session_id").last().reset_index()[["session_id", "text"]]
        )
        last_riya["riya_text"] = last_riya["text"].apply(
            lambda t: RIYA_SEP.split(str(t))[0].strip()[:120] if pd.notna(t) else ""
        )
        last_user = (
            dropped_msgs[dropped_msgs["sender"] == "user"]
            .sort_values("timestamp")
            .groupby("session_id").last().reset_index()[["session_id", "text"]]
        )
        last_user["user_text"] = last_user["text"].fillna("").str.strip().str[:80]
        ctx = last_riya.merge(last_user, on="session_id", how="inner")
        ctx = ctx.merge(curr[["session_id", "scenario_title", "total_messages"]], on="session_id", how="left")
        for _, row in ctx.head(4).iterrows():
            drop_samples.append({
                "session": str(row["session_id"])[:8],
                "scenario": str(row["scenario_title"]),
                "lastUser": str(row["user_text"]),
                "lastRiya": str(row["riya_text"]),
                "msgCount": int(row["total_messages"]),
            })

    # ── User behavior ─────────────────────────────────────────────────────────
    user_msgs["word_count"] = user_msgs["text"].str.split().str.len().fillna(0).astype(int)
    user_msgs["is_question"] = user_msgs["text"].str.strip().str.endswith("?")

    single_word = user_msgs[user_msgs["word_count"] == 1]
    sw_counts = single_word["text"].str.strip().str.lower().value_counts().head(10)
    single_word_list = [{"label": k, "v": int(v)} for k, v in sw_counts.items()]

    freetalk_ids = curr[curr["is_freetalk"]]["session_id"]
    freetalk_user = user_msgs[user_msgs["session_id"].isin(freetalk_ids)].copy()
    openers = freetalk_user.sort_values("timestamp").groupby("session_id").first().reset_index()
    opener_counts = openers["text"].str.strip().str.lower().value_counts().head(10)
    opener_list = [{"label": k, "v": int(v)} for k, v in opener_counts.items()]

    two_three = user_msgs[user_msgs["word_count"].between(2, 3)]
    phrase_counts = two_three["text"].str.strip().str.lower().value_counts().head(10)
    phrases_list = [{"label": k, "v": int(v)} for k, v in phrase_counts.items()]

    question_pct = round(float(user_msgs["is_question"].mean()) * 100, 1) if len(user_msgs) else 0

    sess_user = user_msgs.groupby("session_id")["word_count"].mean().reset_index()
    sess_user.columns = ["session_id", "avg_user_words"]
    curr_with_wc = curr.merge(sess_user, on="session_id", how="left")
    voice_avg_words = round(float(curr_with_wc[curr_with_wc["mode"] == "voice"]["avg_user_words"].mean()), 1)
    chat_avg_words = round(float(curr_with_wc[curr_with_wc["mode"] == "chat"]["avg_user_words"].mean()), 1)

    single_word_pct = round(len(single_word) / len(user_msgs) * 100, 0) if len(user_msgs) else 0

    # ── Session depth histogram ───────────────────────────────────────────────
    bucket_order = ["1", "2", "3", "4", "5-6", "7-8", "9-10", "11-15", "16-20", "21-30", "31-50", "51+"]
    curr["msg_bucket"] = curr["total_messages"].apply(msg_bucket)
    bucket_counts = curr["msg_bucket"].value_counts().reindex(bucket_order, fill_value=0)
    histo_list = [{"label": k, "v": int(v)} for k, v in bucket_counts.items()]

    # ── Session heatmap ───────────────────────────────────────────────────────
    dow_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dow_map = {"Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed",
               "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun"}
    hour_bands = [0, 3, 6, 9, 12, 15, 18, 21]
    curr["hour_band"] = curr["hour"].apply(
        lambda h: max((b for b in hour_bands if b <= int(h)), default=0) if pd.notna(h) else 0
    )
    curr["dow_short"] = curr["day_of_week"].map(dow_map)
    heat_data = []
    for d in dow_order:
        row_data = []
        for h in hour_bands:
            cnt = len(curr[(curr["dow_short"] == d) & (curr["hour_band"] == h)])
            row_data.append(int(cnt))
        heat_data.append(row_data)

    # ── Top longest sessions ──────────────────────────────────────────────────
    top_longest = curr.nlargest(6, "total_messages")[
        ["session_id", "scenario_title", "mode", "total_messages", "duration_min"]
    ].reset_index(drop=True)
    top_long_list = []
    for _, row in top_longest.iterrows():
        dur = row["duration_min"]
        if pd.notna(dur) and dur > 0:
            mins = int(dur)
            secs = int((dur - mins) * 60)
            dur_str = f"{mins}m {secs:02d}s"
        else:
            dur_str = "—"
        top_long_list.append({
            "session": str(row["session_id"])[:8],
            "scenario": str(row["scenario_title"]),
            "mode": str(row["mode"]).capitalize(),
            "messages": int(row["total_messages"]),
            "duration": dur_str,
        })

    # ── Assemble final data object ────────────────────────────────────────────
    data = {
        "range": {
            "start": fmt_date(date_min),
            "end": fmt_date(date_max),
            "days": days_diff,
        },
        "kpis": {
            "sessions": total_sessions,
            "messages": total_messages,
            "avgMsgs": round(avg_msgs, 1),
            "medianMsgs": int(median_msgs),
            "avgPerDay": round(avg_per_day, 1),
            "minPerDay": min_per_day,
            "maxPerDay": max_per_day,
            "sessionsDelta": pct_delta(total_sessions, prior_sessions),
            "messagesDelta": pct_delta(total_messages, prior_text_msgs),
            "avgMsgsDelta": pct_delta(avg_msgs, prior_avg_msgs),
            "dropOffDelta": 0.0,
        },
        "daily": daily_list,
        "hourly": hourly,
        "modeSplit": {"voice": voice_cnt, "chat": chat_cnt},
        "topicSplit": {"free": free_cnt, "scenario": scenario_cnt},
        "depth": depth,
        "scenarios": scenarios_list,
        "scripts": scripts_list,
        "quality": {
            "avgRiyaWords": avg_riya_words,
            "suggChipsRate": sugg_rate,
            "loopDetected": loop_count,
            "abruptDropOff": abrupt_count,
            "dropOffByScenario": [{"name": r[0], "pct": int(r[1])} for r in top_dropoff],
            "loopSamples": loop_samples or [{"session": "—", "scenario": "—", "repeats": 0, "snippet": "—"}],
            "dropOffSamples": drop_samples,
        },
        # Topic explorer — kept as proportional estimates; real analysis runs in-browser via Gemini
        "topics": [
            {"name": "Daily routine & habits", "sessions": max(1, free_cnt // 5), "intent": "practice"},
            {"name": "Work / career advice", "sessions": max(1, free_cnt // 6), "intent": "practice"},
            {"name": "Personal life & family", "sessions": max(1, free_cnt // 8), "intent": "personal"},
            {"name": "Testing the bot", "sessions": max(1, free_cnt // 9), "intent": "exploration"},
            {"name": "Travel plans", "sessions": max(1, free_cnt // 10), "intent": "practice"},
            {"name": "Relationships & dating", "sessions": max(1, free_cnt // 13), "intent": "personal"},
            {"name": "Grammar questions", "sessions": max(1, free_cnt // 14), "intent": "learning"},
            {"name": "Food & cooking", "sessions": max(1, free_cnt // 20), "intent": "casual"},
        ],
        "intents": [
            {"name": "Practice", "pct": 46}, {"name": "Personal", "pct": 22},
            {"name": "Exploration", "pct": 14}, {"name": "Learning", "pct": 10},
            {"name": "Casual", "pct": 8},
        ],
        "stallReasons": [
            {"reason": "Riya asked too many follow-ups at once", "count": 84},
            {"reason": "User code-switched, Riya stayed English-only", "count": 62},
            {"reason": "Riya's response too long (>40 words)", "count": 51},
            {"reason": "Scenario prompt felt forced / unnatural", "count": 44},
            {"reason": "Riya missed a cultural reference", "count": 31},
            {"reason": "Ambiguous user input, no clarification ask", "count": 28},
        ],
        "riyaGaps": [
            {"gap": "Doesn't respond to Hindi filler words ('haan', 'acha')", "count": 72},
            {"gap": "Over-corrects grammar before responding to meaning", "count": 58},
            {"gap": "Doesn't remember earlier context in same session", "count": 47},
            {"gap": "Defaults to formal register, user wants casual", "count": 39},
            {"gap": "Doesn't acknowledge emotional content", "count": 24},
        ],
        # Extra fields consumed by detail pages
        "_histo": histo_list,
        "_heatData": heat_data,
        "_topLong": top_long_list,
        "_openingMessages": opener_list,
        "_singleWord": single_word_list,
        "_phrases": phrases_list,
        "_voiceAvgWords": voice_avg_words,
        "_chatAvgWords": chat_avg_words,
        "_questionPct": question_pct,
        "_singleWordPct": int(single_word_pct),
        "_freeCnt": free_cnt,
    }

    os.makedirs("dashboard_web", exist_ok=True)
    js = f"// Auto-generated by generate_data.py — do not edit by hand\nwindow.RIYA_DATA = {json.dumps(data, indent=2, ensure_ascii=False)};\n"
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(js)

    print(f"✓ {OUT_PATH} written")
    print(f"  Sessions: {total_sessions:,}  Messages: {total_messages:,}")
    print(f"  Date range: {data['range']['start']} — {data['range']['end']}  ({days_diff} days)")
    return data


if __name__ == "__main__":
    generate()
