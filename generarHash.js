// generarHash.js
const bcrypt = require('bcrypt');

async function generar() {
    const passwordPlana = 'admin123'; // La contraseña que quieres hashear
    const saltRounds = 10; // El mismo número de rondas que usas en tu loginController

    try {
        const hash = await bcrypt.hash(passwordPlana, saltRounds);
        console.log(`La contraseña plana es: ${passwordPlana}`);
        console.log(`El hash bcrypt es: ${hash}`);
        console.log("Copia el hash bcrypt de arriba para usarlo en tu sentencia INSERT de SQL Developer.");
    } catch (err) {
        console.error("Error al generar el hash:", err);
    }
}

generar();