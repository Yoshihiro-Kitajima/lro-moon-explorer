export const RADIUS=1737.4, WIDTH=5760, HEIGHT=2880;
export function heightAt(data,lat,lon){
 const x=((lon%360+360)%360)*16-.5;
 const y=Math.max(0,Math.min(HEIGHT-1,(90-lat)*16-.5));
 const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi;
 const a=((xi%WIDTH)+WIDTH)%WIDTH,b=(a+1)%WIDTH,yy=Math.min(yi+1,HEIGHT-1);
 return ((data[yi*WIDTH+a]*(1-fx)+data[yi*WIDTH+b]*fx)*(1-fy)+(data[yy*WIDTH+a]*(1-fx)+data[yy*WIDTH+b]*fx)*fy)/1000;
}
export function lonLat(x,y,z){const r=Math.hypot(x,y,z);return {lat:Math.asin(Math.max(-1,Math.min(1,y/r)))*180/Math.PI,lon:Math.atan2(x,z)*180/Math.PI};}
