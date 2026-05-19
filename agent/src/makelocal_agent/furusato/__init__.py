"""Slice 5: 楽天ふるさと納税連動。

3 層分離:
  YAML (キュレーション)  →  refresh CLI が楽天 API を叩く  →  Firestore キャッシュ
                                                                ↑
                                          agent runtime / Web SDK は **read のみ**
"""
