    import { initializeApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    import { getFirestore } from "firebase/firestore";

    // SettleLoans Firebase config
    const firebaseConfig = {
        apiKey: "AIzaSyAPkOc01TOXaJMrDPztwta8dZoyij5GkS8",

        authDomain: "settle-loan.firebaseapp.com",
      
        databaseURL: "https://settle-loan-default-rtdb.firebaseio.com",
      
        projectId: "settle-loan",
      
        storageBucket: "settle-loan.firebasestorage.app",
      
        messagingSenderId: "203471922593",
      
        appId: "1:203471922593:web:0453f2777a5218951457e0",
      
        measurementId: "G-RJHYN1MW8T"
      
    };

    // Initialize with a unique name
    const app = initializeApp(firebaseConfig, "settleloans-app");

    // Get Firestore instance
    export const db = getFirestore(app);

    // Get Auth instance 
    export const auth = getAuth(app);

    export default app;