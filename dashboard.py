import ast
import concurrent.futures
import json
import os
import re

from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(
    page_title="Riya Chat Analytics",
    page_icon="💬",
    layout="wide",
    initial_sidebar_state="expanded",
)

DATA_PATH = "merged_sessions_messages.csv"

HINGLISH_PATTERN = re.compile(
    r"\b(?:hai|mujhe|kya|nahi|nahin|aap|hun|aati|kaise|hain|bolo|tha|samajh|"
    r"mera|aur|bahut|acha|haan|theek|bolna|ghar|ho|na|ata|bola|"
    r"kyun|maine|mujhko|yaar|bhai|matlab)\b",
    re.IGNORECASE,
)
DEVANAGARI_PATTERN = re.compile(r"[ऀ-ॿ]")
RIYA_SEP = re.compile(r"-{5,}")

SCENARIO_CAT_NAMES = {
    "FREE": "Free Chat",
    "DL": "Daily Life",
    "WC": "Work Communication",
    "IS": "Interview Skills",
    "CB": "Confidence Building",
    "SH": "Shopping",
    "CS": "Customer Service",
    "TR": "Travel",
    "FA": "Family",
    "SO": "Social",
    "HE": "Health",
}


def expand_cat(code: str) -> str:
    return SCENARIO_CAT_NAMES.get(code, code)


# ── Gemini / Topic Explorer helpers ──────────────────────────────────────────

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

ANALYSIS_PROMPT = """\
You are analyzing a conversation between a user learning English and an AI tutor called Riya.

Conversation (turn number — speaker: text):
{conversation}

Respond with ONLY valid JSON matching this schema exactly:
{{
  "topic": "<one short label, e.g. career advice, daily routine, travel plans>",
  "user_intent": "<one of: free chat | specific practice | asking questions | other>",
  "energy_peak_turn": <integer turn number where user was most expressive>,
  "stall_turn": <integer turn number where conversation lost energy, or null>,
  "stall_reason": "<one line on why it stalled, or null>",
  "riya_gap": "<one line on what Riya missed or could have done better, or null>"
}}"""


def get_gemini_key() -> str:
    key = os.environ.get("GOOGLE_API_KEY", "")
    if not key:
        key = st.session_state.get("gemini_api_key", "")
    return key


def build_conversation(session_id: str, raw_df: pd.DataFrame) -> tuple:
    """Return (turns_list, user_msg_count). turns_list items: {role, text, turn}."""
    msgs = raw_df[raw_df["session_id"] == session_id].copy()
    # CSV is newest-first: within the same minute, higher _csv_row = older message → sort desc
    msgs = msgs.sort_values(["timestamp", "_csv_row"], ascending=[True, False])
    turns = []
    turn_num = 0
    for _, row in msgs.iterrows():
        if row["sender"] == "riya":
            text = RIYA_SEP.split(str(row["text"]))[0].strip() if pd.notna(row["text"]) else ""
        else:
            text = str(row["text"]).strip() if pd.notna(row["text"]) else ""
        if not text:
            continue
        turn_num += 1
        turns.append({"role": row["sender"], "text": text, "turn": turn_num})
    user_count = sum(1 for t in turns if t["role"] == "user")
    return turns, user_count


_MAX_CONV_CHARS = 6000


def analyze_session(session_id: str, turns: list, api_key: str) -> dict:
    import time
    conv_text = "\n".join(
        f"Turn {t['turn']} — {t['role'].capitalize()}: {t['text']}" for t in turns
    )
    if len(conv_text) > _MAX_CONV_CHARS:
        conv_text = conv_text[:_MAX_CONV_CHARS] + "\n[conversation truncated]"
    prompt = ANALYSIS_PROMPT.format(conversation=conv_text)
    client = genai.Client(api_key=api_key)
    for attempt in range(4):
        try:
            resp = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            result = json.loads(resp.text)
            result["session_id"] = session_id
            return result
        except genai.errors.ClientError as exc:
            if exc.code == 429 and attempt < 3:
                time.sleep(2 ** attempt * 2)  # 2s, 4s, 8s
                continue
            raise
        except (json.JSONDecodeError, KeyError):
            raise ValueError(f"Unparseable JSON for session {session_id}")


