/* ============================================================
   ALL STAR LOC — i18n & devises
   Langues : FR (défaut), EN, ES, AR (RTL)
   Devises : MAD (principale), EUR, USD, GBP — base de calcul : MAD
   Persistance : localStorage (asl_lang / asl_currency)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- DICTIONNAIRE ---------------- */
  var I18N = {

  /* ============ FRANÇAIS ============ */
  fr: {
    'nav.home':'Accueil','nav.fleet':'Nos Véhicules','nav.about':'À propos','nav.contact':'Contact','nav.book':'Réserver','nav.wa247':'WhatsApp 24h/7j',
    'hero.badge':'Agence à Marrakech · Depuis 2009',
    'hero.titleHtml':'Location de Voiture<br>à Marrakech <span>Sans Surprise</span>',
    'hero.sub':"Livraison gratuite à l'aéroport Ménara (RAK), au centre-ville et à votre hôtel. Flotte récente, assurance incluse, kilométrage illimité et prix transparents.",
    'hero.bookCta':'Réserver maintenant','hero.f1':'Livraison aéroport gratuite','hero.f2':'Disponible 24h/24, 7j/7','hero.f3':'Service premium','hero.f4':'Assistance personnalisée',
    'bk.title':'Réservez votre voiture','bk.pickup':'Lieu de prise en charge','bk.return':'Lieu de retour','bk.dep':'Départ','bk.ret':'Retour',
    'bk.stepHint':'1. Choisissez vos dates · 2. Trouvez votre voiture','bk.needDates':"Veuillez d'abord sélectionner vos dates de location.",'fleet.unavail':'Indisponible sur ces dates','fleet.availFrom':'Disponible à partir du {d}','fleet.editDates':'Modifier mes dates','f.missing':'Veuillez renseigner les champs obligatoires : nom complet, téléphone et numéro de permis.','sp.ac':'Climatisation','sp.cam':'Caméra de recul','sp.doors':'{n} portes','sp.trunk':'Coffre : {v}','sp.insur':'Assurance incluse','sp.airport':'Livraison aéroport','sp.deposit':'Caution : {v}','bk.depSub':'Date de départ','bk.retSub':'Date de retour','bk.find':'Trouver une voiture','bk.dur':'Durée : {n} {d}',
    'vp.h1':'Notre flotte de location à Marrakech','vp.lead':'Citadines, berlines et SUV récents — assurance incluse, kilométrage illimité et tarifs dégressifs selon la durée.','vp.degressive':'Tarifs dégressifs selon la durée de location.','vp.ctaTitle':'Prêt à réserver ?','vp.ctaText':'La réservation se fait sur la page d\'accueil : choisissez vos dates, puis votre véhicule.','vp.ctaBtn':'Choisir mes dates et réserver','vp.empty':'Aucun véhicule dans cette catégorie pour le moment.','u.seats':'places','u.day':'jour','u.days':'jours','u.perDay':'/j','u.perDayLong':'/ jour',
    'loc.airport':'Aéroport Marrakech (RAK)','loc.center':'Centre-Ville Marrakech','loc.station':'Gare Marrakech','loc.hotel':'Votre Hôtel',
    'cal.hintStart':'Sélectionnez votre date de départ','cal.hintEnd':'Sélectionnez votre date de retour',
    'cal.months':['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    'cal.days':['Lu','Ma','Me','Je','Ve','Sa','Di'],
    'cal.aria':'Calendrier de réservation','cal.prevM':'Mois précédent','cal.nextM':'Mois suivant','cal.ariaStart':'Choisir la date de départ','cal.ariaEnd':'Choisir la date de retour',
    'trust.t1':'Livraison Aéroport Gratuite','trust.t2':'Assurance Incluse','trust.t3':'Service 24h/7j','trust.t4':'Prix Sans Frais Cachés','trust.t5':'Kilométrage Illimité',
    'fleet.badge':'Notre Flotte','fleet.titleHtml':'Choisissez le Véhicule<br><span>Idéal pour Marrakech</span>',
    'fleet.sub':'Tous nos véhicules sont récents, propres et régulièrement entretenus.',
    'filt.all':'Toutes','filt.city':'Citadines','filt.eco':'Économiques','filt.suv':'SUV','filt.fam':'Familiales',
    'fleet.emptyHtml':"Aucun véhicule disponible dans cette catégorie pour le moment.<br>Contactez-nous sur WhatsApp pour connaître nos disponibilités.",
    'car.seats':'{n} places','car.unl':'Illimité','car.tierHint':'Tarif selon durée sélectionnée','car.book':'Réserver maintenant',
    'veh.Automatique':'Automatique','veh.Manuelle':'Manuelle','veh.Diesel':'Diesel','veh.Essence':'Essence',
    'why.badge':'Pourquoi Nous','why.titleHtml':'Pourquoi Choisir<br><span>ALL STAR LOC ?</span>',
    'why.t1':'Livraison Aéroport','why.d1':"Prise en charge et retour gratuits à l'aéroport Ménara RAK, quelle que soit l'heure d'arrivée.",
    'why.t2':'Assurance Complète','why.d2':"Tous nos véhicules sont couverts par une assurance tous risques pour votre tranquillité d'esprit.",
    'why.t3':'Disponible 24h/7j','why.d3':'Notre équipe est joignable à toute heure par téléphone ou WhatsApp pour vous assister.',
    'why.t4':'Paiement Flexible','why.d4':'Payez en ligne, en acompte ou sur place. Plusieurs devises acceptées : MAD, EUR, USD, GBP.',
    'why.t5':'Livraison à Domicile','why.d5':'Nous livrons votre voiture directement à votre hôtel, riad ou adresse à Marrakech.',
    'why.t6':"17 Ans d'Expérience",'why.d6':'Plus de 500 clients satisfaits et une note de 4.8/5 sur Google confirment notre sérieux.',
    'rev.badge':'Avis Clients','rev.titleHtml':'Ce que Disent<br><span>Nos Clients</span>',
    'ft.tag':'Location de Voiture Marrakech',
    'ft.desc':'Votre agence de confiance depuis 2009. Flotte moderne, service premium, disponible 24h/7j. Livraison gratuite aéroport et hôtel.',
    'ft.wa247':'WhatsApp 24h/7j',
    'ft.colServices':'Nos Services','ft.s1':'Location Courte Durée','ft.s2':'Location Longue Durée','ft.s3':'Livraison Aéroport','ft.s4':'Livraison Hôtel','ft.s5':'Location avec Chauffeur','ft.s6':'Transfert Privé',
    'ft.colQuick':'Liens Rapides','ft.qAdmin':'Espace Admin',
    'ft.colLegal':'Légal','ft.lCgv':'Conditions Générales','ft.lPriv':'Politique de Confidentialité','ft.lLegal':'Mentions Légales',
    'ft.colCur':'Devises',
    'ft.copy':'© 2025 All Star Loc — Location de Voitures à Marrakech. Tous droits réservés.',
    'ft.bCgv':'CGV','ft.bPriv':'Confidentialité','ft.bLegal':'Mentions légales',
    'pf.blog':'Blog','pf.faq':'FAQ',
    'wa.tooltip':"Besoin d'aide ?",
    'dr.step':'ÉTAPE {n} / 5','dr.done':'RÉSERVATION CONFIRMÉE',
    'dr.s1':'Protection','dr.s2':'Options','dr.s3':'Résumé','dr.s4':'Vos Informations','dr.s5':'Paiement','dr.s6':'Confirmation',
    'dr.p1':'Protection','dr.p2':'Options','dr.p3':'Résumé','dr.p4':'Infos','dr.p5':'Paiement','dr.p6':'Confirmation',
    'dr.total':'Total estimé','dr.next':'Continuer',
    'recap.edit':'Modifier','recap.timerHtml':'Session expire dans <strong id="timer-display">05:00</strong>. Réservez maintenant pour garantir ce tarif.',
    'prot.title':'Sélectionnez votre protection','prot.free':'Gratuit',
    'prot.basic.name':'Protection Basique','prot.basic.desc':'Incluse dans la location. Franchise standard en cas de sinistre.',
    'prot.basic.f':['Assurance RC incluse','Franchise 3000 MAD','Assistance basique'],
    'prot.premium.name':'Protection Premium','prot.premium.desc':'Assurance Tous Risques avec franchise réduite.',
    'prot.premium.f':['Tous risques','Franchise 1000 MAD','Assistance 24h','Vol couvert'],
    'prot.full.name':'Protection Tout Risque','prot.full.desc':'Couverture totale, zéro franchise, tranquillité absolue.',
    'prot.full.f':['Zéro franchise','Vol + Bris de glace','Assistance Premium','Conducteur remplaçant'],
    'opt.title':'Ajoutez vos options (optionnel)','opt.add':'Ajouter','opt.added':'Ajouté',
    'opt.extra-driver':'Conducteur Supplémentaire','opt.baby-seat':'Siège Bébé','opt.booster':'Réhausseur Enfant','opt.gps':'GPS Portable','opt.wifi':'Wifi Portable','opt.charger':'Cable Chargeur','opt.fuel':'Option Plein Carburant','opt.fridge':'Réfrigérateur Portable','opt.roadside':'Assistance Dépannage+',
    'sum.rentTier':'Location · {n} j · {p}/jour','sum.tierApplied':'Tarif appliqué : {b}','sum.degressive':'Tarifs dégressifs selon la durée : le prix journalier baisse quand la durée augmente.','sum.deposit':'Caution (restituée au retour)','sum.rent':'Location véhicule ({n}j × {p})','sum.total':'TOTAL','sum.fullDisc':'Réduction paiement complet','sum.promo':'Code promo',
    'f.first':'Prénom','f.last':'Nom','f.email':'Email','f.phone':'Téléphone','f.wa':'WhatsApp','f.addr':'Adresse','f.country':'Pays / Nationalité','f.countryPh':'Sélectionner votre pays','f.flight':'Numéro de vol (optionnel)','f.notes':'Détails supplémentaires (optionnel)','f.docs':'Documents','f.lic':'N° Permis de conduire','f.pass':'N° Passeport / CIN','f.docsNote':'Documents vérifiés lors de la remise des clés. Upload possible en agence.',
    'ph.first':'Entrez votre prénom','ph.last':'Entrez votre nom','ph.email':'email@exemple.com','ph.phone':'6XXXXXXXX','ph.addr':'Votre adresse complète','ph.flight':'AT234, RAM203...','ph.notes':"Heure d'arrivée, numéro de porte, demandes spéciales...",'ph.lic':'Ex: AB123456','ph.pass':'Ex: XX1234567','ph.promo':'Entrez votre code promo',
    'c.ma':'Maroc','c.fr':'France','c.es':'Espagne','c.uk':'Royaume-Uni','c.us':'États-Unis','c.de':'Allemagne','c.it':'Italie','c.be':'Belgique','c.nl':'Pays-Bas','c.other':'Autre',
    'pay.agency':'Paiement à l\'agence','pay.agencyDesc':'Réglez sur place lors du retrait de votre véhicule à notre agence de Guéliz.',
    'pay.delivery':'Paiement à la livraison','pay.deliveryDesc':'Réglez au moment de la remise des clés (aéroport, hôtel ou adresse).',
    'pay.transfer':'Paiement par virement bancaire','pay.transferDesc':'Nos coordonnées bancaires vous seront envoyées après validation de la demande.',
    'pay.wa':'Paiement via WhatsApp après validation','pay.waDesc':'Notre équipe vous envoie un lien ou les modalités de paiement sur WhatsApp.',
    'pay.confirmBtn':'Confirmer la réservation','pay.awaiting':'En attente de paiement',
    'cf.statusLabel':'Statut',
    'legal.close':'Fermer','legal.read':'J\'ai lu et compris','legal.loading':'Chargement du document…',
    'pay.title':'Choisissez votre mode de paiement',
    'pay.full':'Paiement Complet','pay.fullPromo':'Meilleure offre — Réduction de 5% appliquée','pay.fullDesc':'Payez la totalité maintenant et économisez.',
    'pay.adv':'Paiement par Avance (40%)','pay.advDesc':'Payez 40% maintenant, le reste à la livraison.',
    'pay.onsite':"Paiement à l'Agence",'pay.onsiteDesc':'Réservation gratuite, paiement sur place à la livraison.',
    'pay.promoLabel':'Code Promo (optionnel)','pay.apply':'Appliquer','pay.applied':'Code appliqué — {n}% de réduction','pay.invalid':'Code promo invalide',
    'pay.termsHtml':'J\'ai lu et j\'accepte les <a href="pages/cgv.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'cgv\');">conditions générales de location</a> et la <a href="pages/privacy.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'privacy\');">politique de confidentialité</a> d\'ALL STAR LOC.',
    'pay.acceptAlert':'Veuillez accepter les conditions générales.',
    'cf.title':'Réservation Confirmée !',
    'cf.sub':'Merci {name} ! Votre demande de réservation a été envoyée avec succès. Notre équipe vous contactera rapidement pour confirmer la disponibilité et finaliser le paiement.',
    'cf.refLabel':'Numéro de réservation','cf.recap':'Récapitulatif','cf.total':'Total','cf.payFull':'Paiement complet','cf.payAdv':'Acompte 40%','cf.payOnsite':'Paiement sur place','cf.waBtn':'Confirmer ma réservation sur WhatsApp',
    'pg.back':"Retour à l'accueil",
    'cta.h3':'Prêt à prendre la route ?','cta.p':"Réservez votre voiture en 2 minutes, livraison gratuite à l'aéroport de Marrakech.",'cta.btn':'Voir nos véhicules',
    'pf.copy':'© 2026 ALL STAR LOC — Location de voiture à Marrakech depuis 2009',
    'ab.badge':'Notre Histoire','ab.h1Html':'ALL STAR LOC',
    'ab.lead':'Une agence familiale de location de voiture, fondée sur la confiance, la transparence et le service.',
    'ab.who':'Qui sommes-nous ?',
    'ab.p1Html':'<strong>ALL STAR LOC</strong> est une agence de location de voitures basée à Marrakech, au 29 Rue Yougoslavie, en plein cœur de Guéliz. Depuis 2009, nous accompagnons voyageurs, familles et professionnels dans leurs déplacements à Marrakech et partout au Maroc.',
    'ab.p2':"Notre conviction est simple : louer une voiture en vacances ne devrait jamais être une source de stress. Pas de frais cachés, pas de mauvaises surprises à la restitution, pas d'attente interminable au comptoir. Juste une voiture propre, récente, et une équipe joignable à toute heure.",
    'ab.commit':'Nos engagements',
    'ab.c1Html':"<strong>Livraison gratuite à l'aéroport Ménara (RAK)</strong> — nous vous attendons à votre arrivée, quelle que soit l'heure, panneau à la main.",
    'ab.c2Html':'<strong>Disponibilité 24h/7j</strong> — un numéro WhatsApp unique pour toute question, avant, pendant et après la location.',
    'ab.c3Html':"<strong>Kilométrage illimité</strong> — explorez Essaouira, l'Atlas, Ouarzazate ou Agadir sans compter.",
    'ab.c4Html':'<strong>Flotte récente et entretenue</strong> — chaque véhicule est contrôlé, nettoyé et désinfecté entre deux locations.',
    'ab.c5Html':'<strong>Transparence totale</strong> — le prix affiché est le prix payé. Assurance responsabilité civile toujours incluse.',
    'ab.nums':'Quelques chiffres',
    'ab.numsHtml':"<strong>+500</strong> clients satisfaits · <strong>4.8/5</strong> sur Google · <strong>17 ans</strong> d'expérience · <strong>11+</strong> véhicules en flotte · Clients de <strong>15+ nationalités</strong>",
    'ab.where':'Où nous trouver','ab.callNote':'(appel & WhatsApp)',
    'ct.fTitle':'Envoyez-nous un message','ct.fIntro':'Remplissez ce formulaire : votre demande nous est transmise immédiatement et nous vous répondons en moins de 15 minutes.',
    'ct.fName':'Nom complet','ct.fNamePh':'Votre nom et prénom','ct.fPhone':'Téléphone','ct.fPhonePh':'+212 6 XX XX XX XX',
    'ct.fEmail':'Email','ct.fEmailPh':'email@exemple.com','ct.fSubject':'Sujet','ct.fSubjectPh':'Réservation, devis, question…',
    'ct.fMsg':'Message','ct.fMsgPh':'Décrivez votre demande (dates, véhicule souhaité, lieu…)',
    'ct.fSend':'Envoyer la demande','ct.fNote':'Envoi via WhatsApp — réponse en moins de 15 minutes, 24h/7j.',
    'ct.fOk':'Votre demande a été préparée et transmise. Notre équipe vous répond très rapidement — merci !',
    'ct.fErr':'Veuillez renseigner au minimum votre nom, un moyen de contact et votre message.',
    'ct.badge':'Contactez-nous','ct.h1Html':'Nous sommes là<br><span>24h/24, 7j/7</span>',
    'ct.lead':'Une question, une demande spéciale, un devis longue durée ? Réponse en moins de 15 minutes sur WhatsApp.',
    'ct.coords':'Nos coordonnées',
    'ct.waTag':'WhatsApp (recommandé)','ct.waText':'Réponse en moins de 15 minutes, 24h/7j. Idéal pour réserver, demander un devis ou poser une question.','ct.waBtn':'Ouvrir WhatsApp',
    'ct.telTag':'Téléphone','ct.telText':'Appelez-nous directement pour toute urgence ou assistance pendant votre location.','ct.telBtn':'Appeler maintenant',
    'ct.mailTag':'Email','ct.mailText':'Pour les demandes de devis détaillés, les locations longue durée et les partenariats.','ct.mailBtn':'Écrire un email',
    'ct.agTag':'Agence','ct.agTitle':'29 Rue Yougoslavie, Guéliz','ct.agText':'Marrakech 40000, Maroc. Ouvert tous les jours. Parking à proximité.','ct.agBtn':'Voir sur Google Maps',
    'ct.serv':'Services sur demande','ct.servIntro':'En plus de la location classique, contactez-nous pour :',
    'ct.s1Html':'<strong>Livraison à votre hôtel ou riad</strong> à Marrakech — nous amenons la voiture directement à votre hébergement.',
    'ct.s2Html':"<strong>Location avec chauffeur</strong> — excursions, transferts d'affaires, mariages et événements.",
    'ct.s3Html':'<strong>Transfert privé</strong> — aéroport ↔ hôtel, Marrakech ↔ Essaouira, Agadir, Casablanca…',
    'ct.s4Html':'<strong>Location longue durée</strong> — tarifs dégressifs au mois pour expatriés et professionnels (<a href="lld.html">en savoir plus</a>).',
  },

  /* ============ ENGLISH ============ */
  en: {
    'nav.home':'Home','nav.fleet':'Our Vehicles','nav.about':'About','nav.contact':'Contact','nav.book':'Book Now','nav.wa247':'WhatsApp 24/7',
    'hero.badge':'Marrakech Agency · Since 2009',
    'hero.titleHtml':'Car Rental<br>in Marrakech <span>With No Surprises</span>',
    'hero.sub':'Free delivery at Menara Airport (RAK), in the city centre and at your hotel. Recent fleet, insurance included, unlimited mileage and transparent prices.',
    'hero.bookCta':'Book now','hero.f1':'Free airport delivery','hero.f2':'Available 24/7','hero.f3':'Premium service','hero.f4':'Personalised assistance',
    'bk.title':'Book your car','bk.pickup':'Pick-up location','bk.return':'Return location','bk.dep':'Pick-up','bk.ret':'Return',
    'bk.stepHint':'1. Pick your dates · 2. Find your car','bk.needDates':'Please select your rental dates first.','fleet.unavail':'Unavailable on these dates','fleet.availFrom':'Available from {d}','fleet.editDates':'Change my dates','f.missing':'Please fill in the required fields: full name, phone and driving licence number.','sp.ac':'Air conditioning','sp.cam':'Reversing camera','sp.doors':'{n} doors','sp.trunk':'Boot: {v}','sp.insur':'Insurance included','sp.airport':'Airport delivery','sp.deposit':'Deposit: {v}','bk.depSub':'Pick-up date','bk.retSub':'Return date','bk.find':'Find a car','bk.dur':'Duration: {n} {d}',
    'vp.h1':'Our rental fleet in Marrakech','vp.lead':'Recent city cars, sedans and SUVs — insurance included, unlimited mileage and tiered pricing.','vp.degressive':'Tiered pricing by rental duration.','vp.ctaTitle':'Ready to book?','vp.ctaText':'Booking is done on the home page: choose your dates, then your vehicle.','vp.ctaBtn':'Choose my dates and book','vp.empty':'No vehicles in this category at the moment.','u.seats':'seats','u.day':'day','u.days':'days','u.perDay':'/day','u.perDayLong':'/ day',
    'loc.airport':'Marrakech Airport (RAK)','loc.center':'Marrakech City Centre','loc.station':'Marrakech Train Station','loc.hotel':'Your Hotel',
    'cal.hintStart':'Select your pick-up date','cal.hintEnd':'Select your return date',
    'cal.months':['January','February','March','April','May','June','July','August','September','October','November','December'],
    'cal.days':['Mo','Tu','We','Th','Fr','Sa','Su'],
    'cal.aria':'Booking calendar','cal.prevM':'Previous month','cal.nextM':'Next month','cal.ariaStart':'Choose the pick-up date','cal.ariaEnd':'Choose the return date',
    'trust.t1':'Free Airport Delivery','trust.t2':'Insurance Included','trust.t3':'24/7 Service','trust.t4':'No Hidden Fees','trust.t5':'Unlimited Mileage',
    'fleet.badge':'Our Fleet','fleet.titleHtml':'Choose the Ideal<br><span>Vehicle for Marrakech</span>',
    'fleet.sub':'All our vehicles are recent, clean and regularly serviced.',
    'filt.all':'All','filt.city':'City Cars','filt.eco':'Economy','filt.suv':'SUV','filt.fam':'Family',
    'fleet.emptyHtml':'No vehicle available in this category at the moment.<br>Contact us on WhatsApp to check availability.',
    'car.seats':'{n} seats','car.unl':'Unlimited','car.tierHint':'Price based on selected duration','car.book':'Book now',
    'veh.Automatique':'Automatic','veh.Manuelle':'Manual','veh.Diesel':'Diesel','veh.Essence':'Petrol',
    'why.badge':'Why Us','why.titleHtml':'Why Choose<br><span>ALL STAR LOC?</span>',
    'why.t1':'Airport Delivery','why.d1':'Free pick-up and return at Menara RAK airport, whatever your arrival time.',
    'why.t2':'Full Insurance','why.d2':'All our vehicles are covered by comprehensive insurance for your peace of mind.',
    'why.t3':'Available 24/7','why.d3':'Our team can be reached at any time by phone or WhatsApp to assist you.',
    'why.t4':'Flexible Payment','why.d4':'Pay online, by deposit or on site. Several currencies accepted: MAD, EUR, USD, GBP.',
    'why.t5':'Hotel Delivery','why.d5':'We deliver your car directly to your hotel, riad or address in Marrakech.',
    'why.t6':'17 Years of Experience','why.d6':'Over 500 satisfied customers and a 4.8/5 rating on Google confirm our reliability.',
    'rev.badge':'Customer Reviews','rev.titleHtml':'What Our<br><span>Customers Say</span>',
    'ft.tag':'Car Rental Marrakech',
    'ft.desc':'Your trusted agency since 2009. Modern fleet, premium service, available 24/7. Free airport and hotel delivery.',
    'ft.wa247':'WhatsApp 24/7',
    'ft.colServices':'Our Services','ft.s1':'Short-Term Rental','ft.s2':'Long-Term Rental','ft.s3':'Airport Delivery','ft.s4':'Hotel Delivery','ft.s5':'Chauffeur Service','ft.s6':'Private Transfer',
    'ft.colQuick':'Quick Links','ft.qAdmin':'Admin Area',
    'ft.colLegal':'Legal','ft.lCgv':'Terms & Conditions','ft.lPriv':'Privacy Policy','ft.lLegal':'Legal Notice',
    'ft.colCur':'Currencies',
    'ft.copy':'© 2025 All Star Loc — Car Rental in Marrakech. All rights reserved.',
    'ft.bCgv':'Terms','ft.bPriv':'Privacy','ft.bLegal':'Legal notice',
    'pf.blog':'Blog','pf.faq':'FAQ',
    'wa.tooltip':'Need help?',
    'dr.step':'STEP {n} / 5','dr.done':'BOOKING CONFIRMED',
    'dr.s1':'Protection','dr.s2':'Options','dr.s3':'Summary','dr.s4':'Your Details','dr.s5':'Payment','dr.s6':'Confirmation',
    'dr.p1':'Protection','dr.p2':'Options','dr.p3':'Summary','dr.p4':'Details','dr.p5':'Payment','dr.p6':'Confirmation',
    'dr.total':'Estimated total','dr.next':'Continue',
    'recap.edit':'Edit','recap.timerHtml':'Session expires in <strong id="timer-display">05:00</strong>. Book now to lock in this rate.',
    'prot.title':'Select your protection','prot.free':'Free',
    'prot.basic.name':'Basic Protection','prot.basic.desc':'Included in the rental. Standard excess in case of damage.',
    'prot.basic.f':['Third-party insurance included','Excess 3000 MAD','Basic assistance'],
    'prot.premium.name':'Premium Protection','prot.premium.desc':'Comprehensive insurance with reduced excess.',
    'prot.premium.f':['Fully comprehensive','Excess 1000 MAD','24h assistance','Theft covered'],
    'prot.full.name':'Full Cover Protection','prot.full.desc':'Total coverage, zero excess, absolute peace of mind.',
    'prot.full.f':['Zero excess','Theft + Glass breakage','Premium assistance','Replacement driver'],
    'opt.title':'Add your options (optional)','opt.add':'Add','opt.added':'Added',
    'opt.extra-driver':'Additional Driver','opt.baby-seat':'Baby Seat','opt.booster':'Child Booster Seat','opt.gps':'Portable GPS','opt.wifi':'Portable WiFi','opt.charger':'Charging Cable','opt.fuel':'Full Tank Option','opt.fridge':'Portable Fridge','opt.roadside':'Roadside Assistance+',
    'sum.rentTier':'Rental · {n} d · {p}/day','sum.tierApplied':'Rate applied: {b}','sum.degressive':'Tiered pricing by duration: the daily price drops as the rental gets longer.','sum.deposit':'Deposit (refunded on return)','sum.rent':'Vehicle rental ({n}d × {p})','sum.total':'TOTAL','sum.fullDisc':'Full payment discount','sum.promo':'Promo code',
    'f.first':'First name','f.last':'Last name','f.email':'Email','f.phone':'Phone','f.wa':'WhatsApp','f.addr':'Address','f.country':'Country / Nationality','f.countryPh':'Select your country','f.flight':'Flight number (optional)','f.notes':'Additional details (optional)','f.docs':'Documents','f.lic':'Driving licence no.','f.pass':'Passport / ID no.','f.docsNote':'Documents checked at key handover. Upload possible at the agency.',
    'ph.first':'Enter your first name','ph.last':'Enter your last name','ph.email':'email@example.com','ph.phone':'6XXXXXXXX','ph.addr':'Your full address','ph.flight':'AT234, RAM203...','ph.notes':'Arrival time, gate number, special requests...','ph.lic':'E.g. AB123456','ph.pass':'E.g. XX1234567','ph.promo':'Enter your promo code',
    'c.ma':'Morocco','c.fr':'France','c.es':'Spain','c.uk':'United Kingdom','c.us':'United States','c.de':'Germany','c.it':'Italy','c.be':'Belgium','c.nl':'Netherlands','c.other':'Other',
    'pay.agency':'Pay at the agency','pay.agencyDesc':'Pay on site when collecting your vehicle at our Guéliz agency.',
    'pay.delivery':'Pay on delivery','pay.deliveryDesc':'Pay at key handover (airport, hotel or address).',
    'pay.transfer':'Pay by bank transfer','pay.transferDesc':'Our bank details will be sent to you once the request is validated.',
    'pay.wa':'Pay via WhatsApp after validation','pay.waDesc':'Our team sends you a payment link or instructions on WhatsApp.',
    'pay.confirmBtn':'Confirm booking','pay.awaiting':'Awaiting payment',
    'cf.statusLabel':'Status',
    'legal.close':'Close','legal.read':'I have read and understood','legal.loading':'Loading document…',
    'pay.title':'Choose your payment method',
    'pay.full':'Full Payment','pay.fullPromo':'Best offer — 5% discount applied','pay.fullDesc':'Pay the full amount now and save.',
    'pay.adv':'Advance Payment (40%)','pay.advDesc':'Pay 40% now, the rest on delivery.',
    'pay.onsite':'Pay at the Agency','pay.onsiteDesc':'Free booking, payment on site at delivery.',
    'pay.promoLabel':'Promo Code (optional)','pay.apply':'Apply','pay.applied':'Code applied — {n}% discount','pay.invalid':'Invalid promo code',
    'pay.termsHtml':'I have read and accept ALL STAR LOC\'s <a href="pages/cgv.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'cgv\');">rental terms and conditions</a> and <a href="pages/privacy.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'privacy\');">privacy policy</a>.',
    'pay.acceptAlert':'Please accept the terms and conditions.',
    'cf.title':'Booking Confirmed!',
    'cf.sub':'Thank you {name}! Your booking request has been sent successfully. Our team will contact you shortly to confirm availability and finalise the payment.',
    'cf.refLabel':'Booking reference','cf.recap':'Summary','cf.total':'Total','cf.payFull':'Full payment','cf.payAdv':'40% deposit','cf.payOnsite':'Pay on site','cf.waBtn':'Confirm my booking on WhatsApp',
    'pg.back':'Back to home',
    'cta.h3':'Ready to hit the road?','cta.p':'Book your car in 2 minutes, free delivery at Marrakech airport.','cta.btn':'See our vehicles',
    'pf.copy':'© 2026 ALL STAR LOC — Car rental in Marrakech since 2009',
    'ab.badge':'Our Story','ab.h1Html':'ALL STAR LOC',
    'ab.lead':'A family-run car rental agency built on trust, transparency and service.',
    'ab.who':'Who are we?',
    'ab.p1Html':'<strong>ALL STAR LOC</strong> is a car rental agency based in Marrakech, at 29 Rue Yougoslavie, in the heart of Guéliz. Since 2009, we have been supporting travellers, families and professionals in their journeys around Marrakech and throughout Morocco.',
    'ab.p2':'Our belief is simple: renting a car on holiday should never be a source of stress. No hidden fees, no nasty surprises at return, no endless queuing at the counter. Just a clean, recent car and a team you can reach at any time.',
    'ab.commit':'Our commitments',
    'ab.c1Html':'<strong>Free delivery at Menara Airport (RAK)</strong> — we wait for you on arrival, whatever the time, sign in hand.',
    'ab.c2Html':'<strong>24/7 availability</strong> — a single WhatsApp number for any question, before, during and after the rental.',
    'ab.c3Html':'<strong>Unlimited mileage</strong> — explore Essaouira, the Atlas, Ouarzazate or Agadir without counting kilometres.',
    'ab.c4Html':'<strong>Recent, well-maintained fleet</strong> — every vehicle is checked, cleaned and disinfected between rentals.',
    'ab.c5Html':'<strong>Total transparency</strong> — the price shown is the price paid. Third-party insurance always included.',
    'ab.nums':'A few numbers',
    'ab.numsHtml':'<strong>+500</strong> satisfied customers · <strong>4.8/5</strong> on Google · <strong>17 years</strong> of experience · <strong>11+</strong> vehicles in the fleet · Customers from <strong>15+ nationalities</strong>',
    'ab.where':'Where to find us','ab.callNote':'(call & WhatsApp)',
    'ct.fTitle':'Send us a message','ct.fIntro':'Fill in this form: your request is sent to us immediately and we reply within 15 minutes.',
    'ct.fName':'Full name','ct.fNamePh':'Your first and last name','ct.fPhone':'Phone','ct.fPhonePh':'+212 6 XX XX XX XX',
    'ct.fEmail':'Email','ct.fEmailPh':'email@example.com','ct.fSubject':'Subject','ct.fSubjectPh':'Booking, quote, question…',
    'ct.fMsg':'Message','ct.fMsgPh':'Describe your request (dates, desired vehicle, location…)',
    'ct.fSend':'Send request','ct.fNote':'Sent via WhatsApp — reply within 15 minutes, 24/7.',
    'ct.fOk':'Your request has been prepared and sent. Our team will get back to you very quickly — thank you!',
    'ct.fErr':'Please provide at least your name, one way to contact you and your message.',
    'ct.badge':'Contact us','ct.h1Html':'We are here<br><span>24/7</span>',
    'ct.lead':'A question, a special request, a long-term quote? Answer within 15 minutes on WhatsApp.',
    'ct.coords':'Our contact details',
    'ct.waTag':'WhatsApp (recommended)','ct.waText':'Answer within 15 minutes, 24/7. Ideal to book, request a quote or ask a question.','ct.waBtn':'Open WhatsApp',
    'ct.telTag':'Phone','ct.telText':'Call us directly for any emergency or assistance during your rental.','ct.telBtn':'Call now',
    'ct.mailTag':'Email','ct.mailText':'For detailed quotes, long-term rentals and partnerships.','ct.mailBtn':'Write an email',
    'ct.agTag':'Agency','ct.agTitle':'29 Rue Yougoslavie, Guéliz','ct.agText':'Marrakech 40000, Morocco. Open every day. Parking nearby.','ct.agBtn':'View on Google Maps',
    'ct.serv':'Services on request','ct.servIntro':'In addition to classic rental, contact us for:',
    'ct.s1Html':'<strong>Delivery to your hotel or riad</strong> in Marrakech — we bring the car directly to your accommodation.',
    'ct.s2Html':'<strong>Rental with driver</strong> — excursions, business transfers, weddings and events.',
    'ct.s3Html':'<strong>Private transfer</strong> — airport ↔ hotel, Marrakech ↔ Essaouira, Agadir, Casablanca…',
    'ct.s4Html':'<strong>Long-term rental</strong> — decreasing monthly rates for expats and professionals (<a href="lld.html">learn more</a>).',
  },

  /* ============ ESPAÑOL ============ */
  es: {
    'nav.home':'Inicio','nav.fleet':'Nuestros Vehículos','nav.about':'Quiénes somos','nav.contact':'Contacto','nav.book':'Reservar','nav.wa247':'WhatsApp 24/7',
    'hero.badge':'Agencia en Marrakech · Desde 2009',
    'hero.titleHtml':'Alquiler de Coches<br>en Marrakech <span>Sin Sorpresas</span>',
    'hero.sub':'Entrega gratuita en el aeropuerto de Menara (RAK), en el centro y en su hotel. Flota reciente, seguro incluido, kilometraje ilimitado y precios transparentes.',
    'hero.bookCta':'Reservar ahora','hero.f1':'Entrega gratuita en el aeropuerto','hero.f2':'Disponible 24h/7','hero.f3':'Servicio premium','hero.f4':'Asistencia personalizada',
    'bk.title':'Reserve su coche','bk.pickup':'Lugar de recogida','bk.return':'Lugar de devolución','bk.dep':'Salida','bk.ret':'Devolución',
    'bk.stepHint':'1. Elija sus fechas · 2. Encuentre su coche','bk.needDates':'Seleccione primero sus fechas de alquiler.','fleet.unavail':'No disponible en estas fechas','fleet.availFrom':'Disponible a partir del {d}','fleet.editDates':'Cambiar mis fechas','f.missing':'Complete los campos obligatorios: nombre completo, teléfono y número de permiso de conducir.','sp.ac':'Aire acondicionado','sp.cam':'Cámara trasera','sp.doors':'{n} puertas','sp.trunk':'Maletero: {v}','sp.insur':'Seguro incluido','sp.airport':'Entrega aeropuerto','sp.deposit':'Fianza: {v}','bk.depSub':'Fecha de salida','bk.retSub':'Fecha de devolución','bk.find':'Buscar un coche','bk.dur':'Duración: {n} {d}',
    'vp.h1':'Nuestra flota de alquiler en Marrakech','vp.lead':'Utilitarios, berlinas y SUV recientes — seguro incluido, kilometraje ilimitado y tarifas decrecientes.','vp.degressive':'Tarifas decrecientes según la duración del alquiler.','vp.ctaTitle':'¿Listo para reservar?','vp.ctaText':'La reserva se realiza en la página principal: elija sus fechas y luego su vehículo.','vp.ctaBtn':'Elegir mis fechas y reservar','vp.empty':'No hay vehículos en esta categoría por el momento.','u.seats':'plazas','u.day':'día','u.days':'días','u.perDay':'/día','u.perDayLong':'/ día',
    'loc.airport':'Aeropuerto de Marrakech (RAK)','loc.center':'Centro de Marrakech','loc.station':'Estación de Marrakech','loc.hotel':'Su Hotel',
    'cal.hintStart':'Seleccione su fecha de salida','cal.hintEnd':'Seleccione su fecha de devolución',
    'cal.months':['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    'cal.days':['Lu','Ma','Mi','Ju','Vi','Sá','Do'],
    'cal.aria':'Calendario de reserva','cal.prevM':'Mes anterior','cal.nextM':'Mes siguiente','cal.ariaStart':'Elegir la fecha de salida','cal.ariaEnd':'Elegir la fecha de devolución',
    'trust.t1':'Entrega Gratuita en el Aeropuerto','trust.t2':'Seguro Incluido','trust.t3':'Servicio 24h/7','trust.t4':'Sin Costes Ocultos','trust.t5':'Kilometraje Ilimitado',
    'fleet.badge':'Nuestra Flota','fleet.titleHtml':'Elija el Vehículo<br><span>Ideal para Marrakech</span>',
    'fleet.sub':'Todos nuestros vehículos son recientes, limpios y con mantenimiento regular.',
    'filt.all':'Todos','filt.city':'Urbanos','filt.eco':'Económicos','filt.suv':'SUV','filt.fam':'Familiares',
    'fleet.emptyHtml':'No hay vehículos disponibles en esta categoría por el momento.<br>Contáctenos por WhatsApp para conocer la disponibilidad.',
    'car.seats':'{n} plazas','car.unl':'Ilimitado','car.tierHint':'Precio según duración seleccionada','car.book':'Reservar ahora',
    'veh.Automatique':'Automático','veh.Manuelle':'Manual','veh.Diesel':'Diésel','veh.Essence':'Gasolina',
    'why.badge':'Por Qué Nosotros','why.titleHtml':'Por Qué Elegir<br><span>ALL STAR LOC?</span>',
    'why.t1':'Entrega en el Aeropuerto','why.d1':'Recogida y devolución gratuitas en el aeropuerto Menara RAK, sea cual sea la hora de llegada.',
    'why.t2':'Seguro Completo','why.d2':'Todos nuestros vehículos están cubiertos por un seguro a todo riesgo para su tranquilidad.',
    'why.t3':'Disponible 24h/7','why.d3':'Nuestro equipo está localizable a cualquier hora por teléfono o WhatsApp para asistirle.',
    'why.t4':'Pago Flexible','why.d4':'Pague en línea, con anticipo o en el lugar. Varias divisas aceptadas: MAD, EUR, USD, GBP.',
    'why.t5':'Entrega a Domicilio','why.d5':'Entregamos su coche directamente en su hotel, riad o dirección en Marrakech.',
    'why.t6':'17 Años de Experiencia','why.d6':'Más de 500 clientes satisfechos y una nota de 4.8/5 en Google confirman nuestra seriedad.',
    'rev.badge':'Opiniones de Clientes','rev.titleHtml':'Lo que Dicen<br><span>Nuestros Clientes</span>',
    'ft.tag':'Alquiler de Coches Marrakech',
    'ft.desc':'Su agencia de confianza desde 2009. Flota moderna, servicio premium, disponible 24h/7. Entrega gratuita en aeropuerto y hotel.',
    'ft.wa247':'WhatsApp 24h/7',
    'ft.colServices':'Nuestros Servicios','ft.s1':'Alquiler de Corta Duración','ft.s2':'Alquiler de Larga Duración','ft.s3':'Entrega en el Aeropuerto','ft.s4':'Entrega en el Hotel','ft.s5':'Alquiler con Conductor','ft.s6':'Traslado Privado',
    'ft.colQuick':'Enlaces Rápidos','ft.qAdmin':'Área Admin',
    'ft.colLegal':'Legal','ft.lCgv':'Condiciones Generales','ft.lPriv':'Política de Privacidad','ft.lLegal':'Aviso Legal',
    'ft.colCur':'Divisas',
    'ft.copy':'© 2025 All Star Loc — Alquiler de Coches en Marrakech. Todos los derechos reservados.',
    'ft.bCgv':'Condiciones','ft.bPriv':'Privacidad','ft.bLegal':'Aviso legal',
    'pf.blog':'Blog','pf.faq':'FAQ',
    'wa.tooltip':'¿Necesita ayuda?',
    'dr.step':'PASO {n} / 5','dr.done':'RESERVA CONFIRMADA',
    'dr.s1':'Protección','dr.s2':'Opciones','dr.s3':'Resumen','dr.s4':'Sus Datos','dr.s5':'Pago','dr.s6':'Confirmación',
    'dr.p1':'Protección','dr.p2':'Opciones','dr.p3':'Resumen','dr.p4':'Datos','dr.p5':'Pago','dr.p6':'Confirmación',
    'dr.total':'Total estimado','dr.next':'Continuar',
    'recap.edit':'Modificar','recap.timerHtml':'La sesión expira en <strong id="timer-display">05:00</strong>. Reserve ahora para garantizar esta tarifa.',
    'prot.title':'Seleccione su protección','prot.free':'Gratis',
    'prot.basic.name':'Protección Básica','prot.basic.desc':'Incluida en el alquiler. Franquicia estándar en caso de siniestro.',
    'prot.basic.f':['Seguro RC incluido','Franquicia 3000 MAD','Asistencia básica'],
    'prot.premium.name':'Protección Premium','prot.premium.desc':'Seguro a todo riesgo con franquicia reducida.',
    'prot.premium.f':['Todo riesgo','Franquicia 1000 MAD','Asistencia 24h','Robo cubierto'],
    'prot.full.name':'Protección Total','prot.full.desc':'Cobertura total, cero franquicia, tranquilidad absoluta.',
    'prot.full.f':['Cero franquicia','Robo + Rotura de lunas','Asistencia Premium','Conductor de sustitución'],
    'opt.title':'Añada sus opciones (opcional)','opt.add':'Añadir','opt.added':'Añadido',
    'opt.extra-driver':'Conductor Adicional','opt.baby-seat':'Silla de Bebé','opt.booster':'Elevador Infantil','opt.gps':'GPS Portátil','opt.wifi':'WiFi Portátil','opt.charger':'Cable Cargador','opt.fuel':'Opción Depósito Lleno','opt.fridge':'Nevera Portátil','opt.roadside':'Asistencia en Carretera+',
    'sum.rentTier':'Alquiler · {n} d · {p}/día','sum.tierApplied':'Tarifa aplicada: {b}','sum.degressive':'Tarifas decrecientes según la duración: el precio diario baja cuanto más largo es el alquiler.','sum.deposit':'Fianza (devuelta a la entrega)','sum.rent':'Alquiler del vehículo ({n}d × {p})','sum.total':'TOTAL','sum.fullDisc':'Descuento pago completo','sum.promo':'Código promocional',
    'f.first':'Nombre','f.last':'Apellido','f.email':'Email','f.phone':'Teléfono','f.wa':'WhatsApp','f.addr':'Dirección','f.country':'País / Nacionalidad','f.countryPh':'Seleccione su país','f.flight':'Número de vuelo (opcional)','f.notes':'Detalles adicionales (opcional)','f.docs':'Documentos','f.lic':'N° Permiso de conducir','f.pass':'N° Pasaporte / DNI','f.docsNote':'Documentos verificados en la entrega de llaves. Posible subirlos en la agencia.',
    'ph.first':'Introduzca su nombre','ph.last':'Introduzca sus apellidos','ph.email':'email@ejemplo.com','ph.phone':'6XXXXXXXX','ph.addr':'Su dirección completa','ph.flight':'AT234, RAM203...','ph.notes':'Hora de llegada, número de puerta, peticiones especiales...','ph.lic':'Ej: AB123456','ph.pass':'Ej: XX1234567','ph.promo':'Introduzca su código promocional',
    'c.ma':'Marruecos','c.fr':'Francia','c.es':'España','c.uk':'Reino Unido','c.us':'Estados Unidos','c.de':'Alemania','c.it':'Italia','c.be':'Bélgica','c.nl':'Países Bajos','c.other':'Otro',
    'pay.agency':'Pago en la agencia','pay.agencyDesc':'Pague en el lugar al recoger su vehículo en nuestra agencia de Guéliz.',
    'pay.delivery':'Pago a la entrega','pay.deliveryDesc':'Pague en la entrega de llaves (aeropuerto, hotel o dirección).',
    'pay.transfer':'Pago por transferencia bancaria','pay.transferDesc':'Le enviaremos nuestros datos bancarios tras validar la solicitud.',
    'pay.wa':'Pago por WhatsApp tras validación','pay.waDesc':'Nuestro equipo le envía un enlace o las instrucciones de pago por WhatsApp.',
    'pay.confirmBtn':'Confirmar la reserva','pay.awaiting':'Pendiente de pago',
    'cf.statusLabel':'Estado',
    'legal.close':'Cerrar','legal.read':'He leído y comprendido','legal.loading':'Cargando documento…',
    'pay.title':'Elija su método de pago',
    'pay.full':'Pago Completo','pay.fullPromo':'Mejor oferta — 5% de descuento aplicado','pay.fullDesc':'Pague la totalidad ahora y ahorre.',
    'pay.adv':'Pago por Adelantado (40%)','pay.advDesc':'Pague el 40% ahora, el resto en la entrega.',
    'pay.onsite':'Pago en la Agencia','pay.onsiteDesc':'Reserva gratuita, pago en el lugar en la entrega.',
    'pay.promoLabel':'Código Promocional (opcional)','pay.apply':'Aplicar','pay.applied':'Código aplicado — {n}% de descuento','pay.invalid':'Código promocional no válido',
    'pay.termsHtml':'He leído y acepto las <a href="pages/cgv.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'cgv\');">condiciones generales de alquiler</a> y la <a href="pages/privacy.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'privacy\');">política de privacidad</a> de ALL STAR LOC.',
    'pay.acceptAlert':'Por favor, acepte las condiciones generales.',
    'cf.title':'¡Reserva Confirmada!',
    'cf.sub':'¡Gracias {name}! Su solicitud de reserva se ha enviado correctamente. Nuestro equipo le contactará rápidamente para confirmar la disponibilidad y finalizar el pago.',
    'cf.refLabel':'Número de reserva','cf.recap':'Resumen','cf.total':'Total','cf.payFull':'Pago completo','cf.payAdv':'Anticipo 40%','cf.payOnsite':'Pago en el lugar','cf.waBtn':'Confirmar mi reserva por WhatsApp',
    'pg.back':'Volver al inicio',
    'cta.h3':'¿Listo para salir a la carretera?','cta.p':'Reserve su coche en 2 minutos, entrega gratuita en el aeropuerto de Marrakech.','cta.btn':'Ver nuestros vehículos',
    'pf.copy':'© 2026 ALL STAR LOC — Alquiler de coches en Marrakech desde 2009',
    'ab.badge':'Nuestra Historia','ab.h1Html':'ALL STAR LOC',
    'ab.lead':'Una agencia familiar de alquiler de coches, fundada en la confianza, la transparencia y el servicio.',
    'ab.who':'¿Quiénes somos?',
    'ab.p1Html':'<strong>ALL STAR LOC</strong> es una agencia de alquiler de coches con sede en Marrakech, en el 29 Rue Yougoslavie, en pleno corazón de Guéliz. Desde 2009, acompañamos a viajeros, familias y profesionales en sus desplazamientos por Marrakech y todo Marruecos.',
    'ab.p2':'Nuestra convicción es simple: alquilar un coche en vacaciones nunca debería ser una fuente de estrés. Sin costes ocultos, sin sorpresas desagradables en la devolución, sin esperas interminables en el mostrador. Solo un coche limpio, reciente y un equipo localizable a cualquier hora.',
    'ab.commit':'Nuestros compromisos',
    'ab.c1Html':'<strong>Entrega gratuita en el aeropuerto de Menara (RAK)</strong> — le esperamos a su llegada, sea cual sea la hora, con cartel en mano.',
    'ab.c2Html':'<strong>Disponibilidad 24h/7</strong> — un único número de WhatsApp para cualquier pregunta, antes, durante y después del alquiler.',
    'ab.c3Html':'<strong>Kilometraje ilimitado</strong> — explore Essaouira, el Atlas, Ouarzazate o Agadir sin contar kilómetros.',
    'ab.c4Html':'<strong>Flota reciente y mantenida</strong> — cada vehículo se revisa, limpia y desinfecta entre dos alquileres.',
    'ab.c5Html':'<strong>Transparencia total</strong> — el precio mostrado es el precio pagado. Seguro de responsabilidad civil siempre incluido.',
    'ab.nums':'Algunas cifras',
    'ab.numsHtml':'<strong>+500</strong> clientes satisfechos · <strong>4.8/5</strong> en Google · <strong>17 años</strong> de experiencia · <strong>11+</strong> vehículos en flota · Clientes de <strong>15+ nacionalidades</strong>',
    'ab.where':'Dónde encontrarnos','ab.callNote':'(llamada y WhatsApp)',
    'ct.fTitle':'Envíenos un mensaje','ct.fIntro':'Rellene este formulario: su solicitud nos llega de inmediato y respondemos en menos de 15 minutos.',
    'ct.fName':'Nombre completo','ct.fNamePh':'Su nombre y apellido','ct.fPhone':'Teléfono','ct.fPhonePh':'+212 6 XX XX XX XX',
    'ct.fEmail':'Email','ct.fEmailPh':'email@ejemplo.com','ct.fSubject':'Asunto','ct.fSubjectPh':'Reserva, presupuesto, pregunta…',
    'ct.fMsg':'Mensaje','ct.fMsgPh':'Describa su solicitud (fechas, vehículo deseado, lugar…)',
    'ct.fSend':'Enviar la solicitud','ct.fNote':'Envío por WhatsApp — respuesta en menos de 15 minutos, 24h/7.',
    'ct.fOk':'Su solicitud ha sido preparada y enviada. Nuestro equipo le responderá muy rápidamente — ¡gracias!',
    'ct.fErr':'Indique al menos su nombre, un medio de contacto y su mensaje.',
    'ct.badge':'Contáctenos','ct.h1Html':'Estamos aquí<br><span>24h/24, 7d/7</span>',
    'ct.lead':'¿Una pregunta, una petición especial, un presupuesto de larga duración? Respuesta en menos de 15 minutos por WhatsApp.',
    'ct.coords':'Nuestros datos de contacto',
    'ct.waTag':'WhatsApp (recomendado)','ct.waText':'Respuesta en menos de 15 minutos, 24h/7. Ideal para reservar, pedir un presupuesto o hacer una pregunta.','ct.waBtn':'Abrir WhatsApp',
    'ct.telTag':'Teléfono','ct.telText':'Llámenos directamente para cualquier urgencia o asistencia durante su alquiler.','ct.telBtn':'Llamar ahora',
    'ct.mailTag':'Email','ct.mailText':'Para solicitudes de presupuestos detallados, alquileres de larga duración y colaboraciones.','ct.mailBtn':'Escribir un email',
    'ct.agTag':'Agencia','ct.agTitle':'29 Rue Yougoslavie, Guéliz','ct.agText':'Marrakech 40000, Marruecos. Abierto todos los días. Aparcamiento cercano.','ct.agBtn':'Ver en Google Maps',
    'ct.serv':'Servicios bajo demanda','ct.servIntro':'Además del alquiler clásico, contáctenos para:',
    'ct.s1Html':'<strong>Entrega en su hotel o riad</strong> en Marrakech — llevamos el coche directamente a su alojamiento.',
    'ct.s2Html':'<strong>Alquiler con conductor</strong> — excursiones, traslados de negocios, bodas y eventos.',
    'ct.s3Html':'<strong>Traslado privado</strong> — aeropuerto ↔ hotel, Marrakech ↔ Essaouira, Agadir, Casablanca…',
    'ct.s4Html':'<strong>Alquiler de larga duración</strong> — tarifas decrecientes al mes para expatriados y profesionales (<a href="lld.html">saber más</a>).',
  },

  /* ============ العربية ============ */
  ar: {
    'nav.home':'الرئيسية','nav.fleet':'سياراتنا','nav.about':'من نحن','nav.contact':'اتصل بنا','nav.book':'احجز الآن','nav.wa247':'واتساب 24/7',
    'hero.badge':'وكالة في مراكش · منذ 2009',
    'hero.titleHtml':'كراء السيارات<br>في مراكش <span>بدون مفاجآت</span>',
    'hero.sub':'توصيل مجاني إلى مطار المنارة (RAK)، وسط المدينة وفندقكم. أسطول حديث، تأمين شامل، كيلومترات غير محدودة وأسعار شفافة.',
    'hero.bookCta':'احجز الآن','hero.f1':'توصيل مجاني إلى المطار','hero.f2':'متوفرون 24/7','hero.f3':'خدمة راقية','hero.f4':'مساعدة شخصية',
    'bk.title':'احجز سيارتك','bk.pickup':'مكان الاستلام','bk.return':'مكان الإرجاع','bk.dep':'الانطلاق','bk.ret':'الإرجاع',
    'bk.stepHint':'1. اختاروا تواريخكم · 2. جدوا سيارتكم','bk.needDates':'المرجو اختيار تواريخ الكراء أولاً.','fleet.unavail':'غير متوفرة في هذه التواريخ','fleet.availFrom':'متوفرة ابتداء من {d}','fleet.editDates':'تغيير التواريخ','f.missing':'المرجو ملء الحقول الإجبارية: الاسم الكامل، الهاتف ورقم رخصة السياقة.','sp.ac':'مكيف الهواء','sp.cam':'كاميرا خلفية','sp.doors':'{n} أبواب','sp.trunk':'الصندوق: {v}','sp.insur':'التأمين مشمول','sp.airport':'التوصيل للمطار','sp.deposit':'الضمان: {v}','bk.depSub':'تاريخ الانطلاق','bk.retSub':'تاريخ الإرجاع','bk.find':'ابحث عن سيارة','bk.dur':'المدة : {n} {d}',
    'vp.h1':'أسطولنا للكراء في مراكش','vp.lead':'سيارات مدينة وسيدان وسيارات SUV حديثة — التأمين مشمول، مسافة غير محدودة وأسعار تنازلية.','vp.degressive':'أسعار تنازلية حسب مدة الكراء.','vp.ctaTitle':'مستعد للحجز؟','vp.ctaText':'يتم الحجز من الصفحة الرئيسية: اختاروا تواريخكم ثم سيارتكم.','vp.ctaBtn':'اختيار تواريخي والحجز','vp.empty':'لا توجد سيارات في هذه الفئة حالياً.','u.seats':'مقاعد','u.day':'يوم','u.days':'أيام','u.perDay':'/يوم','u.perDayLong':'/ يوم',
    'loc.airport':'مطار مراكش (RAK)','loc.center':'وسط مدينة مراكش','loc.station':'محطة قطار مراكش','loc.hotel':'فندقكم',
    'cal.hintStart':'اختر تاريخ الانطلاق','cal.hintEnd':'اختر تاريخ الإرجاع',
    'cal.months':['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'],
    'cal.days':['إث','ثل','أر','خم','جم','سب','أح'],
    'cal.aria':'تقويم الحجز','cal.prevM':'الشهر السابق','cal.nextM':'الشهر الموالي','cal.ariaStart':'اختيار تاريخ الانطلاق','cal.ariaEnd':'اختيار تاريخ الإرجاع',
    'trust.t1':'توصيل مجاني إلى المطار','trust.t2':'تأمين شامل','trust.t3':'خدمة 24/7','trust.t4':'بدون رسوم خفية','trust.t5':'كيلومترات غير محدودة',
    'fleet.badge':'أسطولنا','fleet.titleHtml':'اختر السيارة<br><span>المثالية لمراكش</span>',
    'fleet.sub':'جميع سياراتنا حديثة ونظيفة وتخضع لصيانة منتظمة.',
    'filt.all':'الكل','filt.city':'مدينية','filt.eco':'اقتصادية','filt.suv':'دفع رباعي','filt.fam':'عائلية',
    'fleet.emptyHtml':'لا توجد سيارات متاحة في هذه الفئة حاليًا.<br>تواصلوا معنا عبر واتساب لمعرفة التوفر.',
    'car.seats':'{n} مقاعد','car.unl':'غير محدود','car.tierHint':'السعر حسب المدة المختارة','car.book':'احجز الآن',
    'veh.Automatique':'أوتوماتيكية','veh.Manuelle':'يدوية','veh.Diesel':'ديزل','veh.Essence':'بنزين',
    'why.badge':'لماذا نحن','why.titleHtml':'لماذا تختار<br><span>ALL STAR LOC ؟</span>',
    'why.t1':'توصيل إلى المطار','why.d1':'استلام وإرجاع مجاني في مطار المنارة RAK، مهما كان وقت وصولكم.',
    'why.t2':'تأمين شامل','why.d2':'جميع سياراتنا مغطاة بتأمين شامل من أجل راحة بالكم.',
    'why.t3':'متوفرون 24/7','why.d3':'فريقنا متاح في أي وقت عبر الهاتف أو واتساب لمساعدتكم.',
    'why.t4':'دفع مرن','why.d4':'ادفعوا عبر الإنترنت، بتسبيق أو في عين المكان. عدة عملات مقبولة: MAD، EUR، USD، GBP.',
    'why.t5':'توصيل إلى مقر إقامتكم','why.d5':'نوصل سيارتكم مباشرة إلى فندقكم أو رياضكم أو عنوانكم في مراكش.',
    'why.t6':'17 سنة من الخبرة','why.d6':'أكثر من 500 زبون راضٍ وتقييم 4.8/5 على غوغل يؤكدان جديتنا.',
    'rev.badge':'آراء الزبناء','rev.titleHtml':'ماذا يقول<br><span>زبناؤنا</span>',
    'ft.tag':'كراء السيارات مراكش',
    'ft.desc':'وكالتكم الموثوقة منذ 2009. أسطول حديث، خدمة راقية، متوفرون 24/7. توصيل مجاني إلى المطار والفندق.',
    'ft.wa247':'واتساب 24/7',
    'ft.colServices':'خدماتنا','ft.s1':'كراء قصير المدة','ft.s2':'كراء طويل المدة','ft.s3':'توصيل إلى المطار','ft.s4':'توصيل إلى الفندق','ft.s5':'كراء مع سائق','ft.s6':'نقل خاص',
    'ft.colQuick':'روابط سريعة','ft.qAdmin':'فضاء الإدارة',
    'ft.colLegal':'قانوني','ft.lCgv':'الشروط العامة','ft.lPriv':'سياسة الخصوصية','ft.lLegal':'إشعار قانوني',
    'ft.colCur':'العملات',
    'ft.copy':'© 2025 All Star Loc — كراء السيارات في مراكش. جميع الحقوق محفوظة.',
    'ft.bCgv':'الشروط','ft.bPriv':'الخصوصية','ft.bLegal':'إشعار قانوني',
    'pf.blog':'المدونة','pf.faq':'الأسئلة الشائعة',
    'wa.tooltip':'هل تحتاجون مساعدة؟',
    'dr.step':'الخطوة {n} / 5','dr.done':'تم تأكيد الحجز',
    'dr.s1':'الحماية','dr.s2':'الخيارات','dr.s3':'الملخص','dr.s4':'معلوماتكم','dr.s5':'الدفع','dr.s6':'التأكيد',
    'dr.p1':'الحماية','dr.p2':'الخيارات','dr.p3':'الملخص','dr.p4':'معلومات','dr.p5':'الدفع','dr.p6':'التأكيد',
    'dr.total':'المجموع التقديري','dr.next':'متابعة',
    'recap.edit':'تعديل','recap.timerHtml':'تنتهي الجلسة خلال <strong id="timer-display">05:00</strong>. احجزوا الآن لضمان هذا السعر.',
    'prot.title':'اختر نوع الحماية','prot.free':'مجاني',
    'prot.basic.name':'حماية أساسية','prot.basic.desc':'مشمولة في الكراء. تحمل قياسي في حالة حادث.',
    'prot.basic.f':['تأمين المسؤولية المدنية مشمول','تحمل 3000 درهم','مساعدة أساسية'],
    'prot.premium.name':'حماية بريميوم','prot.premium.desc':'تأمين شامل مع تحمل مخفض.',
    'prot.premium.f':['تأمين شامل','تحمل 1000 درهم','مساعدة 24 ساعة','تغطية السرقة'],
    'prot.full.name':'حماية كاملة','prot.full.desc':'تغطية كاملة، بدون تحمل، راحة بال مطلقة.',
    'prot.full.f':['بدون تحمل','السرقة + كسر الزجاج','مساعدة بريميوم','سائق بديل'],
    'opt.title':'أضيفوا خياراتكم (اختياري)','opt.add':'إضافة','opt.added':'تمت الإضافة',
    'opt.extra-driver':'سائق إضافي','opt.baby-seat':'مقعد رضيع','opt.booster':'مقعد رافع للأطفال','opt.gps':'GPS محمول','opt.wifi':'واي فاي محمول','opt.charger':'كابل شاحن','opt.fuel':'خيار خزان ممتلئ','opt.fridge':'ثلاجة محمولة','opt.roadside':'مساعدة على الطريق+',
    'sum.rentTier':'الكراء · {n} ي · {p}/يوم','sum.tierApplied':'التعريفة المطبقة: {b}','sum.degressive':'أسعار تنازلية حسب المدة: ينخفض السعر اليومي كلما طالت مدة الكراء.','sum.deposit':'الضمان (يُسترجع عند الإرجاع)','sum.rent':'كراء السيارة ({n} أيام × {p})','sum.total':'المجموع','sum.fullDisc':'خصم الدفع الكامل','sum.promo':'رمز ترويجي',
    'f.first':'الاسم الشخصي','f.last':'الاسم العائلي','f.email':'البريد الإلكتروني','f.phone':'الهاتف','f.wa':'واتساب','f.addr':'العنوان','f.country':'البلد / الجنسية','f.countryPh':'اختر بلدك','f.flight':'رقم الرحلة (اختياري)','f.notes':'تفاصيل إضافية (اختياري)','f.docs':'الوثائق','f.lic':'رقم رخصة السياقة','f.pass':'رقم جواز السفر / البطاقة الوطنية','f.docsNote':'يتم التحقق من الوثائق عند تسليم المفاتيح. يمكن رفعها في الوكالة.',
    'ph.first':'أدخلوا اسمكم الشخصي','ph.last':'أدخلوا اسمكم العائلي','ph.email':'email@example.com','ph.phone':'6XXXXXXXX','ph.addr':'عنوانكم الكامل','ph.flight':'AT234, RAM203...','ph.notes':'وقت الوصول، رقم البوابة، طلبات خاصة...','ph.lic':'مثال: AB123456','ph.pass':'مثال: XX1234567','ph.promo':'أدخلوا الرمز الترويجي',
    'c.ma':'المغرب','c.fr':'فرنسا','c.es':'إسبانيا','c.uk':'المملكة المتحدة','c.us':'الولايات المتحدة','c.de':'ألمانيا','c.it':'إيطاليا','c.be':'بلجيكا','c.nl':'هولندا','c.other':'آخر',
    'pay.agency':'الدفع في الوكالة','pay.agencyDesc':'ادفعوا في عين المكان عند استلام سيارتكم في وكالتنا بحي گيليز.',
    'pay.delivery':'الدفع عند التسليم','pay.deliveryDesc':'ادفعوا عند تسليم المفاتيح (المطار، الفندق أو عنوانكم).',
    'pay.transfer':'الدفع عبر تحويل بنكي','pay.transferDesc':'سنرسل لكم المعلومات البنكية بعد التحقق من الطلب.',
    'pay.wa':'الدفع عبر واتساب بعد التأكيد','pay.waDesc':'يرسل لكم فريقنا رابط الدفع أو التعليمات عبر واتساب.',
    'pay.confirmBtn':'تأكيد الحجز','pay.awaiting':'في انتظار الدفع',
    'cf.statusLabel':'الحالة',
    'legal.close':'إغلاق','legal.read':'قرأت وفهمت','legal.loading':'جارٍ تحميل الوثيقة…',
    'pay.title':'اختر طريقة الدفع',
    'pay.full':'الدفع الكامل','pay.fullPromo':'أفضل عرض — خصم 5% مطبق','pay.fullDesc':'ادفعوا المبلغ كاملاً الآن ووفروا.',
    'pay.adv':'الدفع بتسبيق (40%)','pay.advDesc':'ادفعوا 40% الآن، والباقي عند التسليم.',
    'pay.onsite':'الدفع في الوكالة','pay.onsiteDesc':'حجز مجاني، الدفع في عين المكان عند التسليم.',
    'pay.promoLabel':'رمز ترويجي (اختياري)','pay.apply':'تطبيق','pay.applied':'تم تطبيق الرمز — خصم {n}%','pay.invalid':'رمز ترويجي غير صالح',
    'pay.termsHtml':'قرأت وأوافق على <a href="pages/cgv.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'cgv\');">الشروط العامة للكراء</a> و<a href="pages/privacy.html" target="_blank" rel="noopener" onclick="event.stopPropagation(); return openLegalModal(\'privacy\');">سياسة الخصوصية</a> الخاصة بـ ALL STAR LOC.',
    'pay.acceptAlert':'المرجو الموافقة على الشروط العامة.',
    'cf.title':'تم تأكيد الحجز !',
    'cf.sub':'شكراً {name} ! تم إرسال طلب حجزكم بنجاح. سيتواصل معكم فريقنا قريباً لتأكيد التوفر وإتمام الدفع.',
    'cf.refLabel':'رقم الحجز','cf.recap':'الملخص','cf.total':'المجموع','cf.payFull':'دفع كامل','cf.payAdv':'تسبيق 40%','cf.payOnsite':'الدفع في عين المكان','cf.waBtn':'تأكيد حجزي عبر واتساب',
    'pg.back':'العودة إلى الرئيسية',
    'cta.h3':'مستعدون للانطلاق ؟','cta.p':'احجزوا سيارتكم في دقيقتين، توصيل مجاني إلى مطار مراكش.','cta.btn':'شاهدوا سياراتنا',
    'pf.copy':'© 2026 ALL STAR LOC — كراء السيارات في مراكش منذ 2009',
    'ab.badge':'قصتنا','ab.h1Html':'ALL STAR LOC',
    'ab.lead':'وكالة عائلية لكراء السيارات، مبنية على الثقة والشفافية والخدمة.',
    'ab.who':'من نحن ؟',
    'ab.p1Html':'<strong>ALL STAR LOC</strong> وكالة لكراء السيارات مقرها مراكش، في 29 شارع يوغوسلافيا، في قلب حي گيليز. منذ 2009، نرافق المسافرين والعائلات والمهنيين في تنقلاتهم بمراكش وفي جميع أنحاء المغرب.',
    'ab.p2':'قناعتنا بسيطة: كراء سيارة خلال العطلة لا ينبغي أبداً أن يكون مصدر توتر. لا رسوم خفية، لا مفاجآت سيئة عند الإرجاع، لا انتظار طويل أمام المكتب. فقط سيارة نظيفة وحديثة وفريق متاح في أي وقت.',
    'ab.commit':'التزاماتنا',
    'ab.c1Html':'<strong>توصيل مجاني إلى مطار المنارة (RAK)</strong> — ننتظركم عند وصولكم، مهما كان الوقت، ولافتة في اليد.',
    'ab.c2Html':'<strong>متوفرون 24/7</strong> — رقم واتساب واحد لأي سؤال، قبل وأثناء وبعد الكراء.',
    'ab.c3Html':'<strong>كيلومترات غير محدودة</strong> — استكشفوا الصويرة والأطلس وورزازات وأكادير دون حساب.',
    'ab.c4Html':'<strong>أسطول حديث ومصان</strong> — كل سيارة تُفحص وتُنظف وتُعقم بين كرائين.',
    'ab.c5Html':'<strong>شفافية تامة</strong> — السعر المعروض هو السعر المدفوع. تأمين المسؤولية المدنية مشمول دائماً.',
    'ab.nums':'بعض الأرقام',
    'ab.numsHtml':'<strong>+500</strong> زبون راضٍ · <strong>4.8/5</strong> على غوغل · <strong>17 سنة</strong> من الخبرة · <strong>+11</strong> سيارة في الأسطول · زبناء من <strong>+15 جنسية</strong>',
    'ab.where':'أين تجدوننا','ab.callNote':'(اتصال وواتساب)',
    'ct.fTitle':'أرسلوا لنا رسالة','ct.fIntro':'املؤوا هذا النموذج: يصلنا طلبكم فوراً ونرد عليكم في أقل من 15 دقيقة.',
    'ct.fName':'الاسم الكامل','ct.fNamePh':'اسمكم الشخصي والعائلي','ct.fPhone':'الهاتف','ct.fPhonePh':'+212 6 XX XX XX XX',
    'ct.fEmail':'البريد الإلكتروني','ct.fEmailPh':'email@example.com','ct.fSubject':'الموضوع','ct.fSubjectPh':'حجز، عرض سعر، سؤال…',
    'ct.fMsg':'الرسالة','ct.fMsgPh':'صفوا طلبكم (التواريخ، السيارة المطلوبة، المكان…)',
    'ct.fSend':'إرسال الطلب','ct.fNote':'الإرسال عبر واتساب — رد في أقل من 15 دقيقة، على مدار الساعة.',
    'ct.fOk':'تم تجهيز طلبكم وإرساله. سيرد عليكم فريقنا بسرعة — شكراً لكم!',
    'ct.fErr':'المرجو إدخال الاسم ووسيلة تواصل واحدة على الأقل ورسالتكم.',
    'ct.badge':'اتصلوا بنا','ct.h1Html':'نحن هنا<br><span>24/7</span>',
    'ct.lead':'سؤال، طلب خاص، عرض سعر طويل المدة ؟ جواب في أقل من 15 دقيقة عبر واتساب.',
    'ct.coords':'بيانات الاتصال',
    'ct.waTag':'واتساب (موصى به)','ct.waText':'جواب في أقل من 15 دقيقة، 24/7. مثالي للحجز أو طلب عرض سعر أو طرح سؤال.','ct.waBtn':'فتح واتساب',
    'ct.telTag':'الهاتف','ct.telText':'اتصلوا بنا مباشرة لأي حالة طارئة أو مساعدة خلال فترة الكراء.','ct.telBtn':'اتصلوا الآن',
    'ct.mailTag':'البريد الإلكتروني','ct.mailText':'لطلبات عروض الأسعار المفصلة والكراء طويل المدة والشراكات.','ct.mailBtn':'إرسال بريد إلكتروني',
    'ct.agTag':'الوكالة','ct.agTitle':'29 شارع يوغوسلافيا، گيليز','ct.agText':'مراكش 40000، المغرب. مفتوح كل الأيام. موقف سيارات قريب.','ct.agBtn':'عرض على خرائط غوغل',
    'ct.serv':'خدمات عند الطلب','ct.servIntro':'بالإضافة إلى الكراء الكلاسيكي، اتصلوا بنا من أجل:',
    'ct.s1Html':'<strong>التوصيل إلى فندقكم أو رياضكم</strong> في مراكش — نحضر السيارة مباشرة إلى مقر إقامتكم.',
    'ct.s2Html':'<strong>كراء مع سائق</strong> — رحلات، تنقلات مهنية، أعراس ومناسبات.',
    'ct.s3Html':'<strong>نقل خاص</strong> — المطار ↔ الفندق، مراكش ↔ الصويرة، أكادير، الدار البيضاء…',
    'ct.s4Html':'<strong>كراء طويل المدة</strong> — أسعار تنازلية شهرية للمقيمين والمهنيين (<a href="lld.html">المزيد</a>).',
  }
  };

  var LANG_LOCALES = { fr:'fr-FR', en:'en-GB', es:'es-ES', ar:'ar-MA' };
  var lang = 'fr';
  try { var saved = localStorage.getItem('asl_lang'); if (saved && I18N[saved]) lang = saved; } catch (e) {}

  function t(key, vars) {
    var s = I18N[lang] ? I18N[lang][key] : undefined;
    if (s === undefined) s = I18N.fr[key];
    if (s === undefined) return key;
    if (vars && typeof s === 'string') {
      for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    }
    return s;
  }
  /* Traduction best-effort des valeurs véhicule venant de l'admin (transmission, carburant).
     Si la valeur n'est pas connue du dictionnaire, elle est affichée telle quelle. */
  function tveh(v) {
    var s = I18N[lang] ? I18N[lang]['veh.' + v] : undefined;
    return s !== undefined ? s : v;
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('.lang-label').forEach(function (el) { el.textContent = lang.toUpperCase(); });
    document.querySelectorAll('[data-setlang]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-setlang') === lang); });
    if (typeof window.onLangApplied === 'function') { try { window.onLangApplied(); } catch (e) {} }
  }

  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    try { localStorage.setItem('asl_lang', l); } catch (e) {}
    closeHdrMenus();
    applyI18n();
  }

  function getLang() { return lang; }
  function langLocale() { return LANG_LOCALES[lang] || 'fr-FR'; }

  /* ---------------- Menus du header (langue / devise) ---------------- */
  function toggleHdrMenu(id) {
    var m = document.getElementById(id);
    if (!m) return;
    document.querySelectorAll('.hdr-menu.open').forEach(function (x) { if (x !== m) x.classList.remove('open'); });
    m.classList.toggle('open');
  }
  function closeHdrMenus() {
    document.querySelectorAll('.hdr-menu.open').forEach(function (x) { x.classList.remove('open'); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.hdr-select')) closeHdrMenus();
  });

  /* ---------------- Devises (base de calcul : MAD) ---------------- */
  /* Taux fixes alignés sur l'admin : 1 EUR = 10.8 MAD (ASLDB.RATE_MAD). */
  var CUR_RATES = { MAD: 1, EUR: 1 / 10.8, USD: 1.08 / 10.8, GBP: 0.86 / 10.8 };
  var CUR_SYMBOLS = { MAD: 'MAD', EUR: '€', USD: '$', GBP: '£' };
  var currency = 'MAD';
  try { var sc = localStorage.getItem('asl_currency'); if (sc && CUR_RATES[sc]) currency = sc; } catch (e) {}

  function getCurrency() { return currency; }
  function saveCurrency(c) {
    if (!CUR_RATES[c]) return;
    currency = c;
    try { localStorage.setItem('asl_currency', c); } catch (e) {}
  }
  /* Convertit un montant MAD vers la devise active et le formate. */
  function formatPrice(mad) {
    var v = Math.round(mad * CUR_RATES[currency]);
    return v + ' ' + CUR_SYMBOLS[currency];
  }
  function updateCurrencyUI() {
    document.querySelectorAll('.cur-label').forEach(function (el) { el.textContent = currency; });
    document.querySelectorAll('[data-setcur]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-setcur') === currency); });
  }

  /* ---------------- Exposition globale ---------------- */
  window.I18N = I18N;   /* exposé pour content-bridge.js (overrides SEO/marketing) */
  window.t = t;
  window.tveh = tveh;
  window.setLang = setLang;
  window.getLang = getLang;
  window.langLocale = langLocale;
  window.applyI18n = applyI18n;
  window.toggleHdrMenu = toggleHdrMenu;
  window.ASL_CUR = {
    RATES: CUR_RATES,
    SYMBOLS: CUR_SYMBOLS,
    get: getCurrency,
    save: saveCurrency,
    format: formatPrice,
    updateUI: updateCurrencyUI
  };


  // Fonctions header pour les pages internes (définies seulement si absentes).
  // index.html définit ses propres versions plus complètes qui prennent le dessus.
  if (typeof window.setCurrency !== 'function') {
    window.setCurrency = function(c) {
      try { if (window.ASL_CUR) { window.ASL_CUR.save(c); window.ASL_CUR.updateUI(); } } catch(e){}
      var menu = document.getElementById('cur-menu');
      if (menu) menu.classList.remove('open');
    };
  }
  if (typeof window.toggleMobileMenu !== 'function') {
    window.toggleMobileMenu = function() {
      var m = document.getElementById('mobile-menu');
      if (m) m.classList.toggle('open');
    };
  }

  /* Fermeture du menu mobile : au scroll, et au clic sur un lien/langue/devise */
  window.addEventListener('scroll', function () {
    var m = document.getElementById('mobile-menu');
    if (m && m.classList.contains('open')) m.classList.remove('open');
  }, { passive: true });

  document.addEventListener('DOMContentLoaded', function () {
    applyI18n();
    updateCurrencyUI();
    var mm = document.getElementById('mobile-menu');
    if (mm) {
      mm.querySelectorAll('a, [data-setlang], [data-setcur]').forEach(function (el) {
        el.addEventListener('click', function () { setTimeout(function(){ mm.classList.remove('open'); }, 50); });
      });
    }
  });
})();
