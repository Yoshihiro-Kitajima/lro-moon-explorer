# 月を歩く — LRO版

LROのLOLA全球標高データとLROC月面画像を使う3Dマップ。左ドラッグで回転、ホイールで接近・離脱、右ドラッグで移動。月面をダブルクリックすると地域の立体地形に接近します。起伏の強調、光の方向、標高色分け、座標指定、画像保存に対応。

## かぐや版との差
標高のみをかぐやLALTからLRO/LOLAへ交換。地形生成やマウス操作は共通。月面の表面画像は両版ともLROCの2019年版8Kマップを使用。標高格子は両版とも16 pixel/degree（赤道で約1.9km）。このLRO版を高解像度化したものとは表現しません。

## 出典と加工
- NASA CGI Moon Kit: https://svs.gsfc.nasa.gov/4720/
- 標高: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16.tif
- 画像: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif
- Credit: NASA/GSFC/Scientific Visualization Studio, LRO/LOLA, LROC/ASU.

LOLA TIFFは5760×2880 float32、標高は基準半径1737.4kmに対するkm。元画像の経度範囲-180〜180を、アプリ内の0〜360に列シフト。メートル単位の16bit整数に丸め、4ファイルへ分割。格子の間引きはせず、表示時に双一次補間。全球メッシュは720×360、地域は320×320分割で約480km四方を表示。

表面画像は8192×4096のTIFFからJPEGへ変換。可視化のための色調整と極域補完を含む画像です。起伏1倍は実寸の縦横比、倍率を上げると標高だけを強調します。照明は観察用で、実際の月齢ではありません。微小な岩や着陸機を再現する解像度はありません。

## GitHub Pagesでの表示
Settings → Pages → Deploy from a branch → main → /(root) を選択。
ビルドやAPIキーは不要です。

## ローカル起動・再生成
`python -m http.server 8000` → http://localhost:8000/
Python（numpy・Pillow）で `prepare_data.py` を実行するとNASAの標高を取得して変換・検証します。
描画ライブラリ・月面画像・変換済み標高は同梱済みです。

## 権利表記
アプリのソースコードには独自のオープンソースライセンスを指定していません。
Three.jsはMITライセンス（THREE-LICENSE.txt）。観測データ・画像は上記NASA出典と各提供元の利用条件を参照してください。

## 公開ページの構成（2026-11-09 から）
| URL | 中身 |
|---|---|
| `/` | Claude 改良版（LRO）：すぐ表示・断面図（A・B の標高と差）・日付の太陽・スマホ対応 |
| `/kaguya/` | Claude 改良版（かぐや LALT の標高） |
| `/codex/` | もとの版（Codex で作成） |
| `/claude/` | 以前の URL。トップ `/` へ移動します |

標高データ・8K画像・three.js はリポジトリ直下のものを全版で共有しています。最初に表示する軽いデータは `python prepare_lowres.py` で作り直せます。