@st.cache_data
def load_data():
    df = pd.read_csv(DATA_PATH, low_memory=False)
    df["_csv_row"] = range(len(df))  # capture original CSV row order before any operations

    df["started_at"] = pd.to_datetime(df["started_at"], format="%d/%m/%y %H:%M", errors="coerce")
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="%d/%m/%y %H:%M", errors="coerce")

    df["scenario_category"] = df["scenario_id"].str.split("-").str[0].str.upper()

    df["riya_english"] = df["text"].apply(
        lambda t: RIYA_SEP.split(str(t))[0].strip() if pd.notna(t) else ""
    )

    msg_bounds = (
        df.groupby("session_id")["timestamp"]
        .agg(first_ts="min", last_ts="max")
        .reset_index()
    )
    msg_bounds["first_ts"] = pd.to_datetime(msg_bounds["first_ts"])
    msg_bounds["last_ts"] = pd.to_datetime(msg_bounds["last_ts"])
    msg_bounds["duration_min"] = (
        (msg_bounds["last_ts"] - msg_bounds["first_ts"]).apply(
            lambda x: x.total_seconds() / 60 if pd.notna(x) else None
        )
    )

    session_df = (
        df.groupby("session_id")
        .agg(
            scenario_title=("scenario_title", "first"),
            scenario_id=("scenario_id", "first"),
            scenario_category=("scenario_category", "first"),
            mode=("mode", "first"),
            language=("language", "first"),
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
    session_df["length_bucket"] = pd.cut(
        session_df["message_count"],
        bins=[0, 4, 20, 9999],
        labels=["Short (≤4)", "Medium (5–20)", "Long (>20)"],
    )
    session_df["hour"] = session_df["started_at"].apply(lambda x: x.hour if pd.notna(x) else None)
    session_df["date"] = session_df["started_at"].apply(lambda x: x.date() if pd.notna(x) else None)
    session_df["day_of_week"] = session_df["started_at"].apply(lambda x: x.strftime("%A") if pd.notna(x) else None)
    session_df["is_freetalk"] = session_df["scenario_title"] == "Talk with Riya"

    user_df = df[df["sender"] == "user"].copy()
    user_df["word_count"] = user_df["text"].str.split().str.len().fillna(0).astype(int)
    user_df["is_question"] = user_df["text"].str.strip().str.endswith("?")
    user_df["has_devanagari"] = user_df["text"].str.contains(DEVANAGARI_PATTERN, na=False)
    user_df["has_hinglish"] = user_df["text"].str.contains(HINGLISH_PATTERN, na=False)

    def classify_script(row):
        if row["has_devanagari"] and row["has_hinglish"]:
            return "Mixed script"
        if row["has_devanagari"]:
            return "Devanagari / Hindi"
        if row["has_hinglish"]:
            return "Hinglish"
        return "Pure English"

    user_df["script_type"] = user_df.apply(classify_script, axis=1)

    session_user = (
        user_df.groupby("session_id")
        .agg(
            avg_user_words=("word_count", "mean"),
            pct_questions=("is_question", "mean"),
            user_msg_count=("message_id", "count"),
        )
        .reset_index()
    )
    session_df = session_df.merge(session_user, on="session_id", how="left")

    riya_df = df[df["sender"] == "riya"].copy()
    # Count only Latin-script words — some messages embed Hindi quotes in the
    # English section (no separator), which would inflate the count otherwise.
    riya_df["eng_word_count"] = riya_df["riya_english"].apply(
        lambda t: sum(1 for w in str(t).split() if not DEVANAGARI_PATTERN.search(w)) if t else 0
    )

    return df, session_df, user_df, riya_df


df, session_df, user_df, riya_df = load_data()

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("💬 Riya Analytics")
    page = st.radio(
        "Navigate",
        ["Overview", "Session Depth", "Scenario Analysis", "User Behavior", "Conversation Quality", "Topic Explorer"],
    )
    st.divider()
    st.subheader("Filters")

    date_min = session_df["date"].min()
    date_max = session_df["date"].max()
    date_range = st.date_input("Date range", value=(date_min, date_max), min_value=date_min, max_value=date_max)

    mode_sel = st.selectbox("Mode", ["All", "voice", "chat"])
    scenarios_all = sorted(session_df["scenario_title"].unique())
    scenario_sel = st.multiselect("Scenario (leave blank = all)", scenarios_all)
    length_sel = st.multiselect("Session length", ["Short (≤4)", "Medium (5–20)", "Long (>20)"])

# ── Apply filters ─────────────────────────────────────────────────────────────
def apply_filters(sdf):
    if len(date_range) == 2:
        sdf = sdf[(sdf["date"] >= date_range[0]) & (sdf["date"] <= date_range[1])]
    if mode_sel != "All":
        sdf = sdf[sdf["mode"] == mode_sel]
    if scenario_sel:
        sdf = sdf[sdf["scenario_title"].isin(scenario_sel)]
    if length_sel:
        sdf = sdf[sdf["length_bucket"].isin(length_sel)]
    return sdf


def apply_filters_no_mode(sdf):
    """Same as apply_filters but always keeps both voice and chat (for overlaid comparisons)."""
    if len(date_range) == 2:
        sdf = sdf[(sdf["date"] >= date_range[0]) & (sdf["date"] <= date_range[1])]
    if scenario_sel:
        sdf = sdf[sdf["scenario_title"].isin(scenario_sel)]
    if length_sel:
        sdf = sdf[sdf["length_bucket"].isin(length_sel)]
    return sdf


filtered_sessions = apply_filters(session_df)
filtered_session_ids = set(filtered_sessions["session_id"])
filtered_user = user_df[user_df["session_id"].isin(filtered_session_ids)]
filtered_riya = riya_df[riya_df["session_id"].isin(filtered_session_ids)]
filtered_df = df[df["session_id"].isin(filtered_session_ids)]

COLORS = px.colors.qualitative.Set2


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 1 — OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────
if page == "Overview":
    st.title("Overview")

    total_sessions = len(filtered_sessions)
    total_messages = len(filtered_df[filtered_df["message_type"] == "text"])
    avg_msgs = filtered_sessions["total_messages"].mean()
    median_msgs = filtered_sessions["total_messages"].median()

    daily_counts = filtered_sessions.groupby("date")["session_id"].count()
    avg_per_day = daily_counts.mean() if len(daily_counts) else 0
    min_per_day = daily_counts.min() if len(daily_counts) else 0
    max_per_day = daily_counts.max() if len(daily_counts) else 0

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Sessions", f"{total_sessions:,}")
    c2.metric("Total Messages", f"{total_messages:,}")
    c3.metric("Avg Msgs / Session", f"{avg_msgs:.1f}")
    c4.metric("Median Msgs / Session", f"{median_msgs:.0f}")

    c5, c6, c7 = st.columns(3)
    c5.metric("Avg Sessions / Day", f"{avg_per_day:.1f}")
    c6.metric("Min Sessions / Day", f"{min_per_day:.0f}")
    c7.metric("Max Sessions / Day", f"{max_per_day:.0f}")

    st.divider()

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Daily Session Volume")
        daily_df = (
            filtered_sessions.groupby("date")["session_id"]
            .count()
            .reset_index()
            .rename(columns={"session_id": "sessions"})
        )
        fig = px.line(
            daily_df, x="date", y="sessions",
            markers=True,
            labels={"date": "Date (IST)", "sessions": "Sessions"},
            color_discrete_sequence=[COLORS[0]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col2:
        st.subheader("Session Start — Hour of Day (IST)")
        hour_df = filtered_sessions["hour"].value_counts().sort_index().reset_index()
        hour_df.columns = ["hour", "sessions"]
        fig = px.bar(
            hour_df, x="hour", y="sessions",
            labels={"hour": "Hour (IST, 0–23)", "sessions": "Sessions"},
            color_discrete_sequence=[COLORS[1]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Voice vs Chat Mode")
        mode_df = filtered_sessions["mode"].value_counts().reset_index()
        mode_df.columns = ["mode", "count"]
        fig = px.pie(mode_df, names="mode", values="count", hole=0.5,
                     color_discrete_sequence=[COLORS[2], COLORS[3]])
        fig.update_layout(margin=dict(t=10, b=10), legend_title="Mode")
        st.plotly_chart(fig)

    with col4:
        st.subheader("Free Talk vs Scenario-Based")
        type_df = filtered_sessions["is_freetalk"].map(
            {True: "Talk with Riya (Free)", False: "Scenario-Based"}
        ).value_counts().reset_index()
        type_df.columns = ["type", "count"]
        fig = px.pie(type_df, names="type", values="count", hole=0.5,
                     color_discrete_sequence=[COLORS[4], COLORS[5]])
        fig.update_layout(margin=dict(t=10, b=10), legend_title="Session Type")
        st.plotly_chart(fig)

    st.subheader("System Limit Warnings (% of sessions by mode)")
    warn_rows = []
    for mode in ["voice", "chat"]:
        mode_s = filtered_sessions[filtered_sessions["mode"] == mode]
        if len(mode_s) == 0:
            continue
        col_key = f"has_{mode}_warning"
        if col_key in mode_s.columns:
            pct = mode_s[col_key].mean() * 100
            warn_rows.append({"Mode": mode, "% hitting limit": round(pct, 1),
                               "sessions": len(mode_s), "hit_limit": mode_s[col_key].sum()})
    if warn_rows:
        warn_df = pd.DataFrame(warn_rows)
        fig = px.bar(
            warn_df, x="Mode", y="% hitting limit",
            text="% hitting limit",
            color="Mode",
            labels={"% hitting limit": "% of sessions hitting limit"},
            color_discrete_sequence=[COLORS[0], COLORS[1]],
        )
        fig.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
        fig.update_layout(showlegend=False, margin=dict(t=10, b=10), yaxis_range=[0, 100])
        st.plotly_chart(fig)
        for r in warn_rows:
            st.caption(f"**{r['Mode'].capitalize()}**: {r['hit_limit']} of {r['sessions']} sessions hit the limit")


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 2 — SESSION DEPTH
# ─────────────────────────────────────────────────────────────────────────────
elif page == "Session Depth":
    st.title("Session Depth")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Message Count Distribution")
        mc_mean = float(filtered_sessions["message_count"].mean())
        mc_median = float(filtered_sessions["message_count"].median())
        fig = px.histogram(
            filtered_sessions, x="message_count", nbins=40,
            labels={"message_count": "Messages per session"},
            color_discrete_sequence=[COLORS[0]],
        )
        fig.add_vline(x=4, line_dash="dash", line_color="red", annotation_text="Short (4)")
        fig.add_vline(x=20, line_dash="dash", line_color="orange", annotation_text="Long (20)")
        fig.add_vline(
            x=mc_mean, line_dash="dot", line_color="#2ecc71",
            annotation_text=f"Mean {mc_mean:.1f}",
            annotation_position="top right",
        )
        fig.add_vline(
            x=mc_median, line_dash="dot", line_color="#9b59b6",
            annotation_text=f"Median {mc_median:.0f}",
            annotation_position="top left",
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)
        st.caption(f"Mean: **{mc_mean:.1f} messages** &nbsp;|&nbsp; Median: **{mc_median:.0f} messages**")

    with col2:
        st.subheader("Session Length Buckets by Mode")
        bucket_df = (
            filtered_sessions.groupby(["length_bucket", "mode"], observed=False)["session_id"]
            .count()
            .reset_index()
            .rename(columns={"session_id": "sessions"})
        )
        fig = px.bar(
            bucket_df, x="length_bucket", y="sessions", color="mode",
            barmode="group",
            labels={"length_bucket": "Session Length", "sessions": "Sessions", "mode": "Mode"},
            color_discrete_sequence=[COLORS[2], COLORS[3]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Session Duration by Scenario Category (minutes)")
        dur_df = filtered_sessions[filtered_sessions["duration_min"] > 0].copy()
        if not dur_df.empty:
            dur_df["category_label"] = dur_df["scenario_category"].apply(expand_cat)
            fig = px.box(
                dur_df, x="category_label", y="duration_min",
                labels={"category_label": "", "duration_min": "Duration (min)"},
                color="category_label",
                color_discrete_sequence=COLORS,
            )
            fig.update_layout(margin=dict(t=10, b=10), showlegend=False)
            st.plotly_chart(fig)
        else:
            st.info("No duration data available for current filter.")

    with col4:
        st.subheader("Session Start Heatmap (Hour × Day of Week, IST)")
        dow_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        heat_df = (
            filtered_sessions.groupby(["day_of_week", "hour"])["session_id"]
            .count()
            .reset_index()
            .rename(columns={"session_id": "sessions"})
        )
        pivot = heat_df.pivot(index="day_of_week", columns="hour", values="sessions").fillna(0)
        present_days = [d for d in dow_order if d in pivot.index]
        pivot = pivot.reindex(present_days)
        fig = px.imshow(
            pivot,
            labels={"x": "Hour (IST)", "y": "Day", "color": "Sessions"},
            color_continuous_scale="Blues",
            aspect="auto",
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    # Marginal distributions below the heatmap
    st.subheader("Session Distribution — Day of Week & Hour (IST)")
    mc1, mc2 = st.columns(2)
    with mc1:
        dow_counts = (
            filtered_sessions["day_of_week"]
            .value_counts()
            .reindex([d for d in dow_order if d in filtered_sessions["day_of_week"].unique()])
            .reset_index()
        )
        dow_counts.columns = ["Day", "Sessions"]
        fig = px.bar(
            dow_counts, x="Day", y="Sessions",
            color="Sessions", color_continuous_scale="Blues",
            labels={"Day": "", "Sessions": "Sessions"},
        )
        fig.update_layout(margin=dict(t=10, b=10), showlegend=False, coloraxis_showscale=False)
        st.plotly_chart(fig)
    with mc2:
        hour_counts = (
            filtered_sessions["hour"]
            .value_counts()
            .sort_index()
            .reset_index()
        )
        hour_counts.columns = ["Hour", "Sessions"]
        fig = px.bar(
            hour_counts, x="Hour", y="Sessions",
            color="Sessions", color_continuous_scale="Blues",
            labels={"Hour": "Hour (IST, 0–23)", "Sessions": "Sessions"},
        )
        fig.update_layout(margin=dict(t=10, b=10), showlegend=False, coloraxis_showscale=False)
        st.plotly_chart(fig)

    st.subheader("Top 10 Longest Sessions")
    top10 = (
        filtered_sessions.nlargest(10, "total_messages")[
            ["session_id", "scenario_title", "mode", "total_messages", "duration_min"]
        ]
        .rename(columns={
            "session_id": "Session ID", "scenario_title": "Scenario",
            "mode": "Mode", "total_messages": "Messages", "duration_min": "Duration (min)"
        })
        .reset_index(drop=True)
    )
    top10["Duration (min)"] = top10["Duration (min)"].round(1)
    st.dataframe(top10)


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 3 — SCENARIO ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────
elif page == "Scenario Analysis":
    st.title("Scenario Analysis")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Top 15 Scenarios by Session Count")
        top_scenarios = (
            filtered_sessions.groupby("scenario_title")["session_id"]
            .count()
            .nlargest(15)
            .reset_index()
            .rename(columns={"session_id": "sessions"})
            .sort_values("sessions")
        )
        fig = px.bar(
            top_scenarios, y="scenario_title", x="sessions", orientation="h",
            labels={"scenario_title": "", "sessions": "Sessions"},
            color_discrete_sequence=[COLORS[0]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col2:
        st.subheader("Scenario Category Volume (Treemap)")
        cat_df = (
            filtered_sessions.groupby(["scenario_category", "scenario_title"])["session_id"]
            .count()
            .reset_index()
            .rename(columns={"session_id": "sessions"})
        )
        fig = px.treemap(
            cat_df,
            path=["scenario_category", "scenario_title"],
            values="sessions",
            color="sessions",
            color_continuous_scale="Blues",
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Avg Messages per Session — Top 10 Scenarios")
        avg_msg_df = (
            filtered_sessions.groupby("scenario_title")["total_messages"]
            .agg(["mean", "count"])
            .reset_index()
        )
        avg_msg_df.columns = ["scenario_title", "avg_messages", "session_count"]
        avg_msg_df = avg_msg_df[avg_msg_df["session_count"] >= 3].nlargest(10, "avg_messages").sort_values("avg_messages")
        fig = px.bar(
            avg_msg_df, y="scenario_title", x="avg_messages", orientation="h",
            labels={"scenario_title": "", "avg_messages": "Avg Messages"},
            color_discrete_sequence=[COLORS[1]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col4:
        st.subheader("Abrupt Drop-off Rate (≤3 msgs) per Scenario")
        dropoff_df = (
            filtered_sessions.groupby("scenario_title")
            .agg(total=("session_id", "count"), abrupt=("is_abrupt", "sum"))
            .reset_index()
        )
        dropoff_df = dropoff_df[dropoff_df["total"] >= 3]
        dropoff_df["dropoff_pct"] = dropoff_df["abrupt"] / dropoff_df["total"] * 100
        dropoff_df = dropoff_df.nlargest(12, "dropoff_pct").sort_values("dropoff_pct")
        fig = px.bar(
            dropoff_df, y="scenario_title", x="dropoff_pct", orientation="h",
            labels={"scenario_title": "", "dropoff_pct": "% Abrupt Sessions"},
            color_discrete_sequence=[COLORS[5]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col5, col6 = st.columns(2)

    with col5:
        st.subheader("Suggestions Offered Rate — by Scenario Category")
        sug_df = (
            filtered_sessions.groupby("scenario_category")
            .agg(total=("session_id", "count"), with_sug=("suggestions_offered", "sum"))
            .reset_index()
        )
        sug_df["sug_pct"] = sug_df["with_sug"] / sug_df["total"] * 100
        sug_df["category_label"] = sug_df["scenario_category"].apply(expand_cat)
        fig = px.bar(
            sug_df.sort_values("sug_pct", ascending=True),
            y="category_label", x="sug_pct", orientation="h",
            labels={"category_label": "", "sug_pct": "% Sessions w/ Suggestions"},
            color_discrete_sequence=[COLORS[3]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col6:
        st.subheader("Bottom 5 Scenarios — Avg Message Count")
        bottom5 = (
            filtered_sessions.groupby("scenario_title")["total_messages"]
            .agg(["mean", "count"])
            .reset_index()
        )
        bottom5.columns = ["Scenario", "Avg Messages", "Sessions"]
        bottom5 = bottom5[bottom5["Sessions"] >= 3].nsmallest(5, "Avg Messages")
        bottom5["Avg Messages"] = bottom5["Avg Messages"].round(1)
        st.dataframe(bottom5.reset_index(drop=True))
        st.caption("Scenarios with ≥3 sessions. Low avg messages may signal difficulty or disengagement.")


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 4 — USER BEHAVIOR
# ─────────────────────────────────────────────────────────────────────────────
elif page == "User Behavior":
    st.title("User Behavior")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("User Avg Word Count — Voice vs Chat (per session)")
        wc_both = apply_filters_no_mode(session_df)
        wc_both = wc_both[wc_both["avg_user_words"].notna()]
        x_max = float(wc_both["avg_user_words"].quantile(0.97))
        fig = px.histogram(
            wc_both, x="avg_user_words", color="mode", nbins=30,
            barmode="overlay", opacity=0.65,
            labels={"avg_user_words": "Avg words per user message", "mode": "Mode"},
            color_discrete_sequence=[COLORS[2], COLORS[3]],
        )
        fig.update_xaxes(range=[0, x_max])
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col2:
        st.subheader("Daily Trend — Avg User Word Count")
        daily_wc = (
            filtered_sessions.groupby("date")["avg_user_words"]
            .mean()
            .reset_index()
            .rename(columns={"avg_user_words": "avg_words"})
        )
        fig = px.line(
            daily_wc, x="date", y="avg_words", markers=True,
            labels={"date": "Date", "avg_words": "Avg words / user message"},
            color_discrete_sequence=[COLORS[1]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("User Message Script Type")
        script_df = filtered_user["script_type"].value_counts().reset_index()
        script_df.columns = ["Script Type", "Count"]
        fig = px.pie(
            script_df, names="Script Type", values="Count", hole=0.5,
            color_discrete_sequence=COLORS,
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col4:
        st.subheader("% User Messages That Are Questions — by Scenario Category")
        q_df = (
            filtered_df[filtered_df["sender"] == "user"]
            .assign(
                is_q=lambda x: x["text"].str.strip().str.endswith("?"),
                scenario_category=lambda x: x["scenario_id"].str.split("-").str[0].str.upper(),
            )
            .groupby("scenario_category")
            .agg(total=("message_id", "count"), questions=("is_q", "sum"))
            .reset_index()
        )
        q_df["q_pct"] = q_df["questions"] / q_df["total"] * 100
        q_df["category_label"] = q_df["scenario_category"].apply(expand_cat)
        fig = px.bar(
            q_df.sort_values("q_pct", ascending=True),
            y="category_label", x="q_pct", orientation="h",
            labels={"category_label": "", "q_pct": "% Questions"},
            color_discrete_sequence=[COLORS[4]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    col5, col6 = st.columns(2)

    with col5:
        st.subheader("Top 20 User Opener Messages (Talk with Riya)")
        freetalk_ids = session_df[session_df["is_freetalk"]]["session_id"]
        freetalk_user = filtered_user[filtered_user["session_id"].isin(freetalk_ids)].copy()
        freetalk_user_sorted = freetalk_user.sort_values("timestamp")
        openers = (
            freetalk_user_sorted.groupby("session_id").first().reset_index()
        )
        opener_counts = (
            openers["text"]
            .str.strip()
            .str.lower()
            .value_counts()
            .head(20)
            .reset_index()
        )
        opener_counts.columns = ["Opener Message", "Count"]
        fig = px.bar(
            opener_counts.sort_values("Count"),
            y="Opener Message", x="Count", orientation="h",
            color_discrete_sequence=[COLORS[2]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col6:
        st.subheader("Top 20 Single-Word User Messages")
        single_word = filtered_user[filtered_user["word_count"] == 1]
        sw_counts = (
            single_word["text"]
            .str.strip()
            .str.lower()
            .value_counts()
            .head(20)
            .reset_index()
        )
        sw_counts.columns = ["Word", "Count"]
        fig = px.bar(
            sw_counts.sort_values("Count"),
            y="Word", x="Count", orientation="h",
            color_discrete_sequence=[COLORS[5]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    st.subheader("Top 15 Most Common 2–3 Word User Phrases")
    two_three = filtered_user[filtered_user["word_count"].between(2, 3)]
    tw_counts = (
        two_three["text"]
        .str.strip()
        .str.lower()
        .value_counts()
        .head(15)
        .reset_index()
    )
    tw_counts.columns = ["Phrase", "Count"]
    fig = px.bar(
        tw_counts.sort_values("Count"),
        y="Phrase", x="Count", orientation="h",
        color_discrete_sequence=[COLORS[3]],
    )
    fig.update_layout(margin=dict(t=10, b=30), height=400)
    st.plotly_chart(fig)


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 5 — CONVERSATION QUALITY
# ─────────────────────────────────────────────────────────────────────────────
elif page == "Conversation Quality":
    st.title("Conversation Quality")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Riya Avg English Message Length — by Scenario Category")
        riya_len = (
            filtered_riya[filtered_riya["eng_word_count"] > 0]
            .assign(scenario_category=lambda x: x["scenario_id"].str.split("-").str[0].str.upper())
            .groupby("scenario_category")["eng_word_count"]
            .mean()
            .reset_index()
            .rename(columns={"eng_word_count": "avg_words"})
        )
        riya_len["category_label"] = riya_len["scenario_category"].apply(expand_cat)
        riya_len = riya_len.sort_values("avg_words")
        fig = px.bar(
            riya_len, y="category_label", x="avg_words", orientation="h",
            labels={"category_label": "", "avg_words": "Avg English words"},
            color_discrete_sequence=[COLORS[0]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    with col2:
        st.subheader("Drop-off Sessions by Scenario")
        dropoff_thresh = st.slider(
            "Drop-off threshold — sessions with ≤ N messages", 1, 30, 10,
            help="Counts sessions where total messages ≤ this value as drop-offs",
        )
        dropped = filtered_sessions[filtered_sessions["total_messages"] <= dropoff_thresh]
        abrupt_df = (
            dropped.groupby("scenario_title")["session_id"]
            .count()
            .nlargest(12)
            .reset_index()
            .rename(columns={"session_id": "drop_sessions"})
            .sort_values("drop_sessions")
        )
        fig = px.bar(
            abrupt_df, y="scenario_title", x="drop_sessions", orientation="h",
            labels={"scenario_title": "", "drop_sessions": f"Sessions (≤{dropoff_thresh} msgs)"},
            color_discrete_sequence=[COLORS[5]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)

    st.subheader(f"Drop-off Context — Last User & Riya Messages (sessions with ≤{dropoff_thresh} messages)")
    dropped_ids = dropped["session_id"].tolist()
    if dropped_ids:
        dropped_msgs = filtered_df[filtered_df["session_id"].isin(dropped_ids)].copy()

        last_riya = (
            dropped_msgs[dropped_msgs["sender"] == "riya"]
            .sort_values("timestamp")
            .groupby("session_id")
            .last()
            .reset_index()[["session_id", "text"]]
            .rename(columns={"text": "_riya_text"})
        )
        last_riya["riya_english_last"] = last_riya["_riya_text"].apply(
            lambda t: RIYA_SEP.split(str(t))[0].strip()[:150] if pd.notna(t) else ""
        )

        last_user = (
            dropped_msgs[dropped_msgs["sender"] == "user"]
            .sort_values("timestamp")
            .groupby("session_id")
            .last()
            .reset_index()[["session_id", "text"]]
            .rename(columns={"text": "user_last_text"})
        )
        last_user["user_last_text"] = last_user["user_last_text"].fillna("").str.strip().str[:150]

        scenario_map = filtered_sessions.set_index("session_id")[["scenario_title", "mode", "total_messages"]]
        ctx = last_riya.merge(last_user, on="session_id", how="left")
        ctx = ctx.join(scenario_map, on="session_id")

        display = ctx[["scenario_title", "mode", "total_messages", "user_last_text", "riya_english_last"]].rename(
            columns={
                "scenario_title": "Scenario", "mode": "Mode",
                "total_messages": "Msgs",
                "user_last_text": "User's Last Message",
                "riya_english_last": "Riya's Last Message (English)",
            }
        ).sort_values("Msgs").reset_index(drop=True)
        st.dataframe(display, height=380)
    else:
        st.info("No sessions match the current threshold and filters.")

    st.subheader("Riya Loop Detection — Sessions with Duplicate Consecutive Messages")
    loop_sessions = []
    for sid, grp in filtered_riya.groupby("session_id"):
        grp_sorted = grp.sort_values("timestamp")
        eng_msgs = grp_sorted["riya_english"].str.strip().str.lower().tolist()
        duplicates = sum(1 for i in range(1, len(eng_msgs)) if eng_msgs[i] == eng_msgs[i - 1] and eng_msgs[i])
        if duplicates > 0:
            loop_sessions.append({"session_id": sid, "duplicate_pairs": duplicates})
    if loop_sessions:
        loop_df = pd.DataFrame(loop_sessions).sort_values("duplicate_pairs", ascending=False)
        loop_df = loop_df.merge(
            filtered_sessions[["session_id", "scenario_title", "mode", "total_messages"]],
            on="session_id", how="left"
        ).rename(columns={
            "session_id": "Session ID", "scenario_title": "Scenario",
            "mode": "Mode", "total_messages": "Total Msgs", "duplicate_pairs": "Duplicate Pairs"
        })
        st.dataframe(loop_df.reset_index(drop=True))
        st.caption(f"{len(loop_sessions)} sessions detected where Riya sent consecutive identical messages.")
    else:
        st.success("No Riya loop patterns detected in current filter.")

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Suggestion Chips Offered — by Scenario Category")

        # KPI strip
        total_sugg_chips = int(filtered_sessions["sugg_msgs_count"].sum()) * 3
        sessions_with_sugg = int(filtered_sessions["suggestions_offered"].sum())
        avg_sugg_per_session = filtered_sessions["sugg_msgs_count"].mean()
        sk1, sk2, sk3 = st.columns(3)
        sk1.metric("Total chips offered", f"{total_sugg_chips:,}")
        sk2.metric("Sessions with suggestions", f"{sessions_with_sugg:,}")
        sk3.metric("Avg per session", f"{avg_sugg_per_session:.1f} msgs")

        # Avg suggestion-carrying Riya messages per session by category
        sugg_by_cat = (
            filtered_sessions.groupby("scenario_category")["sugg_msgs_count"]
            .mean()
            .reset_index()
            .rename(columns={"sugg_msgs_count": "avg_sugg_msgs"})
        )
        sugg_by_cat["category_label"] = sugg_by_cat["scenario_category"].apply(expand_cat)
        fig = px.bar(
            sugg_by_cat.sort_values("avg_sugg_msgs", ascending=True),
            y="category_label", x="avg_sugg_msgs", orientation="h",
            labels={"category_label": "", "avg_sugg_msgs": "Avg suggestion-carrying Riya msgs / session"},
            color_discrete_sequence=[COLORS[3]],
        )
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)
        st.caption(
            "Each suggestion-carrying Riya message shows 3 clickable chips. "
            "Whether users tapped a chip vs typed manually cannot be determined "
            "from this dataset — that requires UI-level button-tap logging."
        )

    with col4:
        st.subheader("Riya Message Word Count Distribution")
        riya_wc = filtered_riya[filtered_riya["eng_word_count"] > 0]["eng_word_count"]
        x_cap = float(riya_wc.quantile(0.97))
        fig = px.histogram(
            riya_wc, nbins=30,
            labels={"value": "English word count", "count": "Messages"},
            color_discrete_sequence=[COLORS[2]],
        )
        fig.update_xaxes(range=[0, x_cap])
        fig.update_layout(margin=dict(t=10, b=10))
        st.plotly_chart(fig)
        st.caption(f"X-axis capped at 97th percentile ({x_cap:.0f} words). Outliers caused by Hindi text embedded in Riya messages without a separator are excluded from the word count.")


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 6 — TOPIC EXPLORER
# ─────────────────────────────────────────────────────────────────────────────
elif page == "Topic Explorer":
    st.title("Topic Explorer")
    st.caption(
        "Batch LLM analysis of free-chat (Talk with Riya) sessions using Gemini. "
        "Analysis runs on demand — results persist until you navigate away or re-run."
    )

    # ── API key ──────────────────────────────────────────────────────────────
    api_key = get_gemini_key()
    if not api_key:
        st.warning("No API key found. Set the `GOOGLE_API_KEY` environment variable or enter it below.")
        entered = st.text_input("Google API key", type="password", key="gemini_key_input")
        if entered:
            st.session_state["gemini_api_key"] = entered
            api_key = entered
    else:
        st.success("API key loaded.", icon="✅")

    st.divider()

    # ── Tab-level filters ────────────────────────────────────────────────────
    f1, f2 = st.columns([2, 1])
    with f1:
        te_min_date = session_df["date"].min()
        te_max_date = session_df["date"].max()
        te_date_range = st.date_input(
            "Date range",
            value=[te_min_date, te_max_date],
            min_value=te_min_date,
            max_value=te_max_date,
            key="te_date_range",
        )
    with f2:
        te_min_msgs = st.slider(
            "Min user messages per session", 1, 20, 4, key="te_min_msgs",
            help="Only include sessions where the user sent at least this many messages",
        )

    # Candidate sessions — Talk with Riya only
    ft_sessions = session_df[session_df["is_freetalk"]].copy()
    if len(te_date_range) == 2:
        ft_sessions = ft_sessions[
            (ft_sessions["date"] >= te_date_range[0]) & (ft_sessions["date"] <= te_date_range[1])
        ]
    ft_sessions = ft_sessions[ft_sessions["user_messages"] >= te_min_msgs]
    candidate_ids = ft_sessions["session_id"].tolist()

    st.info(f"**{len(candidate_ids)} sessions** qualify with current filters (Talk with Riya, ≥{te_min_msgs} user messages).")

    # ── Filter fingerprint for stale-result detection ─────────────────────────
    current_filter_key = f"{te_date_range}|{te_min_msgs}"
    if (
        "te_results" in st.session_state
        and st.session_state.get("te_filter_key") != current_filter_key
    ):
        st.warning("Filters changed since the last run — click **Run Analysis** to refresh.")

    # ── Run button ───────────────────────────────────────────────────────────
    run_disabled = not api_key or len(candidate_ids) == 0
    if st.button("▶ Run Analysis", disabled=run_disabled, type="primary"):
        if not api_key:
            st.error("Please provide a valid API key before running.")
        else:
            # Build conversation turns for all candidate sessions
            turns_map: dict = {}
            for sid in candidate_ids:
                turns, _ = build_conversation(sid, df)
                turns_map[sid] = turns

            progress_bar = st.progress(0)
            status_text = st.empty()
            results: dict = {}

            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = {
                    executor.submit(analyze_session, sid, turns_map[sid], api_key): sid
                    for sid in candidate_ids
                }
                for i, future in enumerate(concurrent.futures.as_completed(futures)):
                    sid = futures[future]
                    try:
                        results[sid] = future.result()
                    except Exception as exc:
                        results[sid] = {"error": str(exc), "session_id": sid}
                    progress_bar.progress((i + 1) / len(futures))
                    status_text.text(f"Analyzed {i + 1} / {len(futures)} sessions…")

            progress_bar.empty()
            status_text.empty()
            st.session_state["te_results"] = results
            st.session_state["te_filter_key"] = current_filter_key
            st.session_state["te_turns_map"] = turns_map
            st.success(f"Done — {len(results)} sessions analyzed.")

    # ── Results ──────────────────────────────────────────────────────────────
    if "te_results" in st.session_state and st.session_state["te_results"]:
        results = st.session_state["te_results"]
        turns_map = st.session_state.get("te_turns_map", {})

        # Only successful results
        ok_results = [r for r in results.values() if "error" not in r]
        err_results = [r for r in results.values() if "error" in r]
        err_count = len(err_results)
        if err_count:
            with st.expander(f"{err_count} session(s) failed — click to see errors"):
                error_counts: dict = {}
                for r in err_results:
                    msg = str(r.get("error", "unknown"))[:120]
                    error_counts[msg] = error_counts.get(msg, 0) + 1
                for msg, cnt in sorted(error_counts.items(), key=lambda x: -x[1]):
                    st.caption(f"× {cnt}× — {msg}")

        if ok_results:
            st.divider()

            # ── Row 1: Topic frequency + User intent ─────────────────────────
            rc1, rc2 = st.columns(2)

            with rc1:
                st.subheader("Top 10 Topics")
                topic_counts = (
                    pd.Series([r.get("topic", "unknown") for r in ok_results])
                    .str.lower().str.strip()
                    .value_counts()
                    .head(10)
                    .reset_index()
                )
                topic_counts.columns = ["Topic", "Sessions"]
                fig = px.bar(
                    topic_counts.sort_values("Sessions"),
                    y="Topic", x="Sessions", orientation="h",
                    color_discrete_sequence=[COLORS[0]],
                    labels={"Topic": "", "Sessions": "Sessions"},
                )
                fig.update_layout(margin=dict(t=10, b=10))
                st.plotly_chart(fig)

            with rc2:
                st.subheader("User Intent")
                intent_counts = (
                    pd.Series([r.get("user_intent", "other") for r in ok_results])
                    .str.lower().str.strip()
                    .value_counts()
                    .reset_index()
                )
                intent_counts.columns = ["Intent", "Sessions"]
                fig = px.pie(
                    intent_counts, names="Intent", values="Sessions", hole=0.5,
                    color_discrete_sequence=COLORS,
                )
                fig.update_layout(margin=dict(t=10, b=10))
                st.plotly_chart(fig)

            # ── Row 2: Stall patterns + Riya gaps ────────────────────────────
            st.divider()
            rl1, rl2 = st.columns(2)

            with rl1:
                st.subheader("Most Common Stall Reasons")
                stall_reasons = [
                    r["stall_reason"] for r in ok_results
                    if r.get("stall_reason") and r["stall_reason"] not in (None, "null", "")
                ]
                if stall_reasons:
                    sr_counts = (
                        pd.Series(stall_reasons)
                        .str.strip()
                        .value_counts()
                        .head(10)
                        .reset_index()
                    )
                    sr_counts.columns = ["Stall Reason", "Count"]
                    for _, row in sr_counts.iterrows():
                        st.markdown(f"- **{row['Count']}×** {row['Stall Reason']}")
                else:
                    st.info("No stall reasons detected in analyzed sessions.")

            with rl2:
                st.subheader("Most Common Riya Gaps")
                riya_gaps = [
                    r["riya_gap"] for r in ok_results
                    if r.get("riya_gap") and r["riya_gap"] not in (None, "null", "")
                ]
                if riya_gaps:
                    rg_counts = (
                        pd.Series(riya_gaps)
                        .str.strip()
                        .value_counts()
                        .head(10)
                        .reset_index()
                    )
                    rg_counts.columns = ["Riya Gap", "Count"]
                    for _, row in rg_counts.iterrows():
                        st.markdown(f"- **{row['Count']}×** {row['Riya Gap']}")
                else:
                    st.info("No Riya gaps identified in analyzed sessions.")

            # ── Row 3: Session drilldown by topic ─────────────────────────────
            st.divider()
            st.subheader("Session Drilldown by Topic")
            unique_topics = sorted({
                r.get("topic", "unknown").lower().strip()
                for r in ok_results
                if r.get("topic")
            })
            topic_sel = st.selectbox("Select a topic to explore", unique_topics)
            sample_sids = [
                r["session_id"] for r in ok_results
                if r.get("topic", "").lower().strip() == topic_sel
            ][:5]

            if sample_sids:
                st.caption(f"Showing up to 5 of {len([r for r in ok_results if r.get('topic','').lower().strip() == topic_sel])} sessions tagged as **{topic_sel}**.")
                for sid in sample_sids:
                    turns = turns_map.get(sid, [])
                    meta = results[sid]
                    label = f"Session {sid[:8]}… | {len(turns)} turns | intent: {meta.get('user_intent','?')} | stall @ turn {meta.get('stall_turn','—')}"
                    with st.expander(label):
                        st.markdown(f"**Stall reason:** {meta.get('stall_reason') or '—'}")
                        st.markdown(f"**Riya gap:** {meta.get('riya_gap') or '—'}")
                        st.divider()
                        for t in turns:
                            if t["role"] == "riya":
                                st.markdown(f"🤖 **Riya (Turn {t['turn']}):** {t['text']}")
                            else:
                                st.markdown(f"👤 **User (Turn {t['turn']}):** {t['text']}")
            else:
                st.info("No sessions found for the selected topic.")
