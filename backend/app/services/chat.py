"""AI 相談。OpenAI の関数呼び出しで、質問に応じて農園のデータと知識を引いて答える。

AI が呼べる関数は TOOLS に並べたものだけで、どれもログイン中の人の経営体のデータしか返さない。
"""
import json
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models import ChatMessage, ChatThread, Plot, Schedule, User, WorkLog, WorkSession
from app.services import knowledge, llm
from app.services.field import field_summary

log = logging.getLogger(__name__)
JST = timezone(timedelta(hours=9))
MAX_TOOL_ROUNDS = 4
HISTORY_MESSAGES = 20

SYSTEM = """あなたは、すだち農家のベテランの知識をもとに作業者の相談に乗るアシスタントです。
- 日本語で、短く、具体的に答える
- 農園の状態・予定・作業の記録は、必ず関数で調べてから答える。推測で数字を言わない
- 栽培の知識は search_knowledge で調べる。見つからなければ、一般的な知識だと分かるように答える
- 出典や資料名は書かない
- 農薬の名前や量、灌水の量は断定しない。最終的な判断は畑の様子を見て、農家さんに確かめるよう伝える
- 経験のある人を指すときは「農家さん」と呼ぶ（「経験者」「ベテラン」とは言わない）
- 分からないときは分からないと答える
- 画面にはそのまま文字で出すので、強調の記号（** など）や見出しの記号を使わない
- 写真や画像は受け取れない。見ないと判断できないときは、その場で農家さんに見てもらうよう伝える"""

# 作業中の音声での相談では、答えを帽子から読み上げる。長いと待ち時間も聞く時間も延びる
VOICE_STYLE = """この答えは音声で読み上げます。
- 2〜3文、全部で100字くらいまでにする
- 箇条書き・見出し・記号・絵文字・括弧書き・URL を使わない
- 結論から言う。詳しく知りたければ画面の AI 相談で聞けると添えてもよい"""

TOOLS = [
    {"type": "function", "function": {
        "name": "search_knowledge",
        "description": "すだち栽培についてのベテランの知識、現地調査の記録、作業者が残した気づきを検索する",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "調べたい内容（例: 摘果 混んでいる実の選び方）"}},
            "required": ["query"]},
    }},
    {"type": "function", "function": {
        "name": "get_field_status",
        "description": "農園の土壌水分・気温・明日の天気・灌水の助言を返す。農園名を省くと全農園",
        "parameters": {"type": "object", "properties": {
            "plot_name": {"type": "string", "description": "農園の名前（例: 三番ハウス）"}}},
    }},
    {"type": "function", "function": {
        "name": "get_schedules",
        "description": "指定した期間の作業の予定を返す",
        "parameters": {"type": "object", "properties": {
            "from_date": {"type": "string", "description": "YYYY-MM-DD"},
            "to_date": {"type": "string", "description": "YYYY-MM-DD"}},
            "required": ["from_date", "to_date"]},
    }},
    {"type": "function", "function": {
        "name": "get_work_history",
        "description": "最近の作業の記録（誰が・いつ・どこで・何を・何分）を返す",
        "parameters": {"type": "object", "properties": {
            "days": {"type": "integer", "description": "何日前までさかのぼるか（既定7日）"},
            "plot_name": {"type": "string", "description": "農園の名前で絞り込む"}}},
    }},
]


def _plots(db: Session, farm_id: int, name: str | None) -> list[Plot]:
    plots = list(db.scalars(select(Plot).where(Plot.farm_id == farm_id).order_by(Plot.id)))
    if name:
        matched = [p for p in plots if name in p.name or p.name in name]
        return matched or plots
    return plots


