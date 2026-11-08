"""最初に表示する軽いデータを作る（Claude 改良版）
lro-height-0..3.i16（5760×2880, int16）→ lro-height-low.i16（1440×720, 4×4平均）
moon-color.jpg（8192×4096）→ moon-color-2k.jpg（2048×1024）"""
from pathlib import Path
import numpy as np
from PIL import Image
root = Path(__file__).parent
W, H = 5760, 2880
h = np.concatenate([np.fromfile(root.parent / f'lro-height-{i}.i16', dtype='<i2') for i in range(4)]).reshape(H, W)
low = np.rint(h.reshape(720, 4, 1440, 4).astype(np.float32).mean(axis=(1, 3))).astype('<i2')
low.tofile(root / 'lro-height-low.i16')
Image.open(root.parent / 'moon-color.jpg').resize((2048, 1024), Image.LANCZOS).save(root / 'moon-color-2k.jpg', quality=84, optimize=True)
assert abs(low[360, 700] - h[1440:1444, 2800:2804].mean()) <= .5
print('PASS: lro-height-low.i16 (1440x720) と moon-color-2k.jpg を作成')
