# 月を歩く かぐや版（Claude 改良版）

公開URL：https://yoshihiro-kitajima.github.io/lro-moon-explorer/kaguya/

`claude/`（LRO版）と同じプログラムで、標高データだけをかぐや LALT 全球標高図 V2.0（ISAS/JAXA）に替えた版です。
- `kaguya-height-0〜3.i16`：もとのかぐや版サイトと同じ変換済みデータ（5760×2880、int16、メートル、経度0〜360°）
- `kaguya-height-low.i16`：最初に表示する軽いデータ（1440×720、4×4平均）
- three.js・8K画像は `../`、2K画像は `../claude/` から共有

確認：LRO/LOLA との相関 0.9986（極域除く）、経度ずれ 0 画素、差の平均 2 m・標準偏差 122 m。
