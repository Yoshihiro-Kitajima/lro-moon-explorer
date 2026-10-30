from pathlib import Path
import urllib.request, json
import numpy as np
from PIL import Image

root=Path(__file__).parent
rawdir=root/'raw'; rawdir.mkdir(exist_ok=True)
out=root
url='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16.tif'
target=rawdir/'ldem_16.tif'
if not target.exists():
 with urllib.request.urlopen(url,timeout=120) as r, target.with_suffix('.part').open('wb') as f:
  while block:=r.read(1024*1024): f.write(block)
 target.with_suffix('.part').replace(target)
im=Image.open(target)
data=np.array(im,dtype=np.float32)
assert data.shape==(2880,5760) and np.isfinite(data).all()
assert data.min()>-15 and data.max()<15
# NASA TIFF is centered on longitude 0 (-180..180); browser storage uses 0..360.
rolled=np.roll(data,-2880,axis=1)
heights=np.rint(rolled*1000).astype('<i2')
for i,chunk in enumerate(np.split(heights,4)): chunk.tofile(out/f'lro-height-{i}.i16')
meta={'width':5760,'height':2880,'firstLon':0.03125,'firstLat':89.96875,'stepDegrees':0.0625,'unit':'metres','encoding':'int16-le','radiusKm':1737.4,'minKm':float(data.min()),'maxKm':float(data.max()),'source':url,'dataset':'LRO LOLA global gridded elevation, NASA CGI Moon Kit ldem_16.tif','processing':'Floating-point km rounded to integer metres; columns rolled from -180..180 to 0..360 E; native 16 pixels/degree retained. Bilinear interpolation for display.','textureSource':'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif','textureWidth':8192,'textureHeight':4096}
(out/'data.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
# Independently verify longitude relocation and metre conversion against TIFF cells.
for row,col in [(0,0),(1439,2879),(1440,2880),(2879,5759),(1286,2558)]:
 browsercol=(col+2880)%5760
 assert abs(float(heights[row,browsercol])/1000-float(data[row,col]))<=.00051
print(json.dumps(meta),flush=True)
print('PASS: TIFF dimensions, finite range, longitude roll, metre conversion.',flush=True)
