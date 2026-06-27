import streamlit as st
import cv2
import numpy as np
from hand_utils import HandTracker
from predictor import SignPredictor
from sign_visualizer import SignVisualizer

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Sawa · Sign Bridge", layout="wide", page_icon="🤟")

# ── Global CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* Hide Streamlit chrome */
    #MainMenu, footer, header { visibility: hidden; }

    /* Page background */
    .stApp { background: #0f1117; color: #e8eaf0; }

    /* Sidebar */
    section[data-testid="stSidebar"] {
        background: #161b27;
        border-right: 1px solid #2a2f3d;
    }

    /* ── Word display card ── */
    .word-card {
        background: #161b27;
        border: 1px solid #2a2f3d;
        border-radius: 14px;
        padding: 28px 24px 22px;
        margin-bottom: 18px;
    }
    .word-label {
        font-size: 11px;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 10px;
    }
    .word-text {
        font-family: 'Courier New', monospace;
        font-size: 36px;
        font-weight: 700;
        color: #a78bfa;
        letter-spacing: 4px;
        min-height: 48px;
        word-break: break-all;
    }
    .word-placeholder {
        font-family: 'Courier New', monospace;
        font-size: 22px;
        color: #374151;
        letter-spacing: 2px;
    }

    /* ── Letter tiles (history row) ── */
    .letter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
    }
    .letter-tile {
        background: #1e2333;
        border: 1px solid #2e3650;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Courier New', monospace;
        font-size: 18px;
        font-weight: 700;
        color: #c4b5fd;
    }
    .letter-tile.space-tile {
        color: #4b5563;
        font-size: 12px;
        width: 54px;
        letter-spacing: 0;
    }

    /* ── Stats row ── */
    .stats-row {
        display: flex;
        gap: 14px;
        margin-top: 16px;
    }
    .stat-box {
        flex: 1;
        background: #1a1f2e;
        border: 1px solid #252b3b;
        border-radius: 10px;
        padding: 12px 14px;
        text-align: center;
    }
    .stat-value { font-size: 22px; font-weight: 700; color: #a78bfa; }
    .stat-label { font-size: 10px; letter-spacing: 1.5px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }

    /* ── Hold progress bar ── */
    .hold-bar-wrap {
        background: #1a1f2e;
        border: 1px solid #252b3b;
        border-radius: 10px;
        padding: 14px 16px;
        margin-top: 14px;
    }
    .hold-bar-label {
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 8px;
    }
    .hold-bar-track {
        background: #252b3b;
        border-radius: 6px;
        height: 10px;
        overflow: hidden;
    }
    .hold-bar-fill {
        height: 10px;
        border-radius: 6px;
        transition: width 0.1s ease;
        background: linear-gradient(90deg, #7c3aed, #a78bfa);
    }
    .hold-letter {
        font-family: 'Courier New', monospace;
        font-size: 13px;
        color: #c4b5fd;
        margin-top: 6px;
        text-align: right;
    }

    /* ── Buttons ── */
    .stButton > button {
        background: #1e2333 !important;
        color: #c4b5fd !important;
        border: 1px solid #3730a3 !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        padding: 6px 16px !important;
    }
    .stButton > button:hover {
        background: #2e2060 !important;
        border-color: #6d28d9 !important;
    }

    /* ── Camera frame border ── */
    .stImage > img {
        border-radius: 12px;
        border: 1px solid #2a2f3d;
    }
</style>
""", unsafe_allow_html=True)


# ── Cached resources ───────────────────────────────────────────────────────────
# Cache disabled during development for live code changes
def load_predictor():
    return SignPredictor()

def load_tracker():
    return HandTracker()

def load_visualizer():
    return SignVisualizer()

predictor = load_predictor()
tracker   = load_tracker()
visualizer = load_visualizer()


# ── Session state bootstrap ────────────────────────────────────────────────────
def init_state():
    defaults = {
        "text_buffer":    "",
        "streak_letter":  None,
        "streak_count":   0,
        "letter_count":   0,
        "word_count":     0,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🤟 Sawa")
    st.markdown("Sign letters with your hand — hold each sign steady to type it.")
    st.divider()

    STREAK_THRESHOLD = st.slider(
        "Hold sensitivity (frames)",
        min_value=6, max_value=24, value=12, step=2,
        help="Lower = faster typing. Higher = fewer accidental letters."
    )
    st.divider()
    st.caption("Tip: show a **SPACE** sign to add a space, **DEL** to delete.")


# ── Layout with Tabs ──────────────────────────────────────────────────────────
tab_sign2text, tab_text2sign = st.tabs(["🤟 Sign to Text", "⌨️ Text to Sign"])


# ══════════════════════════════════════════════════════════════════════════════
# RIGHT PANEL — word display, stats, hold bar, controls
# ══════════════════════════════════════════════════════════════════════════════
with tab_sign2text:
    st.markdown("### Sign to Text")
    col_cam, col_panel = st.columns([3, 2], gap="large")

    # ── Word display ──────────────────────────────────────────────────────────
    buf = st.session_state.text_buffer
    if buf:
        # Build letter tiles HTML
        tiles_html = '<div class="letter-row">'
        for ch in buf:
            if ch == " ":
                tiles_html += '<div class="letter-tile space-tile">SPC</div>'
            else:
                tiles_html += f'<div class="letter-tile">{ch}</div>'
        tiles_html += "</div>"

        word_html = f"""
        <div class="word-card">
            <div class="word-label">Building word</div>
            <div class="word-text">{buf.replace(" ", "·")}</div>
            {tiles_html}
        </div>
        """
    else:
        word_html = """
        <div class="word-card">
            <div class="word-label">Building word</div>
            <div class="word-placeholder">Show a sign to start...</div>
        </div>
        """

    word_placeholder = st.empty()
    word_placeholder.markdown(word_html, unsafe_allow_html=True)

    # ── Stats ─────────────────────────────────────────────────────────────────
    stats_placeholder = st.empty()
    def render_stats():
        stats_placeholder.markdown(f"""
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-value">{len(st.session_state.text_buffer.replace(" ", ""))}</div>
                <div class="stat-label">Letters</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">{len(st.session_state.text_buffer.split()) if st.session_state.text_buffer.strip() else 0}</div>
                <div class="stat-label">Words</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">{len(st.session_state.text_buffer)}</div>
                <div class="stat-label">Chars</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    render_stats()

    # ── Hold progress bar ─────────────────────────────────────────────────────
    hold_placeholder = st.empty()
    def render_hold(letter=None, pct=0):
        letter_label = f"Holding: <b>{letter}</b>" if letter else "No sign detected"
        hold_placeholder.markdown(f"""
        <div class="hold-bar-wrap">
            <div class="hold-bar-label">Hold progress</div>
            <div class="hold-bar-track">
                <div class="hold-bar-fill" style="width:{pct}%"></div>
            </div>
            <div class="hold-letter">{letter_label}</div>
        </div>
        """, unsafe_allow_html=True)

    render_hold()

    # ── Controls ──────────────────────────────────────────────────────────────
    st.markdown("")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("⌫  Delete last", use_container_width=True):
            st.session_state.text_buffer = st.session_state.text_buffer[:-1]
            st.rerun()
    with c2:
        if st.button("🗑️  Clear all", use_container_width=True):
            st.session_state.text_buffer = ""
            st.session_state.streak_count = 0
            st.session_state.streak_letter = None
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════════
    # LEFT PANEL — camera feed
    # ══════════════════════════════════════════════════════════════════════════════
    with col_cam:
        run = st.checkbox("▶  Start camera", key="cam_checkbox")
        frame_placeholder = st.empty()

        if not run:
            frame_placeholder.markdown("""
            <div style="background:#161b27;border:1px solid #2a2f3d;border-radius:12px;
                        height:360px;display:flex;align-items:center;justify-content:center;
                        color:#374151;font-size:16px;letter-spacing:1px;">
                Camera is off — tick the box above to start
            </div>
            """, unsafe_allow_html=True)

        if run:
            cap = cv2.VideoCapture(0)

            while st.session_state.get("cam_checkbox", False):
                ret, frame = cap.read()
                if not ret:
                    st.error("Could not read from webcam.")
                    break

                # ── Inference ───────────────────────────────────────────────────
                landmarks, annotated = tracker.get_landmarks(frame)
                
                # Only predict if landmarks contain actual hand data (not all zeros)
                has_hand = np.any(landmarks)
                if has_hand:
                    letter, conf = predictor.predict(landmarks)
                    detected = letter if letter else None
                else:
                    detected = None
                    conf = 0.0

                # ── Buffer / debounce logic ──────────────────────────────────────
                appended = False

                if detected:
                    if detected == st.session_state.streak_letter:
                        st.session_state.streak_count += 1
                    else:
                        st.session_state.streak_letter = detected
                        st.session_state.streak_count  = 1

                    if st.session_state.streak_count >= STREAK_THRESHOLD:
                        st.session_state.streak_count = 0          # reset hold
                        action = detected.lower()

                        if action == "space":
                            st.session_state.text_buffer += " "
                        elif action in ("del", "delete"):
                            st.session_state.text_buffer = st.session_state.text_buffer[:-1]
                        else:
                            st.session_state.text_buffer += detected.upper()

                        appended = True
                else:
                    # Hand left frame — reset streak
                    st.session_state.streak_count  = 0
                    st.session_state.streak_letter = None

                # ── HUD overlay on frame ─────────────────────────────────────────
                h, w = annotated.shape[:2]

                # Semi-transparent top bar
                overlay = annotated.copy()
                cv2.rectangle(overlay, (0, 0), (w, 90), (15, 17, 23), -1)
                cv2.addWeighted(overlay, 0.7, annotated, 0.3, 0, annotated)

                # Prediction text
                label = f"{detected}  {conf:.0%}" if detected else "No hand"
                cv2.putText(annotated, label, (16, 42),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.1, (200, 180, 255), 2, cv2.LINE_AA)

                # Hold progress bar
                if st.session_state.streak_count > 0:
                    bar_w   = 260
                    filled  = int((st.session_state.streak_count / STREAK_THRESHOLD) * bar_w)
                    cv2.rectangle(annotated, (16, 58), (16 + bar_w, 72), (37, 44, 61), -1)
                    cv2.rectangle(annotated, (16, 58), (16 + filled, 72), (124, 58, 237), -1)

                # Flash green border when a letter is committed
                if appended:
                    cv2.rectangle(annotated, (3, 3), (w - 3, h - 3), (80, 200, 120), 4)

                # ── Push frame to UI ─────────────────────────────────────────────
                frame_placeholder.image(
                    cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB),
                    channels="RGB", use_container_width=True
                )

                # ── Update side panel in real-time ───────────────────────────────
                buf = st.session_state.text_buffer
                if buf:
                    tiles_html = '<div class="letter-row">'
                    for ch in buf:
                        if ch == " ":
                            tiles_html += '<div class="letter-tile space-tile">SPC</div>'
                        else:
                            tiles_html += f'<div class="letter-tile">{ch}</div>'
                    tiles_html += "</div>"
                    word_placeholder.markdown(f"""
                    <div class="word-card">
                        <div class="word-label">Building word</div>
                        <div class="word-text">{buf.replace(" ", "·")}</div>
                        {tiles_html}
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    word_placeholder.markdown("""
                    <div class="word-card">
                        <div class="word-label">Building word</div>
                        <div class="word-placeholder">Show a sign to start...</div>
                    </div>
                    """, unsafe_allow_html=True)

                render_stats()

                pct = int((st.session_state.streak_count / STREAK_THRESHOLD) * 100)
                render_hold(
                    letter=st.session_state.streak_letter,
                    pct=pct
                )

            cap.release()


# ══════════════════════════════════════════════════════════════════════════════
# TEXT TO SIGN TAB
# ══════════════════════════════════════════════════════════════════════════════
with tab_text2sign:
    st.markdown("### Text to Sign")

    # Show image folder status so you can debug instantly
    status = visualizer.image_dir_status()
    if status.startswith("✅"):
        st.caption(status)
    else:
        st.warning(status)

    if "text2sign_input" not in st.session_state:
        st.session_state.text2sign_input = ""

    user_text = st.text_input(
        "Type a word or sentence:",
        value=st.session_state.text2sign_input,
        placeholder="e.g. HELLO",
        key="t2s_input_field",
    )
    st.session_state.text2sign_input = user_text

    if st.button("🗑️ Clear", key="t2s_clear"):
        st.session_state.text2sign_input = ""
        st.rerun()

    if user_text.strip():
        # Build token list: only letters + SPACE markers
        tokens = []
        for ch in user_text.upper():
            if ch == " ":
                tokens.append("SPACE")
            elif ch.isalpha():
                tokens.append(ch)

        if not tokens:
            st.info("No alphabetic characters found — try typing letters only.")
        else:
            st.markdown("---")
            COLS_PER_ROW = 6
            for row_start in range(0, len(tokens), COLS_PER_ROW):
                chunk = tokens[row_start: row_start + COLS_PER_ROW]
                cols  = st.columns(len(chunk))
                for col, token in zip(cols, chunk):
                    img_bgr = visualizer.create_sign_image(token, width=200, height=200)
                    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                    with col:
                        st.image(img_rgb, use_container_width=True)
                        if token == "SPACE":
                            st.markdown(
                                "<p style='text-align:center;color:#6b7280;"
                                "font-size:11px;margin-top:2px;'>SPACE</p>",
                                unsafe_allow_html=True,
                            )
                        else:
                            known = visualizer.is_known_sign(token)
                            color = "#a78bfa" if known else "#ef4444"
                            label = token if known else f"{token} ?"
                            st.markdown(
                                f"<p style='text-align:center;color:{color};"
                                f"font-size:15px;font-weight:700;"
                                f"font-family:monospace;margin-top:2px;'>{label}</p>",
                                unsafe_allow_html=True,
                            )

            st.markdown("---")
            letters = [t for t in tokens if t != "SPACE"]
            unknown = [t for t in letters if not visualizer.is_known_sign(t)]
            c1, c2, c3 = st.columns(3)
            c1.metric("Letters", len(letters))
            c2.metric("Words", tokens.count("SPACE") + 1)
            c3.metric("Missing images", len(unknown))
            if unknown:
                st.caption(f"No image found for: {', '.join(unknown)}")
    else:
        st.markdown("""
        <div style="background:#161b27;border:1px solid #2a2f3d;border-radius:12px;
                    padding:40px;text-align:center;color:#374151;margin-top:16px;">
            <div style="font-size:32px;margin-bottom:12px;">✋</div>
            <div style="font-size:15px;">Type a worddddddddddddddddddddddddddd above to see its signs</div>
        </div>
        """, unsafe_allow_html=True)