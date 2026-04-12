import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const staff = [
  { name: 'Claudia Luchini', role: 'supervisor', dni: '27239211', legajo: '528' },
  { name: 'Ricardo Herrmann', role: 'ceo', dni: '11111111', legajo: '553' },
  { name: 'Alaluf Damian', role: 'jefe-seguridad', dni: '22222222', legajo: '541' },
  { name: 'TERÁN RICARDO MANUEL', role: 'guard', dni: '29738561', legajo: '379' },
  { name: 'ZORZOLI JUAN CARLOS', role: 'guard', dni: '30465648', legajo: '524' },
  { name: 'VILLALBA CARLOS SEBASTIÁN', role: 'guard', dni: '345971175', legajo: '544' },
  { name: 'GÓMEZ LEONARDO MARIO', role: 'guard', dni: '26788444', legajo: '557' },
  { name: 'BARROS NELSON RAMÓN', role: 'guard', dni: '26227925', legajo: '679' },
  { name: 'GÓMEZ FERNANDO MARIANO', role: 'guard', dni: '35161793', legajo: '756' }
];

async function run() {
  console.log("Sincronizando perfiles a Firebase...");
  for (const p of staff) {
    const isExec = ['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(p.role);
    const email = p.legajo === '528' ? 'claudia.luchini@seguridad.local' : `${p.legajo}@seguridad.local`;
    
    const uid = `local-${p.legajo}`; 
    const payload = {
        uid: uid,
        name: p.name,
        email: email,
        role: p.role,
        dni: p.dni,
        legajo: p.legajo,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}`,
        active: true,
        completedRounds: 0,
        pendingAlerts: 0,
        status: 'active',
    };
    
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
    console.log(`Perfil subido: ${p.name} - Legajo: ${p.legajo}`);
  }
  console.log("¡Todo listo! Los rondines y ejecutivos ya están en la base de datos de producción.");
  process.exit(0);
}

run();
