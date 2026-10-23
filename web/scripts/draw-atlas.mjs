import {writeFileSync} from 'node:fs';
const ink='#3d3023',fur='#92613d',face='#e7bb83';
const star=(x,y,r=5)=>{let pts=[];for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.43:r;pts.push(`${x+Math.cos(a)*d},${y+Math.sin(a)*d}`)}return `<polygon points="${pts.join(' ')}" fill="#f6d763" stroke="none"/>`};
function dk(frame){
 const walk=frame===1?-1:frame===2?1:0,jump=frame===3;
 if(frame>=4)return `<g transform="translate(64 74) rotate(${frame===4?10:105}) translate(-64 -74)"><path d="M34 91Q17 70 36 48Q50 32 78 42Q108 47 108 75Q111 103 81 108Q52 119 34 91Z" fill="${fur}"/><path d="M43 52l4-11 10 4 7-7 8 9" fill="${fur}"/><ellipse cx="82" cy="76" rx="21" ry="23" fill="${face}"/><path d="M76 68q8-5 15 1M76 82q9 8 20 1" fill="none"/><circle cx="83" cy="70" r="2.5" fill="${ink}" stroke="none"/><path d="M58 93l-2 17 15-5-6-14" fill="#cf5144"/></g>`;
 return `<g transform="${jump?'translate(-1 -6) rotate(-8 64 78)':'translate(0 0)'}">
 <g transform="rotate(${walk*12+(jump?-28:0)} 49 91)"><path d="M40 85Q30 97 32 109L55 111Q62 111 62 106L52 101L57 86" fill="${fur}"/><path d="M36 107l3 4m5-5 2 5m6-5 1 5"/></g>
 <g transform="rotate(${-walk*12+(jump?24:0)} 74 91)"><path d="M64 85Q60 96 69 108L91 110Q99 109 96 103L81 100L81 83" fill="${fur}"/><path d="M77 104l1 5m7-5 1 5m6-5 1 5"/></g>
 <ellipse cx="60" cy="73" rx="28" ry="31" fill="${fur}"/><ellipse cx="62" cy="81" rx="16" ry="21" fill="#c18c53" stroke="none"/>
 <g transform="rotate(${-walk*16+(jump?48:0)} 40 62)"><path d="M43 54Q25 54 25 72L24 98Q28 107 41 103L47 95L43 90L39 94L42 73L52 65" fill="${fur}"/><path d="M27 96l2 8m4-9 2 8m5-8 1 6"/></g>
 <path d="M57 39l-4-13 14 4 8-10 7 11Q101 31 100 48L111 54Q117 60 108 68L100 75Q84 85 68 72L63 58Q52 54 57 39Z" fill="${fur}"/>
 <ellipse cx="67" cy="49" rx="7" ry="9" fill="${face}"/><path d="M80 44Q86 35 97 41L102 53Q111 50 114 60Q108 75 90 73L79 65Z" fill="${face}"/><path d="M85 43l6-2 7 3" fill="none" stroke-width="4"/><ellipse cx="93" cy="47" rx="2.7" ry="4.2" fill="${ink}" stroke="none"/><path d="M100 60l4 1m-14 5q8 5 15-1" fill="none" stroke-width="2.4"/>
 <path d="M72 66l12 4-6 9-11-7Z" fill="#d45040"/><path d="M76 77l9 9-5 13-13-8 3-13" fill="#d45040"/><path d="M72 84l5 3m-6 1 5 3" stroke="#f9d26c" stroke-width="2"/>
 <g transform="rotate(${walk*18+(jump?-72:0)} 80 70)"><path d="M82 65Q92 65 91 81L94 93Q109 93 110 102L105 107L89 103Q80 95 77 83" fill="${fur}"/><path d="M98 99l-2 6m7-5-2 6"/></g></g>`;
}
function diddy(frame){
 const walk=frame===1?-1:frame===2?1:0,jump=frame===3;
 if(frame>=4)return `<g transform="translate(64 78) rotate(${frame===4?15:110}) translate(-64 -78)"><path d="M40 83Q14 93 17 67Q16 51 30 57" fill="none" stroke="${fur}" stroke-width="7"/><ellipse cx="67" cy="79" rx="29" ry="29" fill="${fur}"/><path d="M48 89Q61 106 84 94L84 105Q61 117 43 98Z" fill="#d65348"/><ellipse cx="82" cy="75" rx="15" ry="19" fill="${face}"/><path d="M67 58Q80 45 94 60L103 65 77 65Z" fill="#d65348"/><circle cx="87" cy="72" r="2.6" fill="${ink}" stroke="none"/>${star(64,102,5)}</g>`;
 return `<g transform="${jump?'translate(0 -7) rotate(-6 66 80)':'translate(0 0)'}"><path d="M50 89Q21 109 15 82Q10 59 29 58" fill="none" stroke="${ink}" stroke-width="9"/><path d="M50 89Q21 109 15 82Q10 59 29 58" fill="none" stroke="${fur}" stroke-width="5"/>
 <g transform="rotate(${walk*20+(jump?25:0)} 57 91)"><path d="M47 86L43 106Q44 113 54 112L69 111 70 105 58 102 62 88" fill="${fur}"/><path d="M57 107l1 5m6-5 1 4"/></g>
 <g transform="rotate(${-walk*20+(jump?-32:0)} 74 91)"><path d="M69 88L70 106Q74 114 85 112L98 111 99 105 84 102 83 85" fill="${fur}"/><path d="M85 107l1 4m6-5 1 5"/></g>
 <path d="M51 59Q62 52 78 61L86 91Q73 105 47 92L45 73Z" fill="#d65348"/>${star(65,78,7)}${star(56,88,4)}
 <g transform="rotate(${-walk*18+(jump?55:0)} 48 66)"><path d="M49 63Q36 59 35 73L34 95 28 102 34 106 45 99 48 77 54 70" fill="${fur}"/></g>
 <path d="M58 38Q65 23 84 31Q103 30 102 48L109 54Q115 63 105 69Q89 77 77 66L65 61Z" fill="${fur}"/>
 <ellipse cx="63" cy="49" rx="9" ry="11" fill="${face}"/><ellipse cx="63" cy="49" rx="4" ry="5" fill="#bf8158" stroke="none"/><path d="M81 40Q92 33 99 43L99 51Q113 49 113 59Q109 69 94 70L82 62Z" fill="${face}"/><ellipse cx="96" cy="46" rx="2.7" ry="4.5" fill="${ink}" stroke="none"/><path d="M103 58l4 1m-13 5q9 4 13-1" fill="none" stroke-width="2"/>
 <path d="M60 36Q62 18 81 22Q98 21 100 35L115 38 116 43Q97 44 79 37Z" fill="#d65348"/><path d="M80 25v8" stroke="#b94338" stroke-width="2"/>
 <g transform="rotate(${walk*18+(jump?-58:0)} 79 68)"><path d="M79 63Q89 64 88 76L95 91 106 93 109 99 102 104 91 99 79 83 74 71" fill="${fur}"/><path d="M99 96l-3 5m7-3-2 5"/></g></g>`;
}
let groups='';for(let row=0;row<2;row++)for(let f=0;f<6;f++)groups+=`<g transform="translate(${f*128} ${row*128})" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${row?diddy(f):dk(f)}</g>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256" viewBox="0 0 768 256"><defs><filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence baseFrequency=".09" numOctaves="2" seed="4" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale=".65" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g filter="url(#pencil)">${groups}</g></svg>`;
writeFileSync(new URL('../public/art/kong-atlas.svg',import.meta.url),svg);console.log('Atlas SVG: 12 poses, transparent, editable source.');
