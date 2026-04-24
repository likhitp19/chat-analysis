# Riya Chat Analytics — Key Insights
**Data: April 8–22, 2026 | 1,754 sessions | 32,534 messages | 15 days**

---

## Top 20 Insights

### 1. Engagement is bimodal — most sessions are either very short or very long
The average session has 18.5 messages, but the **median is only 7**. This gap reveals two distinct user groups: a large chunk of users who leave almost immediately, and a committed cohort who stay for extended conversations. There is very little "middle ground."

### 2. 37.7% of sessions end in 3 messages or fewer
661 out of 1,754 sessions are effectively abrupt drop-offs — the user sends at most one or two messages and leaves. This is the single biggest quality problem in the dataset.

### 3. The typical session lasts just 1 minute (median)
Despite a mean session duration of 4.3 minutes, the median is **1 minute**. The distribution is extremely right-skewed — a small group of engaged users inflates the average. For most users, Riya does not hold attention past the first exchange.

### 4. Free chat (Talk with Riya) dominates — 59.4% of all sessions
1,042 of 1,754 sessions are unstructured "Talk with Riya" conversations. Users are choosing open-ended chat over guided scenarios by a nearly 3:2 margin, which signals a preference for low-pressure practice over structured drills.

### 5. Free chat sessions run 48% longer than scenario-based sessions
"Talk with Riya" averages **21.4 messages per session** vs 14.4 for scenario-based sessions. Users who choose free talk are also the ones who stay longest — the unstructured format encourages more back-and-forth.

### 6. Voice sessions are meaningfully deeper than chat sessions
Voice sessions average **21.2 messages** vs 16.6 for chat. Voice users appear more committed — possibly because switching modes requires intentional choice. This format difference has a larger impact on depth than any scenario category.

### 7. 1 in 7 voice sessions hits the voice limit (14.9%)
111 voice sessions triggered the system voice-limit warning. These are the platform's most engaged users — they ran out of allowed time, not motivation. They represent a clear upgrade/monetisation signal.

### 8. Chat limit warnings are much rarer — only 5.0% of chat sessions
By contrast, only 58 chat sessions hit the chat limit. Either chat users self-disengage before reaching the limit, or the chat limit is set more generously. Either way, the gap between voice (14.9%) and chat (5.0%) hit rates is significant.

### 9. "Ordering food at a restaurant" is the dominant structured scenario — by far
With 262 sessions, it accounts for **36.8% of all scenario sessions** and is 5× larger than the next scenario (Introducing yourself, 106 sessions). Users gravitate toward this scenario because it maps to a common, low-stakes real-world situation.

### 10. Interview Skills and Customer Care have the worst drop-off rates — 57.7%
Both categories see nearly **6 in 10 sessions** end within 3 messages. These scenarios likely involve difficult or intimidating prompts (formal English, job-context pressure) that cause users to disengage before the conversation starts properly.

### 11. The Health category has the highest abrupt rate — 70%
7 out of 10 Health scenario sessions end within 3 messages. While the sample is small (10 sessions), the pattern is consistent with scenarios that use medical vocabulary unfamiliar to learners. Users are hitting a vocabulary wall immediately.

### 12. 90.4% of user messages are in Pure English
Despite the app's Hindi-dominant user base (99.3% `hi` language tag), the vast majority of user messages are in English. Users are genuinely trying to practice English — they are not falling back to Hindi in the chat.

### 13. Hinglish is nearly absent — only 1.8% of messages
Only 173 messages contain Roman-script Hindi words mixed with English. Code-switching is rare, suggesting users are making a conscious effort to stay in English even when they struggle.

### 14. 7.8% of user messages contain Devanagari (Hindi script)
These messages represent users who either could not find the English word or were responding emotionally. Devanagari appears mostly in longer, higher-frustration exchanges — not in short openers.

### 15. 15.8% of all user messages are a single word
1,517 user messages are single-word responses — "yes", "hello?", "ok", "no", "hi". This is the clearest signal of passive engagement: users are staying in the session but not producing language. The suggestions chips may be driving this behaviour (users clicking short options).

### 16. Users almost never ask questions — only 8.1% of messages end in "?"
Initiating a question requires confidence and vocabulary. The low question rate shows that most users are in a reactive posture — answering Riya, not driving the conversation. Active learners ask questions; passive learners answer them.

### 17. The most common conversation opener is "hello?" — not a content sentence
Across free-talk sessions, "hello?" (36 times), "hello." (26), "hi" (11) account for the majority of first user messages. Users are not arriving with a topic in mind — they are waiting to be led. Riya's opening prompt is not successfully priming them to begin.

### 18. Riya keeps a consistent, short message length (avg 9 words, median 8)
Riya's English messages are well-calibrated for a learner audience — concise and digestible. The standard deviation is 4.2 words, meaning there is very little variation. This consistency is a positive quality signal.

### 19. Usage peaks at 3pm IST — with a strong secondary block from 6am–11am
The single busiest hour is **3pm IST (154 sessions)**, likely a post-lunch or school break window. The morning block (6am–11am) accounts for 32.5% of all sessions — many users practice before their day starts. Evening usage (6pm–10pm) is surprisingly low at 10.5%.

### 20. Riya sends a loop (duplicate consecutive message) in 1.3% of sessions
23 sessions were detected where Riya sent identical consecutive messages — a sign of a conversation-state bug. While the rate is low, this kind of repetition is likely a drop-off trigger for the user who experiences it.

---

## Top 5 Actionable Insights

### A1. Fix the first-message problem — 37.7% of users leave after ≤3 messages
The drop-off is too concentrated at the very start of sessions. The root cause is visible in the data: the most common opener is "hello?" and Riya's response does not successfully pull users into a real sentence. **Action:** redesign Riya's opening prompt to ask a single, specific, easy-to-answer question ("Tell me one thing you did today") rather than an open-ended invitation. A/B test an onboarding hook that requires the user to produce a full sentence before entering free chat.

### A2. Rescue Interview Skills and Customer Care — 57.7% abrupt drop-off
These scenarios are losing users before they say anything meaningful. The scenario likely opens with a formal, high-pressure prompt that beginners find intimidating. **Action:** add a difficulty warm-up step at the start of IS and CS scenarios — one or two easy exchanges to build confidence before the "interview" framing kicks in. Alternatively, offer a "beginner" variant of these scenarios that uses simpler vocabulary and shorter turns.

### A3. Target push notifications at the 3pm and 6am–11am windows
Usage data shows two clear peaks: 3pm (post-lunch / school break) and early morning. Evening (prime-time for most apps) is weak at 10.5%. **Action:** schedule re-engagement notifications to land at 2:45pm and 7:00am IST. These are the windows when users are already forming the habit — reinforcing them with a push will compound retention.

### A4. Convert single-word users into sentence producers
15.8% of messages are one word, and 8.1% are questions. Users are answering with the minimum possible output. This limits actual language learning. **Action:** when a user sends a single-word reply three times in a row, have Riya prompt them to expand: "Can you say that as a full sentence?" This nudge, repeated consistently, trains the behaviour of producing longer utterances without breaking the conversational flow.

### A5. Fix the Riya loop bug — 23 sessions with duplicate consecutive messages
A conversation where the AI repeats the same message twice in a row is disorienting and a reliable drop-off trigger. **Action:** add a server-side deduplication guard that prevents Riya from sending the same message consecutively within a session. Log these events to identify which conversation states trigger the loop so the underlying prompt/state bug can be fixed at source.
