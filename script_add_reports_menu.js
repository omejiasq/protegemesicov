// Script para agregar la nueva opción de menú Reportes PESV al catálogo global
// Ejecutar desde la consola de MongoDB o como script Node.js

// Conectar a la base de datos y ejecutar:

db.global_menu_catalog.insertOne({
  key: "web_pesv_reports",
  label: "Constructor de Reportes",
  platform: "web",
  category: "PESV",
  route: "/pesv/reports",
  icon: "pi pi-chart-bar",
  order: 50, // Colocar después de los otros módulos PESV
  enabled: true,
  created_at: new Date(),
  updated_at: new Date()
});

// Verificar que se insertó correctamente
db.global_menu_catalog.findOne({ key: "web_pesv_reports" });