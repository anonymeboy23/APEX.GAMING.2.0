/* LOGIQUE DU SITE : panier, pages et navigation. Tu n'as normalement pas besoin de modifier ce fichier. */

/* ===== OUTILS ===== */
const $=id=>document.getElementById(id);
const price=c=>Math.ceil(c*(1+S.margin)/S.round)*S.round;
const m=n=>(Number.isInteger(n)?n:n.toFixed(2))+" $";
let cart={},favorites=[],orders=[],reviews=[],inventory={},promo={code:"",percent:0,enabled:false},profile={name:"",phone:"",email:""},orderLookup=null,appliedPromo="",shopQuery="",shopSort="featured",shopRegion="all",recentProducts=[],theme="";
const supabaseClient=window.apexSupabase;
let currentUser=null,accountOrders=[],accountMode="login",accountReady=false,accountNotice="",accountRole=null,adminAccounts=[],adminAccountsLoaded=false,adminAccountsError="";
try{cart=JSON.parse(localStorage.getItem("apexcart")||"{}");favorites=JSON.parse(localStorage.getItem("apexfavorites")||"[]");orders=JSON.parse(localStorage.getItem("apexorders")||"[]");reviews=JSON.parse(localStorage.getItem("apexreviews")||"[]");inventory=JSON.parse(localStorage.getItem("apexinventory")||"{}");promo=JSON.parse(localStorage.getItem("apexpromo")||'{"code":"","percent":0,"enabled":false}');profile=JSON.parse(localStorage.getItem("apexprofile")||'{"name":"","phone":"","email":""}');recentProducts=JSON.parse(localStorage.getItem("apexrecent")||"[]");theme=localStorage.getItem("apextheme")||""}catch(e){}
const isAdmin=()=>Boolean(currentUser&&accountReady&&accountRole==="admin");
let adminOrders=[],adminReviews=[],adminDataLoaded=false,adminDataLoading=false,adminDataErrors=[],adminConfigLoaded=false,adminDataRequest=0;
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
async function toggleFavorite(id){
 const wasFavorite=isFavorite(id);
 favorites=wasFavorite?favorites.filter(x=>x!==id):[...favorites,id];
 saveFavorites();draw(true);
 if(currentUser&&supabaseClient){
  const result=wasFavorite
   ?await supabaseClient.from("customer_favorites").delete().eq("product_id",id).eq("user_id",currentUser.id)
   :await supabaseClient.from("customer_favorites").insert({user_id:currentUser.id,product_id:id});
  if(result.error){favorites=wasFavorite?[...favorites,id]:favorites.filter(x=>x!==id);saveFavorites();draw(true);toast("Favori non synchronisé. Exécute la mise à jour supabase.sql.");return}
 }
 toast(wasFavorite?"Retiré des favoris":"Ajouté aux favoris");
}
function reportAccountError(error,action){
 console.error(action,error);
 toast(`${action} : ${error.message||"erreur Supabase"}`);
}
function orderItemName(item){
 const product=P.find(p=>p.id===item.product_id);
 return `${product?.n||item.product_id}${item.region?` · ${item.region}`:""}`;
}
function applyStoreConfig(config){
 if(!config||typeof config!=="object")throw new Error("La configuration centrale de la boutique est vide.");
 if(Number.isFinite(Number(config.margin))&&Number(config.margin)>=0&&Number(config.margin)<=5)S.margin=Number(config.margin);
 if(Number.isFinite(Number(config.round))&&Number(config.round)>0)S.round=Number(config.round);
 if(Array.isArray(config.pay)&&config.pay.length&&config.pay.every(method=>Array.isArray(method)&&typeof method[0]==="string"&&typeof method[1]==="string"))S.pay=config.pay;
 if(config.promo&&typeof config.promo==="object")promo={code:String(config.promo.code||""),percent:Number(config.promo.percent)||0,enabled:Boolean(config.promo.enabled)};
 if(Array.isArray(config.products)){
  config.products.forEach(item=>{
   const product=P.find(candidate=>candidate.id===item.id);
   if(!product)return;
   product.disabled=item.active!==true;
   inventory[product.id]=Math.max(0,Number(item.quantity)||0);
  });
 }
}
async function loadStorefrontConfig(){
 if(!supabaseClient)return;
 const [{data,error},{data:reviewData,error:reviewError}]=await Promise.all([
  supabaseClient.rpc("get_storefront_config"),
  supabaseClient.from("reviews").select("id,customer_name,rating,message,approved,created_at").eq("approved",true).order("created_at",{ascending:false}).limit(100)
 ]);
 if(error){console.error("Chargement de la boutique impossible",error);toast("Les réglages partagés n’ont pas pu être chargés.");return}
 if(!adminConfigLoaded){
  try{applyStoreConfig(data);draw(true)}
  catch(configError){console.error("Configuration de la boutique invalide",configError);toast("La configuration partagée de la boutique est invalide.")}
 }
 if(reviewError){console.error("Chargement des avis publiés impossible",reviewError);return}
 reviews=(reviewData||[]).map(review=>({id:review.id,name:review.customer_name,rating:review.rating,message:review.message,approved:true,createdAt:review.created_at}));
 draw(true);
}
async function loadAccountData(){
 if(!supabaseClient||!currentUser)return false;
 const userId=currentUser.id;
 const [profileResult,favoriteResult,orderResult]=await Promise.all([
  supabaseClient.from("profiles").select("name,phone,role").eq("id",userId).maybeSingle(),
  supabaseClient.from("customer_favorites").select("product_id").eq("user_id",userId),
  supabaseClient.from("orders").select("id,status,total,created_at,customer_name,phone,email,note,order_items(product_id,region,face_value,quantity,unit_price)").eq("customer_id",userId).order("created_at",{ascending:false})
 ]);
 if(currentUser?.id!==userId)return false;
 const failures=[
  [profileResult.error,"Lecture du profil impossible"],
  [favoriteResult.error,"Synchronisation des favoris impossible"],
  [orderResult.error,"Synchronisation des commandes impossible"]
 ].filter(([error])=>error);
 if(profileResult.error)accountRole=null;
 else if(profileResult.data){
  profile={...profile,name:profileResult.data.name||"",phone:profileResult.data.phone||"",email:currentUser.email||""};
  accountRole=profileResult.data.role==="admin"?"admin":"customer";
 }else accountRole=null;
 if(profileResult.data)saveProfile();
 if(!favoriteResult.error){favorites=(favoriteResult.data||[]).map(row=>row.product_id);saveFavorites()}
 if(!orderResult.error)accountOrders=(orderResult.data||[]).map(order=>({
  id:order.id,status:order.status,total:Number(order.total),createdAt:order.created_at,
  name:order.customer_name,phone:order.phone,email:order.email,note:order.note,
  items:(order.order_items||[]).map(item=>({
   productId:item.product_id,name:orderItemName(item),region:item.region,
   face:Number(item.face_value),symbol:({US:"$",CA:"CA$",FR:"€",DE:"€",ES:"€",IT:"€",BE:"€",GB:"£"})[item.region]||"$",quantity:item.quantity,price:Number(item.unit_price)
  }))
 }));
 accountReady=true;
 if(failures.length){
  failures.forEach(([error,action])=>console.error(action,error));
  toast(`Synchronisation partielle du compte : ${failures.map(([,action])=>action.toLowerCase()).join(", ")}.`);
 }
 return failures.length===0;
}
async function initializeAccount(){
 if(!supabaseClient)return;
 supabaseClient.auth.onAuthStateChange((event,session)=>{
  currentUser=session?.user||null;
  accountRole=null;accountReady=false;
  adminAccounts=[];adminAccountsLoaded=false;adminAccountsError="";
  adminOrders=[];adminReviews=[];adminDataLoaded=false;adminDataLoading=false;adminDataErrors=[];adminConfigLoaded=false;adminDataRequest++;
  if(event==="PASSWORD_RECOVERY"){accountMode="reset";location.hash="#/compte"}
  Promise.resolve().then(async()=>{
   if(currentUser)await loadAccountData();
   else{accountOrders=[];accountRole=null;accountReady=true}
   accountReady=true;
   if(location.hash==="#/compte"||location.hash==="#/profil"||location.hash==="#/commandes"||location.hash==="#/favoris"||location.hash==="#/admin")draw(true);
  });
 });
 const {data,error}=await supabaseClient.auth.getSession();
 if(error){reportAccountError(error,"Lecture de la session impossible");return}
 currentUser=data.session?.user||null;
 if(currentUser)await loadAccountData();
 else accountRole=null;
 accountReady=true;draw(true);
}
async function addAdminAccount(event){
 event.preventDefault();
 if(!isAdmin()||!supabaseClient){toast("Action réservée à un administrateur connecté.");return}
 const form=event.currentTarget,email=String(new FormData(form).get("email")||"").trim();
 if(!email){toast("Saisis l’adresse e-mail du compte à promouvoir.");return}
 const button=form.querySelector('button[type="submit"]');
 button.disabled=true;
 let error;
 try{
  ({error}=await supabaseClient.rpc("grant_admin_by_email",{p_email:email}));
 }catch(requestError){
  error=requestError;
 }finally{
  button.disabled=false;
 }
 if(error){console.error("Ajout de l’administrateur impossible",error);toast(`Ajout impossible : ${error?.message||"erreur Supabase"}`);return}
 form.reset();adminAccountsLoaded=false;
 toast("Accès administrateur accordé.");
 adminDataLoaded=false;
 await loadAdminData();
}
function mapStoredOrder(order){
 return {
  id:order.id,status:order.status,total:Number(order.total),createdAt:order.created_at,
  name:order.customer_name,phone:order.phone,email:order.email,note:order.note,payment:order.payment_method,
  items:(order.order_items||[]).map(item=>({
   productId:item.product_id,name:orderItemName(item),region:item.region,
   face:Number(item.face_value),symbol:({US:"$",CA:"CA$",FR:"€",DE:"€",ES:"€",IT:"€",BE:"€",GB:"£"})[item.region]||"$",
   quantity:item.quantity,price:Number(item.unit_price)
  }))
 };
}
async function loadAdminData(){
 if(!isAdmin()||adminDataLoading)return;
 const requestId=++adminDataRequest,userId=currentUser.id;
 adminDataLoading=true;adminDataLoaded=false;adminDataErrors=[];draw(true);
 let configResult,ordersResult,reviewsResult,adminsResult;
 try{
  [configResult,ordersResult,reviewsResult,adminsResult]=await Promise.all([
   supabaseClient.rpc("get_admin_store_config"),
   supabaseClient.from("orders").select("id,status,total,created_at,customer_name,phone,email,note,payment_method,order_items(product_id,region,face_value,quantity,unit_price)").order("created_at",{ascending:false}).limit(200),
   supabaseClient.from("reviews").select("id,customer_name,rating,message,approved,created_at").order("created_at",{ascending:false}).limit(200),
   supabaseClient.rpc("list_admin_accounts")
  ]);
 }catch(error){
  if(requestId!==adminDataRequest||currentUser?.id!==userId)return;
  adminDataErrors.push(error?.message||"Connexion à Supabase impossible.");
  adminDataLoading=false;adminDataLoaded=true;
  if(location.hash.replace(/^#\/?/,"").split("/")[0]==="admin")draw(true);
  return;
 }
 if(configResult.error)adminDataErrors.push(`Réglages : ${configResult.error.message}`);
 else{
  try{applyStoreConfig(configResult.data);adminConfigLoaded=true}
  catch(error){adminDataErrors.push(`Réglages : ${error.message}`)}
 }
 if(ordersResult.error)adminDataErrors.push(`Commandes : ${ordersResult.error.message}`);
 else adminOrders=(ordersResult.data||[]).map(mapStoredOrder);
 if(reviewsResult.error)adminDataErrors.push(`Avis : ${reviewsResult.error.message}`);
 else adminReviews=(reviewsResult.data||[]).map(review=>({
  id:review.id,name:review.customer_name,rating:review.rating,message:review.message,
  approved:review.approved,createdAt:review.created_at
 }));
 if(adminsResult.error)adminDataErrors.push(`Administrateurs : ${adminsResult.error.message}`);
 else adminAccounts=adminsResult.data||[];
 adminAccountsError=adminsResult.error?.message||"";
 adminAccountsLoaded=!adminsResult.error;
 adminDataLoading=false;adminDataLoaded=true;
 if(location.hash.replace(/^#\/?/,"").split("/")[0]==="admin")draw(true);
}
async function saveAdminSettings(event){
 event.preventDefault();
 if(!isAdmin()||!adminConfigLoaded){toast("Les réglages Supabase ne sont pas chargés. Réessaie avant d’enregistrer.");return}
 const form=event.currentTarget,margin=Number(form.elements.margin.value)/100;
 const rows=[...form.querySelectorAll(".admin-pay-row")];
 const pay=rows.map(row=>[row.querySelector('[name="payName"]').value.trim(),row.querySelector('[name="payNumber"]').value.trim()]);
 const promoCode=form.elements.promoCode.value.trim().toUpperCase(),promoPercent=Number(form.elements.promoPercent.value)||0;
 if(!Number.isFinite(margin)||margin<0||margin>5){toast("La marge doit être comprise entre 0 et 500 %.");return}
 if(!pay.length||pay.some(method=>!method[0]||!method[1])){toast("Garde au moins un moyen de paiement et complète tous les champs.");return}
 if(pay.some(method=>method[0].length>40||method[1].length>60)){toast("Les noms sont limités à 40 caractères et les numéros à 60.");return}
 if(promoPercent<0||promoPercent>90){toast("La promotion doit être comprise entre 0 et 90 %.");return}
 const products=P.map(product=>({
  id:product.id,
  active:form.querySelector(`[name="product-${product.id}"]`).checked,
  quantity:Math.max(0,Math.min(99999,Math.floor(Number(form.querySelector(`[name="stock-${product.id}"]`).value)||0)))
 }));
 const button=form.querySelector('button[type="submit"]');button.disabled=true;
 const {data,error}=await supabaseClient.rpc("save_admin_store_config",{p_config:{
  margin,round:S.round,pay,promo:{code:promoCode,percent:promoPercent},products
 }});
 button.disabled=false;
 if(error){console.error("Enregistrement des réglages centralisés impossible",error);toast(`Enregistrement impossible : ${error.message}`);return}
 try{applyStoreConfig(data);adminConfigLoaded=true;toast("Réglages enregistrés dans Supabase.");draw(true)}
 catch(configError){console.error("Réponse de configuration invalide",configError);toast("Supabase a enregistré les réglages, mais leur réponse est invalide. Recharge la page.")}
}
function authMessage(error){
 const messages={
  "Invalid login credentials":"E-mail ou mot de passe incorrect.",
  "Email not confirmed":"Confirme ton adresse e-mail avant de te connecter.",
  "User already registered":"Un compte utilise déjà cette adresse e-mail.",
  "Password should be at least 6 characters":"Le mot de passe est trop court.",
  "Signup requires a valid password":"Choisis un mot de passe valide."
 };
 return messages[error.message]||error.message||"Une erreur est survenue.";
}
async function submitAuth(event){
 event.preventDefault();
 if(!supabaseClient){toast("Supabase n'est pas configuré.");return}
 const form=event.currentTarget,data=new FormData(form),email=String(data.get("email")||"").trim(),password=String(data.get("password")||"");
 let result;
 if(accountMode==="signup"){
  const name=String(data.get("name")||"").trim(),phone=String(data.get("phone")||"").trim();
  if(password.length<8){toast("Choisis un mot de passe d'au moins 8 caractères.");return}
  result=await supabaseClient.auth.signUp({email,password,options:{data:{name,phone},emailRedirectTo:location.origin+location.pathname}});
  if(result.error){toast(authMessage(result.error));return}
  if(result.data.session){toast("Compte créé et connecté.");location.hash="#/profil"}
  else{
   accountMode="login";
   accountNotice="E-mail de confirmation envoyé. Clique sur le lien reçu, puis connecte-toi avec ton adresse et ton mot de passe.";
   draw();
   toast("Inscription envoyée. Vérifie ta boîte e-mail.");
  }
 }else if(accountMode==="reset"){
  result=await supabaseClient.auth.updateUser({password});
  if(result.error){toast(authMessage(result.error));return}
  accountMode="login";toast("Mot de passe modifié.");draw();
 }else{
  result=await supabaseClient.auth.signInWithPassword({email,password});
  if(result.error){toast(authMessage(result.error));return}
  accountNotice="";
  toast("Connexion réussie.");location.hash="#/profil";
 }
}
async function sendPasswordReset(event){
 event.preventDefault();
 if(!supabaseClient){toast("Supabase n'est pas configuré.");return}
 const email=String(new FormData(event.currentTarget).get("email")||"").trim();
 const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 if(error){toast(authMessage(error));return}
 toast("Si cette adresse a un compte, un e-mail de réinitialisation a été envoyé.");
}
async function signOut(){
 const {error}=await supabaseClient.auth.signOut();
 if(error){reportAccountError(error,"Déconnexion impossible");return}
 currentUser=null;accountOrders=[];accountRole=null;accountReady=true;accountMode="login";toast("Déconnexion effectuée.");location.hash="#/compte";
}
function toast(message){const el=$("toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2200)}
function toggleTheme(){theme=theme=="dark"?"light":theme=="light"?"":"dark";try{localStorage.setItem("apextheme",theme)}catch(e){};applyTheme()}
function applyTheme(){document.documentElement.dataset.theme=theme;if($("themeToggle"))$("themeToggle").textContent=theme=="dark"?"☀":theme=="light"?"☾":"◐"}
function rememberProduct(id){recentProducts=[id,...recentProducts.filter(x=>x!==id)].slice(0,4);saveRecent()}
const stockFor=id=>Number.isFinite(Number(inventory[id]))?Math.max(0,Number(inventory[id])):100;
const discount=()=>appliedPromo&&promo.enabled&&promo.code&&promo.percent>0?Math.min(total(),total()*promo.percent/100):0;
const finalTotal=()=>total()-discount();
function applyPromo(){const input=$("promoCode"),value=input?input.value.trim().toUpperCase():"";if(!promo.enabled||!promo.code||value!==promo.code.toUpperCase()){toast("Code promotion invalide");return}appliedPromo=value;toast("Promotion appliquée");draw(true)}
async function saveCustomerProfile(event){
 event.preventDefault();
 const form=event.currentTarget;
 profile={...profile,name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim()};
 if(currentUser&&supabaseClient){
  const {error}=await supabaseClient.from("profiles").update({name:profile.name,phone:profile.phone}).eq("id",currentUser.id);
  if(error){reportAccountError(error,"Enregistrement du profil impossible");return}
 }
 saveProfile();toast("Profil enregistré");draw(true);
}
async function submitReview(event){
 event.preventDefault();
 if(!supabaseClient){toast("Les avis ne peuvent pas être enregistrés : Supabase n’est pas configuré.");return}
 const form=event.currentTarget,name=form.elements.reviewName.value.trim(),message=form.elements.reviewMessage.value.trim(),rating=Number(form.elements.reviewRating.value);
 if(name.length<2||message.length<8||rating<1||rating>5){toast("Complète ton avis correctement");return}
 const {error}=await supabaseClient.from("reviews").insert({customer_id:currentUser?.id||null,customer_name:name,rating,message});
 if(error){reportAccountError(error,"Enregistrement de l’avis impossible");return}
 toast("Merci, ton avis sera vérifié");form.reset();draw(true);
}
async function moderateReview(id,approved){
 if(!isAdmin()||!supabaseClient){toast("Action réservée à un administrateur connecté.");return}
 const result=approved
  ?await supabaseClient.from("reviews").update({approved:true}).eq("id",id)
  :await supabaseClient.from("reviews").delete().eq("id",id);
 if(result.error){reportAccountError(result.error,"Modération de l’avis impossible");return}
 adminReviews=adminReviews.filter(review=>review.id!==id||approved).map(review=>review.id===id?{...review,approved:true}:review);
 reviews=adminReviews;toast(approved?"Avis publié":"Avis supprimé");draw(true);
}
async function lookupOrder(){
 const id=$("lookupId").value.trim().toUpperCase(),phone=$("lookupPhone").value.trim();
 if(!id||!phone){toast("Indique la référence et le numéro WhatsApp");return}
 try{
  if(supabaseClient){
   const {data,error}=await supabaseClient.rpc("lookup_store_order",{p_id:id,p_phone:phone});
   if(error)throw error;
   const order=Array.isArray(data)?data[0]:data;
   if(!order)throw new Error("ORDER_NOT_FOUND");
   orderLookup=order;
  }else{
   const response=await fetch(`/api/orders/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`);
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   orderLookup=result.order;
  }
  draw(true);
 }catch(error){
  orderLookup=null;
  toast(error.message==="D1_NOT_CONFIGURED"?"Le suivi des commandes n’est pas configuré.":"Commande introuvable ou suivi indisponible");
 }
}
function addPaymentRow(){
 const list=$("adminPayments"),row=document.createElement("div");
 row.className="admin-pay-row";
 row.innerHTML='<label class="f">Moyen<input name="payName" maxlength="40" required></label><label class="f">Numéro / identifiant<input name="payNumber" maxlength="60" required></label><button class="btn l" type="button" aria-label="Supprimer ce moyen de paiement" onclick="this.closest(\'.admin-pay-row\').remove()">Supprimer</button>';
 list.appendChild(row);
}
function exitAdmin(){location.hash="#/";}
function refreshAdminAccounts(){adminDataLoaded=false;loadAdminData()}
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
const ORDER_STATUSES=["En attente de confirmation","Confirmée","En préparation","Livrée","Annulée"];
async function updateOrderStatus(id,status){
 if(!isAdmin()||!ORDER_STATUSES.includes(status)){toast("Statut invalide ou accès administrateur requis.");return}
 const {error}=await supabaseClient.from("orders").update({status}).eq("id",id);
 if(error){reportAccountError(error,"Mise à jour de la commande impossible");return}
 const order=adminOrders.find(item=>item.id===id);
 if(order)order.status=status;
 toast("Statut de commande enregistré dans Supabase.");draw(true);
}
function csvCell(value){return `"${String(value??"").replace(/"/g,'""')}"`}
function exportOrders(){const source=adminOrders;if(!source.length){toast("Aucune commande enregistrée dans Supabase");return}const header=["Référence","Date","Statut","Nom","WhatsApp","Email","Note","Total","Articles"];const rows=source.map(order=>[order.id,order.createdAt,order.status,order.name,order.phone,order.email,order.note,order.total,(order.items||[]).map(item=>`${item.quantity} x ${item.name} ${item.face}${item.symbol}`).join(" | ")]);const csv="\uFEFF"+[header,...rows].map(row=>row.map(csvCell).join(";")).join("\r\n");const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.download=`apex-gaming-commandes-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);toast("Export des commandes Supabase téléchargé")}
$("fl").innerHTML=PAGES.concat([["avis","Avis clients"],["conditions","Conditions générales"],["confidentialite","Confidentialité"],["remboursement","Remboursement"]]).map(p=>`<li><a href="#/${p[0]}">${p[1]}</a></li>`).join("");
$("fw").href="https://wa.me/"+S.wa;$("fw").textContent="WhatsApp : "+S.phone;
$("fi").href="https://www.instagram.com/"+S.ig;$("fi").textContent="Instagram : "+S.ig;
$("fs").href="https://www.snapchat.com/add/"+S.sn;$("fs").textContent="Snapchat : "+S.sn;
$("bg").onclick=()=>{const o=$("nav").classList.toggle("o");$("bg").setAttribute("aria-expanded",o);$("bg").setAttribute("aria-label",o?"Fermer le menu":"Ouvrir le menu");$("bg").textContent=o?"×":"☰"};
$("nav").addEventListener("click",()=>{$("nav").classList.remove("o");$("bg").setAttribute("aria-expanded","false");$("bg").setAttribute("aria-label","Ouvrir le menu");$("bg").textContent="☰"});

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
 orders.unshift({id:order,createdAt:new Date().toISOString(),status:"En attente de confirmation",name:n,phone,email,note,total:finalTotal(),discount:discount(),payment:$("py").value,items:orderItems});orders=orders.slice(0,20);saveOrders();
 const t=["Bonjour Apex Gaming, je voudrais commander :","","Référence : "+order,...items().map(i=>`- ${i.q} x ${i.t} ${i.f} ${i.s} = ${m(i.q*i.p)}`),"",discount()?"Promotion : - "+m(discount()):"","Total : "+m(finalTotal()),"Paiement par : "+$("py").value,"Nom : "+n,"WhatsApp : "+phone].concat(email?["Email : "+email]:[],note?["Note : "+note]:[]).join("\n");
 const payload={id:order,name:n,phone,email,note,payment:$("py").value,total:finalTotal(),items:orderItems.map(i=>({productId:i.productId,region:i.region,faceValue:Number(i.face),quantity:i.quantity,unitPrice:i.price}))};
 const whatsappWindow=window.open("https://wa.me/"+S.wa+"?text="+encodeURIComponent(t),"_blank");
 syncOrder(payload);
}
async function syncOrder(payload){
 if(supabaseClient){
  if(currentUser){
   const {error:profileError}=await supabaseClient.from("profiles").update({name:payload.name,phone:payload.phone}).eq("id",currentUser.id);
   if(profileError)console.error("Profil non synchronisé",profileError);
  }
  const {error}=await supabaseClient.rpc("create_customer_order",{
   p_id:payload.id,p_customer_name:payload.name,p_phone:payload.phone,p_email:payload.email||null,
   p_note:payload.note||null,p_total:payload.total,p_payment_method:payload.payment,
   p_items:payload.items.map(item=>({productId:item.productId,region:item.region,faceValue:item.faceValue,quantity:item.quantity,unitPrice:item.unitPrice}))
  });
  if(error){reportAccountError(error,"WhatsApp est prêt, mais la commande n'a pas été synchronisée");return}
  if(currentUser)await loadAccountData();
  if(isAdmin())adminDataLoaded=false;
  toast("Commande enregistrée dans Supabase.");
  return;
 }
 toast("WhatsApp est prêt, mais la commande n’a pas été enregistrée : Supabase n’est pas configuré.");
}

/* ===== PAGES ===== */
let sel={g:0,c:0};
const head=(t,p,c)=>`<section class="ph" ${c?style(c):""}><div class="w"><h1>${t}</h1><p>${p}</p></div></section>`;
const adminPage=()=>{
 if(!adminDataLoaded)return `<section class="admin-page"><div class="admin-page-heading"><div><p class="admin-eyebrow">APEX GAMING · ESPACE SÉCURISÉ</p><h1>Administration</h1></div></div><section class="admin-section"><p>${adminDataLoading?"Chargement des données centrales…":"Impossible de charger les données centrales."}</p></section></section>`;
 const pending=adminOrders.filter(order=>order.status==="En attente de confirmation").length;
 const settings=adminConfigLoaded?`<form id="adminSettings" class="admin-form" onsubmit="saveAdminSettings(event)">
 <details class="admin-panel" open><summary>Produits et stock</summary><section class="admin-section"><p class="ld">Le catalogue et le stock sont partagés sur tout le site.</p><div class="admin-products">${P.map(product=>`<label class="admin-product"><input type="checkbox" name="product-${product.id}" ${product.disabled?"":"checked"}><span><b>${escapeHtml(product.n)}</b><small>${escapeHtml(product.d)}</small></span><input class="stock-input" name="stock-${product.id}" type="number" min="0" max="99999" value="${stockFor(product.id)}" aria-label="Stock ${escapeHtml(product.n)}"></label>`).join("")}</div></section></details>
 <details class="admin-panel"><summary>Réglages boutique <span>Tarifs, promotions, paiements</span></summary>
 <section class="admin-section"><h2>Tarification</h2><label class="f">Marge (%)<input name="margin" type="number" min="0" max="500" step="1" value="${Math.round(S.margin*100)}" required></label></section>
 <section class="admin-section"><h2>Promotion</h2><div class="checkout-grid"><label class="f">Code<input name="promoCode" maxlength="20" value="${escapeHtml(promo.code||"")}" placeholder="APEX10"></label><label class="f">Réduction (%)<input name="promoPercent" type="number" min="0" max="90" step="1" value="${promo.percent||0}"></label></div></section>
 <section class="admin-section"><h2>Moyens de paiement</h2><p class="ld">Ces coordonnées seront visibles sur le site public.</p><div id="adminPayments">${S.pay.map(payment=>`<div class="admin-pay-row"><label class="f">Moyen<input name="payName" maxlength="40" value="${escapeHtml(payment[0])}" required></label><label class="f">Numéro / identifiant<input name="payNumber" maxlength="60" value="${escapeHtml(payment[1])}" required></label><button class="btn l" type="button" aria-label="Supprimer ce moyen de paiement" onclick="this.closest('.admin-pay-row').remove()">Supprimer</button></div>`).join("")}</div><button class="btn l" type="button" onclick="addPaymentRow()">+ Ajouter un moyen</button></section>
 <button class="btn d" type="submit">Enregistrer les réglages partagés</button></details></form>`:`<section class="admin-section"><h2>Réglages non chargés</h2><p>Les modifications restent bloquées jusqu’au chargement de la configuration Supabase.</p></section>`;
 return `<section class="admin-page"><div class="admin-page-heading"><div><p class="admin-eyebrow">APEX GAMING · ESPACE SÉCURISÉ</p><h1>Administration</h1><p>Commandes, catalogue et accès administrateurs.</p></div><a class="btn l" href="#/">Voir la boutique</a></div>
 <div class="admin-summary"><div><b>${pending}</b><span>commandes à confirmer</span></div><div><b>${adminOrders.length}</b><span>commandes centralisées</span></div><div><b>${P.filter(product=>!product.disabled).length}</b><span>produits actifs</span></div><div><b>${adminAccountsError?"—":adminAccountsLoaded?adminAccounts.length:"…"}</b><span>administrateurs</span></div></div>
 ${adminDataErrors.length?`<section class="admin-section admin-error-box"><h2>Chargement partiel</h2><ul>${adminDataErrors.map(error=>`<li>${escapeHtml(error)}</li>`).join("")}</ul><button class="btn l" type="button" onclick="refreshAdminAccounts()">Réessayer</button></section>`:""}
 <section class="admin-section admin-team"><h2>Accès administrateurs</h2><p class="ld">Ajoute une personne de confiance qui a déjà créé un compte.</p><form class="admin-add-form" onsubmit="addAdminAccount(event)"><label class="f">E-mail du compte<input name="email" type="email" autocomplete="email" maxlength="320" placeholder="nom@exemple.com" required></label><button class="btn d" type="submit">Ajouter comme admin</button></form>
 ${adminAccountsError?`<p class="admin-error">Liste indisponible : ${escapeHtml(adminAccountsError)}. Vérifie que le script <code>supabase.sql</code> a été exécuté.</p>`:adminAccounts.length?`<ul class="admin-account-list">${adminAccounts.map(account=>`<li><span><b>${escapeHtml(account.account_name||"Administrateur")}</b><small>${escapeHtml(account.account_email||"")}</small></span><span class="review-approved">Admin</span></li>`).join("")}</ul>`:`<p class="admin-note">Aucun administrateur listé.</p>`}</section>
 <details class="admin-panel" open><summary>Commandes à traiter <span>${adminOrders.length} dans Supabase</span></summary><section class="admin-section">${adminOrders.length?`<div class="admin-orders">${adminOrders.map(order=>`<div class="admin-order"><div><b>${escapeHtml(order.id)} · ${m(order.total)}</b><small>${escapeHtml(order.status)} · ${new Date(order.createdAt).toLocaleString("fr-FR")}</small><small>${escapeHtml(order.name)} · ${escapeHtml(order.phone)}${order.email?` · ${escapeHtml(order.email)}`:""}</small>${order.payment?`<small>Paiement : ${escapeHtml(order.payment)}</small>`:""}${order.note?`<small>Note : ${escapeHtml(order.note)}</small>`:""}<small>${(order.items||[]).map(item=>`${item.quantity} × ${escapeHtml(item.name)} ${item.face}${item.symbol}`).join(" · ")}</small></div><select aria-label="Statut de la commande ${escapeHtml(order.id)}" onchange="updateOrderStatus('${escapeHtml(order.id)}',this.value)">${ORDER_STATUSES.map(status=>`<option ${status===order.status?"selected":""}>${status}</option>`).join("")}</select></div>`).join("")}<button class="btn l" type="button" onclick="exportOrders()">Exporter les commandes</button>`:`<p class="admin-note">Aucune commande enregistrée dans Supabase.</p>`}</section></details>
 ${settings}
 <details class="admin-panel"><summary>Avis clients à modérer</summary><section class="admin-section">${adminReviews.length?`<div class="admin-reviews">${adminReviews.map(review=>`<div class="admin-review"><div><b>${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)} · ${escapeHtml(review.name)}</b><small>${escapeHtml(review.message)}</small></div>${review.approved?`<span class="review-approved">Publié</span>`:`<div class="admin-actions"><button class="btn d" type="button" onclick="moderateReview(${review.id},true)">Publier</button><button class="btn l" type="button" onclick="moderateReview(${review.id},false)">Supprimer</button></div>`}</div>`).join("")}`:`<p class="admin-note">Aucun avis reçu.</p>`}</section></details>
 <p class="admin-note">Catalogue, stock, tarifs, paiements, commandes et avis sont gérés dans Supabase.</p></section>`;
};
const gcMini=(c,a,b,n)=>`<div class="gc mini" ${style(c)}><div class="gt"><span>Carte cadeau</span><span>${n}</span></div><div class="gf">${a}<small>${b}</small></div></div>`;
const lowestPrice=p=>price(Math.min(...p.g.flatMap(g=>g.list.map(c=>c.k[0]*c.r))));
const tiles=(list=P)=>`<div class="tiles">${list.filter(p=>!p.disabled).map(p=>`<a class="tile" href="#/p/${p.id}" ${style(p.c)}><span class="tile-top"><small>${isFavorite(p.id)?"★ Favori":""}</small><button class="tile-fav" type="button" aria-label="${isFavorite(p.id)?"Retirer des favoris":"Ajouter aux favoris"}" onclick="event.preventDefault();toggleFavorite('${p.id}')">${isFavorite(p.id)?"★":"☆"}</button></span><h3>${p.n}</h3><span>${p.d} · dès ${m(lowestPrice(p))}</span><small class="availability">${stockFor(p.id)>0?"Disponible · livraison digitale":"Rupture temporaire"}</small></a>`).join("")||"<p>Aucun produit ne correspond à ta recherche.</p>"}</div>`;
const matchingProducts=()=>{let list=P.filter(p=>!p.disabled&&(!shopQuery||[p.n,p.d,p.id].join(" ").toLowerCase().includes(shopQuery.toLowerCase())));if(shopRegion!=="all")list=list.filter(p=>p.g.some(g=>g.list.some(c=>c.c===shopRegion)));if(shopSort==="price-up")list.sort((a,b)=>lowestPrice(a)-lowestPrice(b));if(shopSort==="price-down")list.sort((a,b)=>lowestPrice(b)-lowestPrice(a));if(shopSort==="name")list.sort((a,b)=>a.n.localeCompare(b.n));return list};
const steps=`<ol class="st"><li><h3>Choisis ta carte</h3><p>Produit, région ou pays, et montant.</p></li><li><h3>Ajoute au panier</h3><p>Le prix en dollars est affiché avant de commander.</p></li><li><h3>Envoie sur WhatsApp</h3><p>Ta commande s'écrit toute seule. Tu n'as qu'à l'envoyer.</p></li><li><h3>Paie et reçois ton code</h3><p>Après confirmation du paiement, on t'envoie le code.</p></li></ol>`;
const accountPage=()=>{
 if(!supabaseClient)return head("Compte client","La connexion au service de comptes n'est pas configurée.")+`<section class="sec"><div class="w"><div class="empty"><h2>Configuration Supabase requise</h2><p>Vérifie l'URL et la clé publique Supabase dans supabase-config.js.</p></div></div></section>`;
 if(currentUser&&!accountReady)return head("Mon compte","Chargement de tes données…")+`<section class="sec"><div class="w profile-box">Connexion à ton compte…</div></section>`;
 if(currentUser)return head("Mon compte","Ton compte est connecté et tes informations sont synchronisées.")+`<section class="sec"><div class="w profile-box account-box"><p><b>${escapeHtml(currentUser.email||"")}</b></p><p class="account-role ${isAdmin()?"admin":""}">Rôle : ${accountRole==="admin"?"Administrateur":accountRole==="customer"?"Client":"Non vérifié"}</p><p class="admin-note">Tes commandes et favoris sont associés à ce compte.</p><div class="account-actions"><a class="btn d" href="#/profil">Modifier mon profil</a><a class="btn l" href="#/commandes">Mes commandes</a><button class="btn l" type="button" onclick="signOut()">Se déconnecter</button></div></div></section>`;
 if(accountMode==="forgot")return head("Réinitialiser le mot de passe","Nous t'enverrons un lien si un compte correspond à cette adresse.")+`<section class="sec"><div class="w profile-box account-box"><form class="account-form" onsubmit="sendPasswordReset(event)"><label class="f">Adresse e-mail<input name="email" type="email" autocomplete="email" required></label><button class="btn d" type="submit">Envoyer le lien</button></form><button class="text-button" type="button" onclick="accountMode='login';draw()">Retour à la connexion</button></div></section>`;
 if(accountMode==="reset")return head("Choisir un nouveau mot de passe","Choisis un mot de passe d'au moins 8 caractères.")+`<section class="sec"><div class="w profile-box account-box"><form class="account-form" onsubmit="submitAuth(event)"><label class="f">Nouveau mot de passe<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn d" type="submit">Modifier le mot de passe</button></form></div></section>`;
 const signup=accountMode==="signup";
 return head(signup?"Créer un compte":"Connexion","Un compte te permet de retrouver ton profil, tes favoris et tes commandes sur tes appareils.")+`<section class="sec"><div class="w profile-box account-box">${!signup&&accountNotice?`<p class="account-notice" role="status">${escapeHtml(accountNotice)}</p>`:""}<form class="account-form" onsubmit="submitAuth(event)">${signup?`<label class="f">Nom complet<input name="name" autocomplete="name" maxlength="120" required></label><label class="f">Numéro WhatsApp<input name="phone" autocomplete="tel" maxlength="40" required></label>`:""}<label class="f">Adresse e-mail<input name="email" type="email" autocomplete="email" required></label><label class="f">Mot de passe<input name="password" type="password" minlength="8" autocomplete="${signup?"new-password":"current-password"}" required></label><button class="btn d" type="submit">${signup?"Créer mon compte":"Se connecter"}</button></form>${signup?`<p class="account-switch">Tu as déjà un compte ? <button class="text-button" type="button" onclick="accountMode='login';draw()">Se connecter</button></p>`:`<p class="account-switch"><button class="text-button" type="button" onclick="accountMode='forgot';draw()">Mot de passe oublié ?</button></p><p class="account-switch">Pas encore de compte ? <button class="text-button" type="button" onclick="accountMode='signup';draw()">Créer un compte</button></p>`}<p class="secure-note">La confirmation de l'adresse e-mail peut être demandée avant la première connexion.</p></div></section>`;
};
const renderOrderCard=order=>`<article class="order-card"><div class="order-head"><b>${escapeHtml(order.id)}</b><span>${new Date(order.createdAt).toLocaleDateString("fr-FR")}</span></div><p>${escapeHtml(order.status)} · ${m(order.total)}</p><small>${(order.items||[]).map(item=>`${item.quantity} × ${escapeHtml(item.name)} ${item.face}${item.symbol}`).join(" · ")}</small></article>`;

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
 avis:()=>{const visibleReviews=reviews.filter(r=>r.approved!==false);return head("Avis clients","Partage ton expérience avec la communauté Apex Gaming.")+`<section class="sec"><div class="w"><div class="review-grid">${visibleReviews.length?visibleReviews.map(r=>`<article class="review"><div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><p>“${escapeHtml(r.message)}”</p><b>${escapeHtml(r.name)}</b></article>`).join(""):`<div class="empty"><h2>Pas encore d'avis publiés</h2><p>Sois le premier à partager ton expérience.</p></div>`}</div><div class="review-form-box"><h2>Écrire un avis</h2><form class="review-form" onsubmit="submitReview(event)"><label class="f">Ton nom<input name="reviewName" maxlength="50" required></label><label class="f">Note<select name="reviewRating"><option value="5">5 étoiles</option><option value="4">4 étoiles</option><option value="3">3 étoiles</option><option value="2">2 étoiles</option><option value="1">1 étoile</option></select></label><label class="f">Ton message<textarea name="reviewMessage" rows="4" maxlength="500" required></textarea></label><button class="btn d" type="submit">Publier mon avis</button></form><p class="admin-note">Les avis sont vérifiés avant publication.</p></div></div></section>`},
 commandes:()=>{
  const history=currentUser?accountOrders:orders;
  return head("Mes commandes",currentUser?"Retrouve ici les commandes associées à ton compte.":"Connecte-toi pour synchroniser tes commandes. Le suivi invité reste disponible par référence.")+`<section class="sec"><div class="w">${currentUser?"":`<div class="lookup-box"><h2>Suivre une commande invitée</h2><p class="ld">Entre la référence reçue et le numéro utilisé sur WhatsApp.</p><div class="checkout-grid"><label class="f">Référence<input id="lookupId" placeholder="AG-..." value="${orderLookup?escapeHtml(orderLookup.id):""}"></label><label class="f">Numéro WhatsApp<input id="lookupPhone" placeholder="0973..." value="${escapeHtml(profile.phone)}"></label></div><button class="btn d" type="button" onclick="lookupOrder()">Vérifier le statut</button>${orderLookup?`<div class="lookup-result"><b>${escapeHtml(orderLookup.id)}</b><span>${escapeHtml(orderLookup.status)} · ${m(orderLookup.total)}</span></div>`:""}<p class="secure-note"><a href="#/compte">Créer un compte ou se connecter</a> pour retrouver les prochaines commandes ici.</p></div>`}${history.length?`<div class="orders">${history.map(renderOrderCard).join("")}</div>`:`<div class="empty"><h2>${currentUser?"Aucune commande liée à ce compte":"Aucune commande sur cet appareil"}</h2><p>${currentUser?"Tes prochaines commandes apparaîtront ici après leur envoi sur WhatsApp.":"Connecte-toi pour synchroniser tes prochaines commandes entre appareils."}</p><a class="btn d" href="#/boutique">Voir la boutique</a>${currentUser?"":` <a class="btn l" href="#/compte">Connexion / inscription</a>`}</div>`}</div></section>`;
 },
 profil:()=>head("Mon profil","Enregistre tes coordonnées pour commander plus rapidement.")+`<section class="sec"><div class="w profile-box">${currentUser?`<p class="account-email">Adresse du compte : <b>${escapeHtml(currentUser.email||"")}</b></p>`:`<p class="secure-note">Enregistre ces coordonnées dans ce navigateur ou <a href="#/compte">crée un compte</a> pour les synchroniser.</p>`}<form class="profile-form" onsubmit="saveCustomerProfile(event)"><label class="f">Nom complet<input name="name" value="${escapeHtml(profile.name)}" autocomplete="name" required></label><label class="f">Numéro WhatsApp<input name="phone" value="${escapeHtml(profile.phone)}" autocomplete="tel" required></label>${currentUser?"":`<label class="f">E-mail (facultatif)<input name="email" type="email" value="${escapeHtml(profile.email)}" autocomplete="email"></label>`}<button class="btn d" type="submit">Enregistrer mon profil</button></form>${currentUser?`<p class="admin-note">Ton nom et ton numéro WhatsApp sont enregistrés dans ton compte.</p><button class="btn l" type="button" onclick="signOut()">Se déconnecter</button>`:`<p class="admin-note">Sans compte, ces informations restent enregistrées uniquement dans ce navigateur.</p>`}</div></section>`,
 compte:()=>accountPage(),
 conditions:()=>head("Conditions générales","Les règles de fonctionnement d'Apex Gaming.")+`<section class="sec"><div class="w pr"><h2>Commande</h2><p>Les prix affichés sont indicatifs jusqu'à la confirmation de la disponibilité et du montant sur WhatsApp.</p><h2>Paiement</h2><p>Le paiement est effectué uniquement après confirmation de la commande. Vérifie toujours le numéro communiqué avant tout transfert.</p><h2>Codes numériques</h2><p>Un code livré ne peut généralement pas être repris ou échangé s'il a été utilisé ou communiqué à un tiers.</p></div></section>`,
 confidentialite:()=>head("Confidentialité","Comment nous utilisons tes informations.")+`<section class="sec"><div class="w pr"><h2>Données collectées</h2><p>Le nom, le numéro WhatsApp, l'e-mail et les détails de commande servent uniquement à traiter ta demande.</p><h2>Avec un compte</h2><p>Le profil, les favoris et les commandes sont enregistrés dans Supabase et associés à ton compte. Sans compte, le panier et les préférences restent locaux à ce navigateur.</p><h2>Contact</h2><p>Pour demander une correction ou une suppression, contacte Apex Gaming sur WhatsApp.</p></div></section>`,
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
 ${isAdmin()?`<div class="ga">Réel ${cost.toFixed(2)} $ · gain ${(pr-cost).toFixed(2)} $</div>`:""}</article>`}).join("")}</div></div>`},

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

admin:()=>adminPage(),
};

/* ===== AFFICHAGE ET NAVIGATION ===== */
function draw(keep){
 const y=scrollY,h=location.hash.replace(/^#\/?/,"").split("/"),a=h[0];
 const adminView=a==="admin"&&isAdmin();
 document.body.classList.toggle("admin-mode",adminView);
 $("main").innerHTML=a==="admin"&&!isAdmin()
  ?head("Accès réservé","Connecte-toi avec un compte administrateur pour ouvrir cette page.")+`<section class="sec"><div class="w"><div class="empty"><h2>Accès administrateur requis</h2><p>Le rôle est vérifié depuis le profil Supabase connecté.</p><a class="btn d" href="#/compte">Ouvrir mon compte</a></div></div></section>`
  :(R[a]||R[""])(h[1],h[2]);
 const logo=document.querySelector(".logo");
 logo.href=adminView?"#/admin":"#/";
 logo.setAttribute("aria-label",adminView?"Espace d’administration Apex Gaming":"Apex Gaming, accueil");
 logo.querySelector("span").innerHTML=adminView?"APEX<b>ADMIN</b>":"APEX<b>GAMING</b>";
 const n=count();
 const navPages=[...PAGES,["compte",currentUser?"Mon compte":"Connexion"]];
 if(isAdmin())navPages.push(["admin","Administration"]);
 $("nav").innerHTML=adminView?`<a href="#/admin" class="on">Tableau admin</a><a href="#/">Voir le site</a><button type="button" class="admin-nav-signout" onclick="signOut()">Se déconnecter</button>`:navPages.map(p=>`<a href="#/${p[0]}" ${p[0]==a||(a=="p"&&p[0]=="boutique")?'class="on"':""}>${p[1]}</a>`).join("")+`<a href="#/favoris" class="${a=="favoris"?"on":""}">Favoris (${favorites.length})</a><a href="#/panier" class="${a=="panier"?"on":""}">Panier (${n})</a>`;
 $("themeToggle").hidden=adminView;$("bg").hidden=adminView;
 const old=document.getElementById("cb");if(old)old.remove();
 if(n&&a!="panier"&&!adminView){const b=document.createElement("div");b.className="bar";b.id="cb";b.innerHTML=`<span><b>${n}</b> article${n>1?"s":""} · <b>${m(total())}</b></span><a class="btn d" href="#/panier">Voir le panier</a>`;document.body.appendChild(b)}
 applyTheme();
 if(keep)scrollTo(0,y);
 if(adminView&&!adminDataLoaded&&!adminDataLoading)loadAdminData();
}
addEventListener("hashchange",()=>{
 const h=location.hash.replace(/^#\/?/,"").split("/");
 sel={g:h[0]=="p"&&h[2]!=null?+h[2]||0:0,c:0};
 $("nav").classList.remove("o");$("bg").setAttribute("aria-expanded","false");$("bg").setAttribute("aria-label","Ouvrir le menu");$("bg").textContent="☰";draw();scrollTo(0,0);
});
draw();
initializeAccount();
loadStorefrontConfig();
