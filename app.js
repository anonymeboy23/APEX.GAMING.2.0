/* LOGIQUE DU SITE : panier, pages et navigation. Tu n'as normalement pas besoin de modifier ce fichier. */

/* ===== OUTILS ===== */
const $=id=>document.getElementById(id);
const price=c=>Math.ceil(c*(1+S.margin)/S.round)*S.round;
const m=n=>(Number.isInteger(n)?n:n.toFixed(2))+" $";
let cart={},admin=false,favorites=[],orders=[],reviews=[],inventory={},promo={code:"",percent:0,enabled:false},profile={name:"",phone:"",email:""},orderLookup=null,appliedPromo="",shopQuery="",shopSort="featured",shopRegion="all",recentProducts=[],theme="";
try{cart=JSON.parse(localStorage.getItem("apexcart")||"{}");admin=localStorage.getItem("apexadm")=="1";favorites=JSON.parse(localStorage.getItem("apexfavorites")||"[]");orders=JSON.parse(localStorage.getItem("apexorders")||"[]");reviews=JSON.parse(localStorage.getItem("apexreviews")||"[]");inventory=JSON.parse(localStorage.getItem("apexinventory")||"{}");promo=JSON.parse(localStorage.getItem("apexpromo")||'{"code":"","percent":0,"enabled":false}');profile=JSON.parse(localStorage.getItem("apexprofile")||'{"name":"","phone":"","email":""}');recentProducts=JSON.parse(localStorage.getItem("apexrecent")||"[]");theme=localStorage.getItem("apextheme")||""}catch(e){}
const save=()=>{try{localStorage.setItem("apexcart",JSON.stringify(cart))}catch(e){}};
const saveFavorites=()=>{try{localStorage.setItem("apexfavorites",JSON.stringify(favorites))}catch(e){}};
const saveRecent=()=>{try{localStorage.setItem("apexrecent",JSON.stringify(recentProducts))}catch(e){}};
const saveOrders=()=>{try{localStorage.setItem("apexorders",JSON.stringify(orders))}catch(e){}};
const saveInventory=()=>{try{localStorage.setItem("apexinventory",JSON.stringify(inventory))}catch(e){}};
const savePromo=()=>{try{localStorage.setItem("apexpromo",JSON.stringify(promo))}catch(e){}};
const saveProfile=()=>{try{localStorage.setItem("apexprofile",JSON.stringify(profile))}catch(e){}};
const saveReviews=()=>{try{localStorage.setItem("apexreviews",JSON.stringify(reviews))}catch(e){}};
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isFavorite=id=>favorites.includes(id);
function toggleFavorite(id){favorites=isFavorite(id)?favorites.filter(x=>x!==id):[...favorites,id];saveFavorites();toast(isFavorite(id)?"Ajouté aux favoris":"Retiré des favoris");draw(true)}
function toast(message){const el=$("toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2200)}
function toggleTheme(){theme=theme=="dark"?"light":theme=="light"?"":"dark";try{localStorage.setItem("apextheme",theme)}catch(e){};applyTheme()}
function applyTheme(){document.documentElement.dataset.theme=theme;if($("themeToggle"))$("themeToggle").textContent=theme=="dark"?"☀":theme=="light"?"☾":"◐"}
function rememberProduct(id){recentProducts=[id,...recentProducts.filter(x=>x!==id)].slice(0,4);saveRecent()}
const stockFor=id=>Number.isFinite(Number(inventory[id]))?Math.max(0,Number(inventory[id])):100;
const discount=()=>appliedPromo&&promo.enabled&&promo.code&&promo.percent>0?Math.min(total(),total()*promo.percent/100):0;
const finalTotal=()=>total()-discount();
function applyPromo(){const input=$("promoCode"),value=input?input.value.trim().toUpperCase():"";if(!promo.enabled||!promo.code||value!==promo.code.toUpperCase()){toast("Code promotion invalide");return}appliedPromo=value;toast("Promotion appliquée");draw(true)}
function saveCustomerProfile(event){event.preventDefault();const form=event.currentTarget;profile={name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim(),email:form.elements.email.value.trim()};saveProfile();toast("Profil enregistré");location.hash="#/"}
function submitReview(event){event.preventDefault();const form=event.currentTarget,name=form.elements.reviewName.value.trim(),message=form.elements.reviewMessage.value.trim(),rating=Number(form.elements.reviewRating.value);if(name.length<2||message.length<8||rating<1||rating>5){toast("Complète ton avis correctement");return}reviews.unshift({name,message,rating,createdAt:new Date().toISOString()});reviews=reviews.slice(0,30);saveReviews();toast("Merci pour ton avis");form.reset();draw(true)}
async function lookupOrder(){const id=$("lookupId").value.trim().toUpperCase(),phone=$("lookupPhone").value.trim();if(!id||!phone){toast("Indique la référence et le numéro WhatsApp");return}try{const response=await fetch(`/api/orders/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`);const result=await response.json();if(!response.ok)throw new Error(result.error);orderLookup=result.order;draw(true)}catch(e){orderLookup=null;toast("Commande introuvable ou suivi indisponible")}}
const CONFIG_KEY="apexadminconfig";
function loadAdminConfig(){
 try{
  const saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||"null");
  if(!saved||typeof saved!=="object")return;
  if(Number.isFinite(saved.margin)&&saved.margin>=0&&saved.margin<=5)S.margin=saved.margin;
  if(Array.isArray(saved.pay)&&saved.pay.length&&saved.pay.every(p=>Array.isArray(p)&&typeof p[0]=="string"&&typeof p[1]=="string"))S.pay=saved.pay;
  if(Array.isArray(saved.disabledProducts))P.forEach(p=>p.disabled=saved.disabledProducts.includes(p.id));
 }catch(e){}
}
loadAdminConfig();
function persistAdminConfig(){
 try{localStorage.setItem(CONFIG_KEY,JSON.stringify({margin:S.margin,pay:S.pay,disabledProducts:P.filter(p=>p.disabled).map(p=>p.id)}))}
 catch(e){alert("Impossible d’enregistrer les réglages dans ce navigateur.");}
}
function saveAdminSettings(event){
 event.preventDefault();
 const form=event.currentTarget,margin=Number(form.elements.margin.value)/100;
 const rows=[...form.querySelectorAll(".admin-pay-row")];
 const pay=rows.map(row=>[row.querySelector('[name="payName"]').value.trim(),row.querySelector('[name="payNumber"]').value.trim()]);
 if(!Number.isFinite(margin)||margin<0||margin>5){alert("La marge doit être comprise entre 0 et 500 %.");return}
 if(!pay.length||pay.some(p=>!p[0]||!p[1])){alert("Garde au moins un moyen de paiement et complète tous les champs.");return}
 if(pay.some(p=>p[0].length>40||p[1].length>60)){alert("Les noms sont limités à 40 caractères et les numéros à 60.");return}
 S.margin=margin;S.pay=pay;
 P.forEach(p=>{p.disabled=!form.querySelector(`[name="product-${p.id}"]`).checked;const field=form.querySelector(`[name="stock-${p.id}"]`);if(field)inventory[p.id]=Math.max(0,Math.floor(Number(field.value)||0))});
 const promoCode=form.elements.promoCode.value.trim().toUpperCase(),promoPercent=Number(form.elements.promoPercent.value)||0;
 if(promoPercent<0||promoPercent>90){alert("La promotion doit être comprise entre 0 et 90 %.");return}
 promo={code:promoCode,percent:promoPercent,enabled:Boolean(promoCode&&promoPercent)};appliedPromo="";
 saveInventory();savePromo();persistAdminConfig();toast("Réglages enregistrés");draw();
}
function addPaymentRow(){
 const list=$("adminPayments"),row=document.createElement("div");
 row.className="admin-pay-row";
 row.innerHTML='<label class="f">Moyen<input name="payName" maxlength="40" required></label><label class="f">Numéro / identifiant<input name="payNumber" maxlength="60" required></label><button class="btn l" type="button" aria-label="Supprimer ce moyen de paiement" onclick="this.closest(\'.admin-pay-row\').remove()">Supprimer</button>';
 list.appendChild(row);
}
function exitAdmin(){admin=false;try{localStorage.setItem("apexadm","0")}catch(e){}location.hash="#/";}
const items=()=>Object.values(cart);
const count=()=>items().reduce((s,i)=>s+i.q,0);
const total=()=>items().reduce((s,i)=>s+i.q*i.p,0);
const style=c=>`style="--c1:${c[0]};--c2:${c[1]}"`;
const PAGES=[["","Accueil"],["boutique","Boutique"],["commander","Comment commander"],["paiement","Paiement"],["pourquoi","Pourquoi nous"],["apropos","Qui sommes-nous"],["faq","FAQ"],["commandes","Mes commandes"],["profil","Mon profil"]];
const REVIEWS=[];
const PRODUCT_INFO={
 psn:{about:"Recharge ton compte PlayStation avec une carte adaptée à sa région.",activation:"PlayStation Store",tip:"Vérifie le pays de ton compte avant de choisir une carte."},
 spotify:{about:"Active un abonnement Spotify Premium ou recharge ton compte musique.",activation:"Compte Spotify",tip:"Le compte doit pouvoir utiliser le pays associé à la carte."},
 apple:{about:"Crédite Apple Music, l'App Store ou ton solde iTunes.",activation:"Apple ID",tip:"La région de ton Apple ID doit correspondre à la carte."},
 netflix:{about:"Profite de films et séries avec une carte cadeau Netflix.",activation:"Compte Netflix",tip:"Vérifie la devise et le pays acceptés par ton compte."},
 xbox:{about:"Achète des jeux, du Game Pass ou du contenu Xbox.",activation:"Compte Microsoft/Xbox",tip:"Utilise une région compatible avec ton compte Microsoft."},
 steam:{about:"Ajoute du crédit à ton portefeuille Steam pour tes jeux PC.",activation:"Compte Steam",tip:"La région de ton portefeuille doit être compatible."},
 google:{about:"Achète des applications, jeux et contenus Google Play.",activation:"Compte Google",tip:"La région Google Play doit correspondre au pays de la carte."}
};
const ORDER_STATUSES=["En attente de confirmation","Paiement confirmé","En préparation","Livrée","Annulée"];
function updateOrderStatus(id,status){const order=orders.find(o=>o.id===id);if(!order)return;order.status=status;saveOrders();toast("Statut de commande mis à jour");draw(true)}
$("fl").innerHTML=PAGES.concat([["avis","Avis clients"],["conditions","Conditions générales"],["confidentialite","Confidentialité"],["remboursement","Remboursement"]]).map(p=>`<li><a href="#/${p[0]}">${p[1]}</a></li>`).join("");
$("fw").href="https://wa.me/"+S.wa;$("fw").textContent="WhatsApp : "+S.phone;
$("fi").href="https://www.instagram.com/"+S.ig;$("fi").textContent="Instagram : "+S.ig;
$("fs").href="https://www.snapchat.com/add/"+S.sn;$("fs").textContent="Snapchat : "+S.sn;
$("bg").onclick=()=>{const o=$("nav").classList.toggle("o");$("bg").setAttribute("aria-expanded",o)};

/* ===== PANIER ===== */
function add(pi,gi,ci,face,d){
 const p=P[pi],g=p.g[gi],c=g.list[ci],k=[p.id,c.c,c.n,face].join("|");
 if(!cart[k])cart[k]={productId:p.id,region:c.c||"",t:p.n+(g.l?" "+g.l:"")+" "+c.n,s:c.s,f:face,p:price(face*c.r),q:0};
 cart[k].q=Math.min(stockFor(p.id),Math.max(0,cart[k].q+d));if(!cart[k].q)delete cart[k];
 save();draw(true);
}
function chg(k,d){cart[k].q=Math.max(0,cart[k].q+d);if(!cart[k].q)delete cart[k];save();draw(true)}
function clearCart(){if(!count())return;if(confirm("Vider tout le panier ?")){cart={};save();draw();toast("Panier vidé")}}
function send(){
 const n=$("nm").value.trim(),phone=$("phone").value.trim(),email=$("email").value.trim(),note=$("note").value.trim();
 if(!n||!phone){toast("Indique ton nom et ton numéro WhatsApp");return}
 profile={name:n,phone,email};saveProfile();
 const order="AG-"+Date.now().toString(36).toUpperCase();
 const orderItems=items().map(i=>({productId:i.productId||"",region:i.region||"",name:i.t,face:i.f,symbol:i.s,quantity:i.q,price:i.p}));
 orderItems.forEach(i=>{if(i.productId)inventory[i.productId]=Math.max(0,stockFor(i.productId)-i.quantity)});saveInventory();
 orders.unshift({id:order,createdAt:new Date().toISOString(),status:"En attente de confirmation",name:n,phone,email,note,total:finalTotal(),discount:discount(),payment:$("py").value,items:orderItems});orders=orders.slice(0,20);saveOrders();
 const t=["Bonjour Apex Gaming, je voudrais commander :","","Référence : "+order,...items().map(i=>`- ${i.q} x ${i.t} ${i.f} ${i.s} = ${m(i.q*i.p)}`),"",discount()?"Promotion : - "+m(discount()):"","Total : "+m(finalTotal()),"Paiement par : "+$("py").value,"Nom : "+n,"WhatsApp : "+phone].concat(email?["Email : "+email]:[],note?["Note : "+note]:[]).join("\n");
 const payload={id:order,name:n,phone,email,note,total:finalTotal(),items:orderItems.map(i=>({productId:i.productId,region:i.region,faceValue:Number(i.face),quantity:i.quantity,unitPrice:i.price}))};
 const whatsappWindow=window.open("https://wa.me/"+S.wa+"?text="+encodeURIComponent(t),"_blank");
 syncOrder(payload);
}
async function syncOrder(payload){try{const response=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(response.ok)toast("Commande enregistrée")}catch(e){/* WhatsApp reste le canal de secours. */}}

/* ===== PAGES ===== */
let sel={g:0,c:0};
const head=(t,p,c)=>`<section class="ph" ${c?style(c):""}><div class="w"><h1>${t}</h1><p>${p}</p></div></section>`;
const gcMini=(c,a,b,n)=>`<div class="gc mini" ${style(c)}><div class="gt"><span>Carte cadeau</span><span>${n}</span></div><div class="gf">${a}<small>${b}</small></div></div>`;
const lowestPrice=p=>price(Math.min(...p.g.flatMap(g=>g.list.map(c=>c.k[0]*c.r))));
const tiles=(list=P)=>`<div class="tiles">${list.filter(p=>!p.disabled).map(p=>`<a class="tile" href="#/p/${p.id}" ${style(p.c)}><span class="tile-top"><small>${isFavorite(p.id)?"★ Favori":""}</small><button class="tile-fav" type="button" aria-label="${isFavorite(p.id)?"Retirer des favoris":"Ajouter aux favoris"}" onclick="event.preventDefault();toggleFavorite('${p.id}')">${isFavorite(p.id)?"★":"☆"}</button></span><h3>${p.n}</h3><span>${p.d} · dès ${m(lowestPrice(p))}</span><small class="availability">${stockFor(p.id)>0?"Disponible · livraison digitale":"Rupture temporaire"}</small></a>`).join("")||"<p>Aucun produit ne correspond à ta recherche.</p>"}</div>`;
const matchingProducts=()=>{let list=P.filter(p=>!p.disabled&&(!shopQuery||[p.n,p.d,p.id].join(" ").toLowerCase().includes(shopQuery.toLowerCase())));if(shopRegion!=="all")list=list.filter(p=>p.g.some(g=>g.list.some(c=>c.c===shopRegion)));if(shopSort==="price-up")list.sort((a,b)=>lowestPrice(a)-lowestPrice(b));if(shopSort==="price-down")list.sort((a,b)=>lowestPrice(b)-lowestPrice(a));if(shopSort==="name")list.sort((a,b)=>a.n.localeCompare(b.n));return list};
const steps=`<ol class="st"><li><h3>Choisis ta carte</h3><p>Produit, région ou pays, et montant.</p></li><li><h3>Ajoute au panier</h3><p>Le prix en dollars est affiché avant de commander.</p></li><li><h3>Envoie sur WhatsApp</h3><p>Ta commande s'écrit toute seule. Tu n'as qu'à l'envoyer.</p></li><li><h3>Paie et reçois ton code</h3><p>Après confirmation du paiement, on t'envoie le code.</p></li></ol>`;

const R={
"":()=>`<section class="hero"><div class="w hg"><div><h1>Cartes cadeaux PlayStation, Spotify, Apple Music et plus</h1><p>Choisis ta carte, vois le prix tout de suite, et envoie ta commande sur WhatsApp en un clic.</p><a class="btn" href="#/boutique">Voir la boutique</a> <a class="btn l" href="#/commander">Comment commander</a></div>
<div class="fan" aria-hidden="true">${gcMini(P[0].g[0].c,10,"$","US")}${gcMini(P[1].c,30,"$","Spotify")}${gcMini(P[3].c,50,"$","Netflix")}</div></div></section>
<section class="sec"><div class="w"><h2>Nos cartes</h2><p class="ld">Sept marques, chacune avec ses montants et ses prix.</p>${tiles()}</div></section>
<section class="sec s"><div class="w"><div class="trust-grid"><div class="trust-card"><span class="trust-icon">✓</span><div><h3>Prix affichés</h3><p>Tu connais le montant avant de commander.</p></div></div><div class="trust-card"><span class="trust-icon">⚡</span><div><h3>Livraison digitale</h3><p>Les codes sont envoyés après confirmation.</p></div></div><div class="trust-card"><span class="trust-icon">◆</span><div><h3>Régions vérifiées</h3><p>Les pays et régions sont clairement indiqués.</p></div></div><div class="trust-card"><span class="trust-icon">◌</span><div><h3>Support direct</h3><p>Une vraie conversation sur WhatsApp.</p></div></div></div></div></section>
${recentProducts.length?`<section class="sec s"><div class="w"><h2>Reprendre ma recherche</h2><p class="ld">Les dernières marques que tu as consultées.</p>${tiles(P.filter(p=>recentProducts.includes(p.id)).sort((a,b)=>recentProducts.indexOf(a.id)-recentProducts.indexOf(b.id)))}</div></section>`:""}
${!P.find(p=>p.id=="psn").disabled?`<section class="sec s"><div class="w"><h2>PlayStation : choisis ta région</h2><p class="ld">Une carte PSN ne marche que sur un compte de la même région.</p>
<div class="tiles rg"><a class="tile" href="#/p/psn/0" ${style(P[0].g[0].c)}><h3>Amérique</h3><span>États-Unis, Canada</span></a><a class="tile" href="#/p/psn/1" ${style(P[0].g[1].c)}><h3>Europe</h3><span>France, Allemagne, Espagne, Italie, Belgique, Royaume-Uni</span></a></div></div></section>
`:""}
<section class="sec"><div class="w"><h2>Comment ça marche</h2><p class="ld">Quatre étapes, sans créer de compte.</p>${steps}<p style="margin-top:22px"><a class="btn d" href="#/commander">Voir le guide</a></p></div></section>
<section class="sec s"><div class="w"><h2>Paiements acceptés</h2><div class="ch" style="margin:14px 0 22px">${S.pay.map(p=>`<span>${escapeHtml(p[0])}</span>`).join("")}</div><a class="btn d" href="#/paiement">Détails du paiement</a></div></section>`,

 boutique:()=>{const results=matchingProducts();return head("Boutique","Recherche une marque, compare les régions et ajoute tes cartes au panier.")+`<section class="sec"><div class="w"><div class="shop-tools"><label class="search"><span>Rechercher</span><input type="search" value="${escapeHtml(shopQuery)}" placeholder="PlayStation, Spotify, Netflix..." oninput="shopQuery=this.value;draw(true)"></label><label class="filter"><span>Région</span><select onchange="shopRegion=this.value;draw(true)"><option value="all" ${shopRegion==="all"?"selected":""}>Toutes</option><option value="US" ${shopRegion==="US"?"selected":""}>USA</option><option value="CA" ${shopRegion==="CA"?"selected":""}>Canada</option><option value="FR" ${shopRegion==="FR"?"selected":""}>France</option><option value="GB" ${shopRegion==="GB"?"selected":""}>Royaume-Uni</option></select></label><label class="filter"><span>Trier par</span><select onchange="shopSort=this.value;draw(true)"><option value="featured" ${shopSort==="featured"?"selected":""}>Recommandés</option><option value="price-up" ${shopSort==="price-up"?"selected":""}>Prix croissant</option><option value="price-down" ${shopSort==="price-down"?"selected":""}>Prix décroissant</option><option value="name" ${shopSort==="name"?"selected":""}>Nom</option></select></label><button class="btn l" type="button" onclick="shopQuery='';shopRegion='all';shopSort='featured';draw()">Réinitialiser</button></div><p class="result-count">${results.length} marque${results.length>1?"s":""} disponible${results.length>1?"s":""}</p>${tiles(results)}</div></section>`},
 favoris:()=>head("Mes favoris","Retrouve rapidement les marques que tu consultes le plus.")+`<section class="sec"><div class="w">${favorites.length?tiles(P.filter(p=>favorites.includes(p.id))):`<div class="empty"><h2>Aucun favori</h2><p>Ajoute des marques à tes favoris depuis la boutique.</p><a class="btn d" href="#/boutique">Explorer la boutique</a></div>`}</div></section>`,
 faq:()=>head("Questions fréquentes","Les réponses essentielles avant de commander.")+`<section class="sec"><div class="w faq"><details open><summary>Combien de temps faut-il pour recevoir le code ?</summary><p>La commande est traitée après confirmation du paiement. Le délai exact est confirmé sur WhatsApp.</p></details><details><summary>Une carte PlayStation fonctionne-t-elle partout ?</summary><p>Non. La région et parfois le pays doivent correspondre à ton compte. Vérifie toujours la région avant de payer.</p></details><details><summary>Puis-je mélanger plusieurs marques ?</summary><p>Oui. Ajoute plusieurs cartes au même panier puis envoie une seule commande WhatsApp.</p></details><details><summary>Puis-je annuler une commande ?</summary><p>Contacte-nous immédiatement sur WhatsApp avant la livraison du code.</p></details><details><summary>Pourquoi le paiement se fait-il sur WhatsApp ?</summary><p>Nous confirmons manuellement la disponibilité, le montant et le moyen de paiement avant l'envoi du code.</p></details></div></section>`,
 avis:()=>head("Avis clients","Partage ton expérience avec la communauté Apex Gaming.")+`<section class="sec"><div class="w"><div class="review-grid">${reviews.length?reviews.map(r=>`<article class="review"><div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><p>“${escapeHtml(r.message)}”</p><b>${escapeHtml(r.name)}</b></article>`).join(""):`<div class="empty"><h2>Pas encore d'avis</h2><p>Sois le premier à partager ton expérience.</p></div>`}</div><div class="review-form-box"><h2>Écrire un avis</h2><form class="review-form" onsubmit="submitReview(event)"><label class="f">Ton nom<input name="reviewName" maxlength="50" required></label><label class="f">Note<select name="reviewRating"><option value="5">5 étoiles</option><option value="4">4 étoiles</option><option value="3">3 étoiles</option><option value="2">2 étoiles</option><option value="1">1 étoile</option></select></label><label class="f">Ton message<textarea name="reviewMessage" rows="4" maxlength="500" required></textarea></label><button class="btn d" type="submit">Publier mon avis</button></form><p class="admin-note">Les avis pourront être modérés et validés depuis l’administration centralisée.</p></div></div></section>`,
 commandes:()=>head("Mes commandes","Retrouve tes commandes locales ou vérifie une référence centralisée.")+`<section class="sec"><div class="w"><div class="lookup-box"><h2>Suivre une commande</h2><p class="ld">Entre la référence reçue et le numéro utilisé sur WhatsApp.</p><div class="checkout-grid"><label class="f">Référence<input id="lookupId" placeholder="AG-..." value="${orderLookup?escapeHtml(orderLookup.id):""}"></label><label class="f">Numéro WhatsApp<input id="lookupPhone" placeholder="0973..." value="${escapeHtml(profile.phone)}"></label></div><button class="btn d" type="button" onclick="lookupOrder()">Vérifier le statut</button>${orderLookup?`<div class="lookup-result"><b>${escapeHtml(orderLookup.id)}</b><span>${escapeHtml(orderLookup.status)} · ${m(orderLookup.total)}</span></div>`:""}</div>${orders.length?`<div class="orders">${orders.map(o=>`<article class="order-card"><div class="order-head"><b>${escapeHtml(o.id)}</b><span>${new Date(o.createdAt).toLocaleDateString("fr-FR")}</span></div><p>${escapeHtml(o.status)} · ${m(o.total)}</p><small>${o.items.map(i=>`${i.quantity} × ${escapeHtml(i.name)} ${i.face}${i.symbol}`).join(" · ")}</small></article>`).join("")}</div>`:`<div class="empty"><h2>Aucune commande locale</h2><p>Une commande apparaîtra ici après son envoi vers WhatsApp.</p><a class="btn d" href="#/boutique">Voir la boutique</a></div>`}</div></section>`,
 profil:()=>head("Mon profil","Enregistre tes coordonnées pour commander plus rapidement.")+`<section class="sec"><div class="w profile-box"><form class="profile-form" onsubmit="saveCustomerProfile(event)"><label class="f">Nom complet<input name="name" value="${escapeHtml(profile.name)}" autocomplete="name" required></label><label class="f">Numéro WhatsApp<input name="phone" value="${escapeHtml(profile.phone)}" autocomplete="tel" required></label><label class="f">Email (facultatif)<input name="email" type="email" value="${escapeHtml(profile.email)}" autocomplete="email"></label><button class="btn d" type="submit">Enregistrer mon profil</button></form><p class="admin-note">Ces informations sont conservées uniquement dans ce navigateur jusqu'à la connexion d'un vrai compte client.</p></div></section>`,
 conditions:()=>head("Conditions générales","Les règles de fonctionnement d'Apex Gaming.")+`<section class="sec"><div class="w pr"><h2>Commande</h2><p>Les prix affichés sont indicatifs jusqu'à la confirmation de la disponibilité et du montant sur WhatsApp.</p><h2>Paiement</h2><p>Le paiement est effectué uniquement après confirmation de la commande. Vérifie toujours le numéro communiqué avant tout transfert.</p><h2>Codes numériques</h2><p>Un code livré ne peut généralement pas être repris ou échangé s'il a été utilisé ou communiqué à un tiers.</p></div></section>`,
 confidentialite:()=>head("Confidentialité","Comment nous utilisons tes informations.")+`<section class="sec"><div class="w pr"><h2>Données collectées</h2><p>Le nom, le numéro WhatsApp, l'email facultatif et les détails de commande servent uniquement à traiter ta demande.</p><h2>Stockage local</h2><p>Le panier, les favoris et l'historique sont enregistrés dans le navigateur. Ils ne sont pas synchronisés entre appareils.</p><h2>Contact</h2><p>Pour demander une correction ou une suppression, contacte Apex Gaming sur WhatsApp.</p></div></section>`,
 remboursement:()=>head("Remboursement et assistance","Les informations à connaître avant de commander.")+`<section class="sec"><div class="w pr"><h2>Avant le paiement</h2><p>Vérifie la marque, la région, le pays et le montant. Demande confirmation sur WhatsApp avant de payer.</p><h2>Après le paiement</h2><p>En cas de problème, envoie rapidement la référence de commande et la preuve de paiement au support.</p><h2>Erreur de région</h2><p>Une carte activée sur une mauvaise région peut être inutilisable. La vérification de la région reste indispensable avant la commande.</p></div></section>`,

p:(id,gk)=>{
 const pi=P.findIndex(p=>p.id==id&&!p.disabled);if(pi<0)return R.boutique();
 const p=P[pi];rememberProduct(p.id);const info=PRODUCT_INFO[p.id]||{about:p.d,activation:"Compte compatible",tip:"Vérifie la région avant de commander."};const g=p.g[sel.g]||p.g[0],c=g.list[sel.c]||g.list[0],gi=p.g.indexOf(g),ci=g.list.indexOf(c);
 return head(p.n+(g.l?" : "+g.l:""),p.d+". Les cartes ne fonctionnent que sur un compte de la même région.",g.c||p.c)+`<div class="w"><div class="product-summary"><div><h2>${info.about}</h2><p>Activation : <b>${info.activation}</b></p></div><div class="product-tip"><b>À vérifier</b><span>${info.tip}</span></div></div>
 ${p.g.length>1?`<div class="tabs">${p.g.map((x,i)=>`<button class="tab" aria-pressed="${i==gi}" onclick="sel={g:${i},c:0};draw(true)">${x.l}</button>`).join("")}</div>`:""}
 ${g.list.length>1?`<div class="tabs">${g.list.map((x,i)=>`<button class="tab" aria-pressed="${i==ci}" onclick="sel.c=${i};draw(true)">${x.c} · ${x.n}</button>`).join("")}</div>`:""}
 <div class="cards">${c.k.map(f=>{const cost=f*c.r,pr=price(cost),k=[p.id,c.c,c.n,f].join("|"),q=cart[k]?cart[k].q:0,available=stockFor(p.id)>0;
 return `<article class="gc" ${style(g.c||p.c)}><div class="gt"><span>Carte cadeau</span><button class="heart" type="button" aria-label="Ajouter ${p.n} aux favoris" onclick="toggleFavorite('${p.id}')">${isFavorite(p.id)?"★":"☆"}</button><span>${c.c}</span></div><div class="gf">${f}<small>${c.s}</small></div><div class="gn">${p.n} · ${c.n}</div>
 <div class="gb"><div class="gp"><small>Notre prix</small>${m(pr)}<em class="availability">${available?"Disponible":"Rupture"}</em></div><div class="q"><button aria-label="Retirer" onclick="add(${pi},${gi},${ci},${f},-1)">−</button><span>${q}</span><button aria-label="Ajouter" ${available?"":"disabled"} onclick="add(${pi},${gi},${ci},${f},1)">+</button></div></div>
 ${admin?`<div class="ga">Réel ${cost.toFixed(2)} $ · gain ${(pr-cost).toFixed(2)} $</div>`:""}</article>`}).join("")}</div></div>`},

 panier:()=>head("Mon panier","Vérifie ta commande, puis envoie-la sur WhatsApp.")+`<div class="w"><div class="cl">${count()?items().length&&Object.entries(cart).map(([k,i])=>`<div class="ln"><span>${i.t} ${i.f} ${i.s}</span><span class="q"><button aria-label="Retirer" onclick="chg('${k}',-1)">−</button><span>${i.q}</span><button aria-label="Ajouter" onclick="chg('${k}',1)">+</button></span><b>${m(i.q*i.p)}</b></div>`).join("")+`<div class="promo-box"><label class="f">Code promotionnel<input id="promoCode" placeholder="Ex : APEX10"></label><button class="btn l" type="button" onclick="applyPromo()">Appliquer</button></div>${discount()?`<div class="discount-line"><span>Promotion (${promo.percent} %)</span><b>- ${m(discount())}</b></div>`:""}<div class="tt"><span>Total</span><span>${m(finalTotal())}</span></div>
 <div class="checkout-grid"><label class="f">Ton nom<input id="nm" value="${escapeHtml(profile.name)}" placeholder="Ex : Jean" autocomplete="name" required></label><label class="f">Ton numéro WhatsApp<input id="phone" value="${escapeHtml(profile.phone)}" placeholder="Ex : 0973..." autocomplete="tel" required></label><label class="f">Email (facultatif)<input id="email" type="email" value="${escapeHtml(profile.email)}" placeholder="nom@email.com" autocomplete="email"></label><label class="f">Moyen de paiement<select id="py">${S.pay.map(p=>`<option>${escapeHtml(p[0])}</option>`).join("")}</select></label></div><label class="f">Note pour la commande<textarea id="note" rows="3" placeholder="Région, compte concerné ou précision..."></textarea></label><div class="checkout-actions"><button class="btn l" type="button" onclick="clearCart()">Vider le panier</button><button class="btn g" onclick="send()">Commander sur WhatsApp</button></div><p class="secure-note">Commande confirmée manuellement · paiement vérifié avant livraison du code.</p>`:`<p>Ton panier est vide. <a href="#/boutique"><b>Voir la boutique</b></a></p>`}</div></div>`,

commander:()=>head("Comment commander","De la boutique à ton code, étape par étape.")+`<section class="sec"><div class="w pr"><ol class="st" style="grid-template-columns:1fr">
<li><h3>Vérifie la région de ton compte</h3><p>Une carte américaine ne marche pas sur un compte européen. Pour PlayStation, choisis Amérique ou Europe, puis ton pays.</p></li>
<li><h3>Ajoute tes cartes au panier</h3><p>Dans la <a href="#/boutique"><b>boutique</b></a>, utilise + et − sur chaque carte. Tu peux mélanger plusieurs marques.</p></li>
<li><h3>Ouvre ton panier</h3><p>Entre ton nom, choisis ton moyen de paiement, puis clique sur « Commander sur WhatsApp ».</p></li>
<li><h3>Envoie le message</h3><p>WhatsApp s'ouvre avec ta commande déjà écrite. Appuie sur envoyer.</p></li>
<li><h3>Paie le montant</h3><p>On confirme ta commande. Tu paies puis tu envoies la capture. Voir <a href="#/paiement"><b>Paiement</b></a>.</p></li>
<li><h3>Reçois et utilise ton code</h3><p>Une fois le paiement confirmé, on t'envoie le code. Entre-le dans la boutique de l'application concernée.</p></li></ol></div></section>`,

paiement:()=>head("Paiement","Tous les prix sont en dollars. Tu paies après avoir envoyé ta commande.")+`<section class="sec"><div class="w"><h2>Où envoyer ton paiement</h2><p class="ld">Envoie le montant exact de ta commande avec l'un de ces moyens.</p>
<div class="pg">${S.pay.map(p=>`<div class="pay"><h3>${escapeHtml(p[0])}</h3><p>Numéro : <b>${escapeHtml(p[1])}</b><br>Nom du compte : <b>Apex Gaming</b></p></div>`).join("")}</div>
<div class="nt"><b>Avant de payer :</b> attends notre confirmation sur WhatsApp, qui rappelle le montant et le numéro. Vérifie toujours le numéro avant d'envoyer. Ensuite, envoie la capture de ton paiement pour recevoir ton code.</div></div></section>`,

pourquoi:()=>head("Pourquoi Apex Gaming","Ce qui change quand tu commandes chez nous.")+`<section class="sec"><div class="w"><div class="rs">
<div><h3>Prix affichés d'avance</h3><p>Chaque carte a son prix en dollars. Pas de surprise.</p></div>
<div><h3>Plusieurs marques, un seul panier</h3><p>PlayStation, Spotify, Apple Music, Netflix, Xbox, Steam et Google Play dans une même commande.</p></div>
<div><h3>Régions bien séparées</h3><p>PlayStation Amérique et Europe ont chacune leurs pays, pour éviter l'erreur de région.</p></div>
<div><h3>Commande en un clic</h3><p>Ton panier devient un message WhatsApp prêt à envoyer.</p></div>
<div><h3>Un vendeur joignable</h3><p>Tu parles directement à Apex Gaming sur WhatsApp, Instagram ou Snapchat.</p></div>
<div><h3>Paiement au choix</h3><p>Tu utilises le moyen de paiement qui t'arrange.</p></div></div></div></section>`,

apropos:()=>head("Qui sommes-nous","Apex Gaming, boutique de cartes cadeaux numériques.")+`<section class="sec"><div class="w pr"><h2 style="margin-top:0">Notre activité</h2><p>Apex Gaming vend des cartes cadeaux pour recharger tes comptes PlayStation, Xbox, Steam, Google Play, Apple, Spotify et Netflix.</p>
<h2>Notre façon de travailler</h2><p>Le site affiche les prix. La commande se termine par une vraie conversation sur WhatsApp : on confirme, tu paies, on t'envoie ton code.</p>
<h2>Nous contacter</h2><p>WhatsApp : <a href="https://wa.me/${S.wa}" target="_blank" rel="noopener"><b>${S.phone}</b></a><br>Instagram : <b>${S.ig}</b><br>Snapchat : <b>${S.sn}</b></p></div></section>`,

admin:()=>{
 admin=true;try{localStorage.setItem("apexadm","1")}catch(e){}
 return head("Administration","Gère les produits, les prix et les moyens de paiement de cette boutique.")+`<section class="sec"><div class="w">
  <div class="admin-summary"><div><b>${P.filter(p=>!p.disabled).length}</b><span>produits actifs</span></div><div><b>${Math.round(S.margin*100)} %</b><span>marge appliquée</span></div><div><b>${S.pay.length}</b><span>moyens de paiement</span></div><div><b>${orders.length}</b><span>commandes locales</span></div></div>
  <section class="admin-section admin-stats"><h2>Statistiques</h2><div class="stats-grid"><div><b>${m(orders.filter(o=>o.status!=="Annulée").reduce((sum,o)=>sum+Number(o.total||0),0))}</b><span>chiffre d'affaires local</span></div><div><b>${orders.filter(o=>o.status==="En attente de confirmation").length}</b><span>à confirmer</span></div><div><b>${orders.filter(o=>o.status==="Livrée").length}</b><span>livrées</span></div><div><b>${orders.length?m(orders.reduce((sum,o)=>sum+Number(o.total||0),0)/orders.length):"0 $"}</b><span>panier moyen</span></div></div><p class="admin-note">Ces statistiques utilisent uniquement les commandes enregistrées dans ce navigateur.</p></section>
 <form id="adminSettings" class="admin-form" onsubmit="saveAdminSettings(event)">
 <section class="admin-section"><h2>Tarification</h2><p class="ld">La marge est appliquée au coût de chaque carte avant l’arrondi.</p><label class="f">Marge (%)<input name="margin" type="number" min="0" max="500" step="1" value="${Math.round(S.margin*100)}" required></label></section>
 <section class="admin-section"><h2>Produits et stock</h2><p class="ld">Masque une marque ou indique le nombre de codes disponibles.</p><div class="admin-products">${P.map(p=>`<label class="admin-product"><input type="checkbox" name="product-${p.id}" ${p.disabled?"":"checked"}><span><b>${p.n}</b><small>${p.d}</small></span><input class="stock-input" name="stock-${p.id}" type="number" min="0" max="99999" value="${stockFor(p.id)}" aria-label="Stock ${p.n}"></label>`).join("")}</div></section>
 <section class="admin-section"><h2>Promotion</h2><p class="ld">Laisse le code vide pour désactiver les promotions.</p><div class="checkout-grid"><label class="f">Code<input name="promoCode" maxlength="20" value="${escapeHtml(promo.code||"")}" placeholder="APEX10"></label><label class="f">Réduction (%)<input name="promoPercent" type="number" min="0" max="90" step="1" value="${promo.percent||0}"></label></div></section>
 <section class="admin-section"><h2>Moyens de paiement</h2><p class="ld">Ces informations s’affichent sur la page Paiement et dans le formulaire de commande.</p><div id="adminPayments">${S.pay.map(p=>`<div class="admin-pay-row"><label class="f">Moyen<input name="payName" maxlength="40" value="${escapeHtml(p[0])}" required></label><label class="f">Numéro / identifiant<input name="payNumber" maxlength="60" value="${escapeHtml(p[1])}" required></label><button class="btn l" type="button" aria-label="Supprimer ce moyen de paiement" onclick="this.closest('.admin-pay-row').remove()">Supprimer</button></div>`).join("")}</div><button class="btn l" type="button" onclick="addPaymentRow()">+ Ajouter un moyen</button></section>
 <section class="admin-section"><h2>Suivi des commandes</h2><p class="ld">Les commandes visibles ici sont celles enregistrées dans ce navigateur.</p>${orders.length?`<div class="admin-orders">${orders.map(o=>`<div class="admin-order"><div><b>${escapeHtml(o.id)}</b><small>${escapeHtml(o.name)} · ${m(o.total)}</small></div><select onchange="updateOrderStatus('${escapeHtml(o.id)}',this.value)">${ORDER_STATUSES.map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")}</div>`:`<p class="admin-note">Aucune commande locale.</p>`}</section>
 <div class="admin-actions"><button class="btn d" type="submit">Enregistrer les réglages</button><button class="btn l" type="button" onclick="exitAdmin()">Quitter l’administration</button></div>
 </form><p class="admin-note">Les modifications sont enregistrées uniquement dans le stockage local de ce navigateur. Elles ne sont pas partagées avec les visiteurs ni synchronisées avec d’autres appareils.</p>
 </div></section>`
}
};

/* ===== AFFICHAGE ET NAVIGATION ===== */
function draw(keep){
 const y=scrollY,h=location.hash.replace(/^#\/?/,"").split("/"),a=h[0];
 $("main").innerHTML=(R[a]||R[""])(h[1],h[2]);
 const n=count();
 $("nav").innerHTML=PAGES.map(p=>`<a href="#/${p[0]}" ${p[0]==a||(a=="p"&&p[0]=="boutique")?'class="on"':""}>${p[1]}</a>`).join("")+`<a href="#/favoris" class="${a=="favoris"?"on":""}">Favoris (${favorites.length})</a><a href="#/panier" class="${a=="panier"?"on":""}">Panier (${n})</a>`+(admin?`<a href="#/admin" class="${a=="admin"?"on":""}">Administration</a>`:"");
 const old=document.getElementById("cb");if(old)old.remove();
 if(n&&a!="panier"){const b=document.createElement("div");b.className="bar";b.id="cb";b.innerHTML=`<span><b>${n}</b> article${n>1?"s":""} · <b>${m(total())}</b></span><a class="btn d" href="#/panier">Voir le panier</a>`;document.body.appendChild(b)}
 applyTheme();
 if(keep)scrollTo(0,y);
}
addEventListener("hashchange",()=>{
 const h=location.hash.replace(/^#\/?/,"").split("/");
 sel={g:h[0]=="p"&&h[2]!=null?+h[2]||0:0,c:0};
 $("nav").classList.remove("o");draw();scrollTo(0,0);
});
draw();
