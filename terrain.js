export const RADIUS=1737.4, WIDTH=5760, HEIGHT=2880;
export function heightAt(data,lat,lon,w=WIDTH,h=HEIGHT){
 const ppd=w/360,x=((lon%360+360)%360)*ppd-.5;
 const y=Math.max(0,Math.min(h-1,(90-lat)*ppd-.5));
 const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi;
 const a=((xi%w)+w)%w,b=(a+1)%w,yy=Math.min(yi+1,h-1);
 return ((data[yi*w+a]*(1-fx)+data[yi*w+b]*fx)*(1-fy)+(data[yy*w+a]*(1-fx)+data[yy*w+b]*fx)*fy)/1000;
}
export function lonLat(x,y,z){const r=Math.hypot(x,y,z);return {lat:Math.asin(Math.max(-1,Math.min(1,y/r)))*180/Math.PI,lon:Math.atan2(x,z)*180/Math.PI};}