def run_tool(db: Session, user: User, name: str, args: dict) -> object:
    if name == "search_knowledge":
        return knowledge.search(db, user.farm_id, args.get("query", ""))
    if name == "get_field_status":
        return [field_summary(db, p) for p in _plots(db, user.farm_id, args.get("plot_name"))]
    if name == "get_schedules":
        start, end = date.fromisoformat(args["from_date"]), date.fromisoformat(args["to_date"])
        rows = db.scalars(select(Schedule).where(
            Schedule.farm_id == user.farm_id, Schedule.date >= start, Schedule.date <= end).order_by(Schedule.date))
        return [{"date": s.date, "time": [s.start_time, s.end_time], "plot": s.plot.name, "work_types": s.work_types,
                 "assignees": [u.name for u in s.assignees], "note": s.note} for s in rows]
    if name == "get_work_history":
        since = datetime.now(JST).date() - timedelta(days=int(args.get("days") or 7))
        stmt = select(WorkLog).where(WorkLog.farm_id == user.farm_id, WorkLog.worked_on >= since)
        plot_ids = [p.id for p in _plots(db, user.farm_id, args.get("plot_name"))] if args.get("plot_name") else None
        if plot_ids:
            stmt = stmt.where(WorkLog.plot_id.in_(plot_ids))
        return [{"date": w.worked_on, "user": w.user.name, "plot": w.plot.name, "work_type": w.work_type,
                 "minutes": round((w.ended_at - w.started_at).total_seconds() / 60)}
                for w in db.scalars(stmt.order_by(WorkLog.started_at.desc()).limit(50))]
    return {"error": f"不明な関数です: {name}"}


def _context_lines(db: Session, user: User, thread: ChatThread) -> str:
    lines = [f"今日は {datetime.now(JST):%Y-%m-%d} です。", f"相談している人: {user.name}（{user.worker_type or '作業者'}）"]
    if user.worker_type in ("アルバイト", "後継者"):
        lines.append("相手は経験が浅いので、専門用語は言い換えて説明する。")
    if thread.session_id:
        s = db.get(WorkSession, thread.session_id)
        lines.append(f"相手は今 {s.plot.name} で {s.work_type} の作業中です。")
    return "\n".join(lines)


def answer(db: Session, user: User, thread: ChatThread, question: str, voice: bool = False) -> ChatMessage:
    """質問を保存し、回答を作って保存する。"""
    now = datetime.now(timezone.utc)
    db.add(ChatMessage(thread_id=thread.id, role="user", content=question, tools_used=[], created_at=now))
    db.flush()
    content, tools_used = _ask_llm(db, user, thread, voice)
    if content is None:
        db.rollback()  # 答えられなかった質問は残さない
        api_error(503, "ai_unavailable", "AI 相談は今使えません。しばらくしてからもう一度試してください")
    now = datetime.now(timezone.utc)
    reply = ChatMessage(thread_id=thread.id, role="assistant", content=content, tools_used=tools_used, created_at=now)
    db.add(reply)
    thread.updated_at = now
    db.commit()
    return reply


def _ask_llm(db: Session, user: User, thread: ChatThread, voice: bool) -> tuple[str | None, list[str]]:
    if not llm.available():
        return None, []
    history = list(db.scalars(
        select(ChatMessage).where(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.id.desc()).limit(HISTORY_MESSAGES)))[::-1]
    system = SYSTEM + "\n\n" + _context_lines(db, user, thread) + ("\n\n" + VOICE_STYLE if voice else "")
    messages: list[dict] = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    tools_used: list[str] = []
    try:
        client = llm.client()
        for _ in range(MAX_TOOL_ROUNDS):
            res = client.chat.completions.create(**llm.model_options(), messages=messages, tools=TOOLS)
            msg = res.choices[0].message
            if not msg.tool_calls:
                return msg.content, tools_used
            messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
                {"id": c.id, "type": "function", "function": {"name": c.function.name, "arguments": c.function.arguments}}
                for c in msg.tool_calls]})
            for call in msg.tool_calls:
                tools_used.append(call.function.name)
                try:
                    result = run_tool(db, user, call.function.name, json.loads(call.function.arguments or "{}"))
                except Exception as e:  # noqa: BLE001  関数の失敗は AI に伝えて、答えられる範囲で答えさせる
                    result = {"error": str(e)}
                messages.append({"role": "tool", "tool_call_id": call.id,
                                 "content": json.dumps(result, ensure_ascii=False, default=str)})
        return "調べることが多すぎて、答えをまとめられませんでした。質問を短くしてもう一度聞いてください。", tools_used
    except Exception:  # noqa: BLE001
        log.exception("AI 相談の呼び出しに失敗しました")
        return None, []
