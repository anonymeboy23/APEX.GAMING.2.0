/* DONNÉES DU CATALOGUE : prix de base, produits et coordonnées de contact.
   Marge, promotions, stock et moyens de paiement sont chargés depuis Supabase. */

/* ===== RÉGLAGES : modifie ici ===== */
const S={
 wa:"243973511943",phone:"0973511943",ig:"kaghoma06",sn:"kaghoma06",
 margin:0.60, round:1,
 pay:[["M-Pesa","XXX XXX XXX"],["Airtel Money","XXX XXX XXX"],["Orange Money","XXX XXX XXX"]]
};
// rate = valeur de la devise en dollars (à mettre à jour). cn(pays, code, symbole, rate, montants)
const cn=(n,c,s,r,k)=>({n,c,s,r,k});
const EU=[cn("France","FR","€",1.10,[10,25,50,75,100]),cn("Allemagne","DE","€",1.10,[10,25,50,75,100]),cn("Espagne","ES","€",1.10,[10,25,50,75,100]),cn("Italie","IT","€",1.10,[10,25,50,75,100]),cn("Belgique","BE","€",1.10,[10,25,50,75,100]),cn("Royaume-Uni","GB","£",1.30,[10,25,50,100])];
const us=k=>[{l:"",c:null,list:[cn("Compte USA","US","$",1,k)]}];
const P=[
{id:"psn",n:"PlayStation",d:"Cartes PSN",c:["#2a5cff","#0b2180"],g:[
 {l:"Amérique",c:["#e03b2c","#a3123a"],list:[cn("États-Unis","US","$",1,[10,25,50,75,100]),cn("Canada","CA","CA$",.73,[10,25,50,100])]},
 {l:"Europe",c:["#2a5cff","#0b2180"],list:EU}]},
{id:"spotify",n:"Spotify",d:"Premium et musique",c:["#0f8a43","#075a2b"],g:us([10,30,60])},
{id:"apple",n:"Apple Music",d:"Apple Music, App Store, iTunes",c:["#e8304d","#a40f3a"],g:us([10,25,50,100])},
{id:"netflix",n:"Netflix",d:"Films et séries",c:["#e50914","#7a0610"],g:us([25,50,100])},
{id:"xbox",n:"Xbox",d:"Jeux et Game Pass",c:["#4c8b1f","#25470f"],g:us([10,25,50,100])},
{id:"steam",n:"Steam",d:"Jeux PC",c:["#2a475e","#101d29"],g:us([20,50,100])},
{id:"google",n:"Google Play",d:"Apps et jeux Android",c:["#0a8f8a","#115a8c"],g:us([10,25,50,100])}
];