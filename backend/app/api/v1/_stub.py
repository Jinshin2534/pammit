"""スタブ応答。DB接続前でもアプリ担当・ハード担当が繋ぎ込みを始められるようにする。

実装が進んだら各ルーターから順に外す。
"""
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))


def now() -> datetime:
    return datetime.now(JST)


PLOTS = [
    {
        "id": 3, "farm_id": 1, "name": "3番ハウス", "area_a": 12.5,
        "latitude": 33.9705, "longitude": 134.3369,
        "cultivation_type": "house", "notes": None,
    },
    {
        "id": 5, "farm_id": 1, "name": "5番畑", "area_a": 30.0,
        "latitude": 33.9688, "longitude": 134.3401,
        "cultivation_type": "open_field", "notes": None,
    },
]

SESSION_CONFIG = {
    "model_version_expected": "sudachi-v0.3",
    "confidence_thresholds": {"high": 0.8, "low": 0.5},
    "judgment_params": {
        "dense_neighbor_count": 4,
        "small_relative_size": 0.7,
        "shaded_overlap_ratio": 0.6,
    },
}
